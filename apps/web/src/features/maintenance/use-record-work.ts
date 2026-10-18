import {
  createRecordRequest,
  type AssetCondition,
  type AssetConservation,
  type WorkKind,
  type WorkResult,
} from '@platlab/contracts';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError } from '../../app/api';
import { validate } from '../../app/form-sheet';
import { readLabelLink } from '../../app/label-link';
import type { ScanReading } from '../../app/scan/scanner-view';
import { maintenanceErrorMessage, useAttachCertificate, useChangeAssetCondition, useCreateRecord } from './commands';
import { useAssetMaintenance, usePlans } from './queries';
import { recordOutcome, saveStep } from './record-steps';

/** El formulario de la hoja; los vacíos son `''` y se traducen al contrato al enviar. */
export interface RecordForm {
  assetId: string;
  /** `''` es sin plan: entonces manda `kind`. */
  planId: string;
  /** La versión del plan que se vio al elegirlo: si cambió antes de guardar, VERSION_CONFLICT. */
  planVersion: number | null;
  kind: WorkKind | '';
  performedOn: string;
  /** `''` es un trabajo interno. */
  providerId: string;
  result: WorkResult | '';
  observations: string;
  /** Una marca por ítem de la lista del plan, en su orden. */
  checklist: boolean[];
  /** Cadena decimal, como la escribe la persona; nunca `number`. */
  cost: string;
  validUntil: string;
  /** `''` deja el estado físico como está. */
  conservation: AssetConservation | '';
}

/** Lo que va a la API: `''` es null y, sin plan, sin versión ni lista. */
function toRequest(values: RecordForm) {
  const blank = (value: string) => (value.trim() === '' ? null : value.trim());
  const planId = blank(values.planId);
  return {
    assetId: values.assetId,
    planId,
    ...(planId ? { planVersion: values.planVersion ?? undefined } : { kind: values.kind || undefined }),
    performedOn: values.performedOn,
    providerId: blank(values.providerId),
    result: values.result || undefined,
    observations: blank(values.observations),
    checklist: planId ? values.checklist : [],
    cost: blank(values.cost),
    validUntil: blank(values.validUntil),
    conservation: values.conservation || null,
  };
}

/**
 * El QR de una etiqueta de equipo de este espacio, leído dentro de la hoja: da el equipo sin navegar. Una
 * etiqueta de frasco o de otro espacio dice por qué no sirve y la cámara sigue.
 */
export function readAssetScan(workspaceId: string) {
  return (text: string): ScanReading<string> => {
    const link = readLabelLink(text);
    if (!link) return { notice: 'Ese código no es una etiqueta de PlatLab.' };
    if (link.kind !== 'equipo') return { notice: 'Es la etiqueta de un frasco: escanea la de un equipo.' };
    if (link.workspaceId !== workspaceId) return { notice: 'Ese equipo es de otro espacio de trabajo.' };
    return { value: link.id, found: 'Equipo leído' };
  };
}

/**
 * Lógica de «Registrar mantenimiento» (ADR 0020), sin estilos: el formulario con la versión del plan, la
 * revisión de la lista si el plan cambió mientras se llenaba, el guardado en dos pasos (registro y
 * certificado, con reintento solo del adjunto), el mensaje final y, con «No conforme», el cambio de estado
 * del equipo, que confirma quien registra y aplica Equipos.
 */
export function useRecordWork({
  workspaceId,
  today,
  assetId: initialAssetId = '',
  planId: initialPlanId = '',
  canChangeCondition,
}: {
  workspaceId: string;
  /** Hoy en la zona del espacio: la fecha del trabajo por omisión. */
  today: string;
  assetId?: string;
  planId?: string;
  /** `equipment.condition.change` con Equipos admitiendo cambios. */
  canChangeCondition: boolean;
}) {
  const form = useForm<RecordForm>({
    defaultValues: {
      assetId: initialAssetId,
      planId: '',
      planVersion: null,
      kind: '',
      performedOn: today,
      providerId: '',
      result: '',
      observations: '',
      checklist: [],
      cost: '',
      validUntil: '',
      conservation: '',
    },
  });
  const assetId = form.watch('assetId');
  const planId = form.watch('planId');
  const assetMaintenance = useAssetMaintenance(workspaceId, assetId || null);
  const plans = usePlans(workspaceId);
  const create = useCreateRecord(workspaceId);
  const attach = useAttachCertificate(workspaceId);
  const changeCondition = useChangeAssetCondition(workspaceId, assetId);
  const [state, dispatch] = useReducer(saveStep, { step: 'idle' });
  const [file, setFile] = useState<File | null>(null);
  const [reviewChecklist, setReviewChecklist] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  // La fecha del plan antes de guardar, para saber si el registro la movió.
  const [dueBefore, setDueBefore] = useState<string | null>(null);

  /** Los planes que cubren al equipo, con su fecha; el detalle (lista, criterio, versión) sale de `usePlans`. */
  const assetPlans = assetMaintenance.data?.plans ?? [];
  const planDetail = (id: string) => plans.data?.items.find((entry) => entry.id === id);
  const plan = planId ? planDetail(planId) : undefined;

  /** Fija el plan (o ninguno, con `''`) con su versión y una casilla sin marcar por ítem de su lista. */
  const applyPlan = (id: string, dirty: boolean) => {
    const detail = id ? planDetail(id) : undefined;
    form.setValue('planId', id, { shouldDirty: dirty });
    form.setValue('planVersion', detail?.version ?? null);
    form.setValue('checklist', (detail?.checklist ?? []).map(() => false), { shouldDirty: dirty });
    form.setValue('kind', detail?.kind ?? '');
  };
  const selectPlan = (id: string) => {
    applyPlan(id, true);
    setReviewChecklist(false);
  };

  // El plan pedido al abrir (desde «Por hacer») se elige una vez, cuando llegan los planes; no cuenta como cambio.
  const initialApplied = useRef(initialPlanId === '');
  useEffect(() => {
    if (initialApplied.current || !plans.data) return;
    initialApplied.current = true;
    if (plans.data.items.some((entry) => entry.id === initialPlanId)) applyPlan(initialPlanId, false);
    // `applyPlan` solo escribe en el formulario; basta con reaccionar a la llegada de los planes.
  }, [plans.data]);

  /**
   * El plan cambió mientras se llenaba: se recarga, se toma su versión y su lista nueva sin marcas y se pide
   * revisarla. Fecha, resultado, observaciones, costo y proveedor se conservan.
   */
  const reloadPlan = async () => {
    const fresh = (await plans.refetch()).data?.items.find((entry) => entry.id === form.getValues('planId'));
    form.setValue('planVersion', fresh?.version ?? null);
    form.setValue('checklist', (fresh?.checklist ?? []).map(() => false));
    setReviewChecklist(true);
  };

  const sendCertificate = (recordId: string, pdf: File) => {
    attach.mutate(
      { recordId, file: pdf },
      {
        onSuccess: () => dispatch({ type: 'attached' }),
        onError: (error) => dispatch({ type: 'attachFailed', error }),
      },
    );
  };

  const submit = () => {
    if (state.step !== 'idle') return;
    setGeneralError(null);
    const values = form.getValues();
    const input = validate(createRecordRequest, toRequest(values), form);
    if (!input) return;
    setDueBefore(assetPlans.find((entry) => entry.plan.id === values.planId)?.dueOn ?? null);
    dispatch({ type: 'submit' });
    create.mutate(input, {
      onSuccess: (record) => {
        setReviewChecklist(false);
        dispatch({ type: 'recorded', record, withCertificate: file !== null });
        if (file) sendCertificate(record.id, file);
      },
      onError: (error) => {
        dispatch({ type: 'recordFailed' });
        if (isApiError(error, 'VERSION_CONFLICT')) void reloadPlan();
        setGeneralError(maintenanceErrorMessage(error));
      },
    });
  };

  const retryAttach = () => {
    if (state.step !== 'attachFailed' || !file) return;
    dispatch({ type: 'retryAttach' });
    sendCertificate(state.record.id, file);
  };

  const saved = state.step === 'done' || state.step === 'attachFailed' ? state.record : null;

  /**
   * Con «No conforme», la propuesta de «Cambiar estado»: Fuera de servicio o Uso limitado, con el motivo ya
   * lleno; nada cambia hasta que quien registra lo confirma.
   */
  const conditionOffer =
    saved?.result === 'fail' && canChangeCondition && assetMaintenance.data?.asset.condition !== 'retired'
      ? {
          options: ['faulted', 'restricted'] as const satisfies readonly AssetCondition[],
          reason: `No conforme en ${saved.plan?.title ?? 'mantenimiento'}${saved.observations ? `: ${saved.observations}` : ''}`.slice(0, 500),
        }
      : null;

  return {
    form,
    /** Hay algo por perder al cerrar. */
    dirty: form.formState.isDirty || file !== null,
    asset: assetMaintenance,
    assetPlans,
    plan,
    plans,
    selectPlan,
    reviewChecklist,
    file,
    setFile,
    state,
    pending: state.step === 'saving' || state.step === 'attaching',
    generalError,
    submit,
    retryAttach,
    attachError: state.step === 'attachFailed' ? maintenanceErrorMessage(state.error) : null,
    outcome: saved ? recordOutcome(saved, dueBefore) : null,
    conditionOffer,
    changeCondition: {
      pending: changeCondition.isPending,
      done: changeCondition.isSuccess,
      error: changeCondition.isError ? maintenanceErrorMessage(changeCondition.error) : null,
      confirm: (condition: 'faulted' | 'restricted', reason: string) => changeCondition.mutate({ condition, reason }),
    },
  };
}

export type RecordWork = ReturnType<typeof useRecordWork>;
