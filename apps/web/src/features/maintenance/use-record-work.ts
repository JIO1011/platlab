import {
  createRecordRequest,
  type AssetCondition,
  type AssetConservation,
  type MaintenanceRecord,
  type RecordCreated,
  type WorkKind,
  type WorkResult,
} from '@platlab/contracts';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError } from '../../app/api';
import { validate } from '../../app/form-sheet';
import { maintenanceErrorMessage, useAttachCertificate, useChangeAssetCondition, useCorrectRecord, useCreateRecord } from './commands';
import { useAssetMaintenance, usePlans } from './queries';
import { recordOutcome, saveStep, type RepairDone } from './record-steps';

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
  /** El incidente abierto que atiende un correctivo; `''` ninguno. */
  faultId: string;
  /** Solucionar ese incidente con «qué se hizo»; solo con Conforme o Con observaciones. */
  resolveFault: boolean;
  /** Y devolver el equipo a operativo, si no lo está. */
  returnToOperational: boolean;
  /** Al corregir, por qué. */
  reason: string;
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
    faultId: blank(values.faultId),
    resolveFault:
      values.faultId && values.resolveFault && values.result !== 'fail' ? { returnToOperational: values.returnToOperational } : null,
  };
}

/** Al corregir, la hoja empieza con los datos del registro (M-01b); el plan, su versión y su lista llegan con los planes. */
function formFrom(record: MaintenanceRecord): Partial<RecordForm> {
  return {
    assetId: record.asset.id,
    kind: record.kind,
    performedOn: record.performedOn,
    providerId: record.provider?.id ?? '',
    result: record.result,
    observations: record.observations ?? '',
    cost: record.cost ?? '',
    validUntil: record.validUntil ?? '',
    faultId: record.faultId ?? '',
  };
}

/**
 * Lógica de «Registrar mantenimiento» (ADR 0020), sin estilos: el formulario con la versión del plan, la
 * revisión de la lista si el plan cambió mientras se llenaba, el guardado en dos pasos (registro y
 * certificado, con reintento solo del adjunto), el mensaje final y, con «No conforme», el cambio de estado
 * del equipo, que confirma quien registra y aplica Equipos. Un correctivo puede atender un incidente abierto
 * y solucionarlo (M-01b). Con `correcting`, la hoja corrige ese registro: empieza con sus datos, pide el
 * motivo y, al guardar, el servidor lo anula y registra el nuevo; su certificado pasa al nuevo salvo que se
 * adjunte otro.
 */
export function useRecordWork({
  workspaceId,
  today,
  assetId: initialAssetId = '',
  planId: initialPlanId = '',
  faultId: initialFaultId = '',
  correcting,
  canChangeCondition,
}: {
  workspaceId: string;
  /** Hoy en la zona del espacio: la fecha del trabajo por omisión. */
  today: string;
  assetId?: string;
  planId?: string;
  /** El incidente que atiende (desde la hoja del incidente): la hoja abre en su reparación. */
  faultId?: string;
  correcting?: MaintenanceRecord;
  /** `equipment.condition.change` con Equipos admitiendo cambios. */
  canChangeCondition: boolean;
}) {
  const startPlanId = correcting ? (correcting.plan?.id ?? '') : initialPlanId;
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
      faultId: '',
      resolveFault: false,
      returnToOperational: false,
      reason: '',
      ...(correcting ? formFrom(correcting) : {}),
    },
  });
  const assetId = form.watch('assetId');
  const planId = form.watch('planId');
  const assetMaintenance = useAssetMaintenance(workspaceId, assetId || null);
  const plans = usePlans(workspaceId);
  const create = useCreateRecord(workspaceId);
  const correct = useCorrectRecord(workspaceId, correcting?.id ?? '');
  const attach = useAttachCertificate(workspaceId);
  const changeCondition = useChangeAssetCondition(workspaceId, assetId);
  const [state, dispatch] = useReducer(saveStep, { step: 'idle' });
  const [file, setFile] = useState<File | null>(null);
  const [reviewChecklist, setReviewChecklist] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  // La fecha del plan antes de guardar, para saber si el registro la movió.
  const [dueBefore, setDueBefore] = useState<string | null>(null);
  // Lo que se pidió hacer en Equipos con el incidente: el registro lo aplica entero o nada.
  const [repair, setRepair] = useState<RepairDone | undefined>(undefined);

  /** Los planes que cubren al equipo, con su fecha; el detalle (lista, criterio, versión) sale de `usePlans`. */
  const assetPlans = assetMaintenance.data?.plans ?? [];
  /** Los incidentes abiertos del equipo, para quien los atiende: cada uno es una reparación posible. */
  const openFaults = assetMaintenance.data?.openFaults ?? [];
  const assetCondition = assetMaintenance.data?.asset.condition;
  /** Devolver el equipo a operativo solo se ofrece si no lo está y la persona puede cambiar su estado. */
  const canReturn = canChangeCondition && assetCondition !== undefined && assetCondition !== 'operational' && assetCondition !== 'retired';
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
  /** Un plan, o ninguno con `''`: deja de atender un incidente. */
  const selectPlan = (id: string) => {
    applyPlan(id, true);
    form.setValue('faultId', '', { shouldDirty: true });
    form.setValue('resolveFault', false);
    setReviewChecklist(false);
  };

  /**
   * La reparación de un incidente abierto: un correctivo sin plan que lo atiende y, por omisión, lo soluciona y
   * devuelve el equipo a operativo si no lo está.
   */
  const selectFault = (id: string, dirty = true) => {
    applyPlan('', dirty);
    form.setValue('kind', 'corrective', { shouldDirty: dirty });
    form.setValue('faultId', id, { shouldDirty: dirty });
    form.setValue('resolveFault', true);
    form.setValue('returnToOperational', canReturn);
    setReviewChecklist(false);
  };

  // El plan pedido al abrir (desde «Por hacer» o el del registro que se corrige) se elige una vez, cuando llegan
  // los planes; no cuenta como cambio. Al corregir, la lista conserva sus marcas si el plan no la cambió.
  const initialApplied = useRef(startPlanId === '');
  useEffect(() => {
    if (initialApplied.current || !plans.data) return;
    initialApplied.current = true;
    if (!plans.data.items.some((entry) => entry.id === startPlanId)) return;
    applyPlan(startPlanId, false);
    const items = planDetail(startPlanId)?.checklist ?? [];
    const marks = correcting?.checklist ?? [];
    if (marks.length === items.length && marks.every((entry, index) => entry.item === items[index])) {
      form.setValue('checklist', marks.map((entry) => entry.done));
    }
    // `applyPlan` solo escribe en el formulario; basta con reaccionar a la llegada de los planes.
  }, [plans.data]);

  // El incidente pedido al abrir (desde su hoja) se elige una vez, cuando llega el equipo, si sigue abierto.
  const faultApplied = useRef(initialFaultId === '');
  useEffect(() => {
    if (faultApplied.current || !assetMaintenance.data) return;
    faultApplied.current = true;
    if (assetMaintenance.data.openFaults.some((entry) => entry.id === initialFaultId)) selectFault(initialFaultId, false);
    // Solo reacciona a la llegada del equipo.
  }, [assetMaintenance.data]);

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
    const reason = values.reason.trim();
    if (correcting && reason === '') {
      form.setError('reason', { message: 'Escribe por qué se corrige el registro.' });
      return;
    }
    setDueBefore(assetPlans.find((entry) => entry.plan.id === values.planId)?.dueOn ?? null);
    setRepair(input.resolveFault ? { resolved: true, returned: input.resolveFault.returnToOperational } : undefined);
    dispatch({ type: 'submit' });
    const handlers = {
      onSuccess: (record: RecordCreated) => {
        setReviewChecklist(false);
        dispatch({ type: 'recorded', record, withCertificate: file !== null });
        if (file) sendCertificate(record.id, file);
      },
      onError: (error: unknown) => {
        dispatch({ type: 'recordFailed' });
        if (isApiError(error, 'VERSION_CONFLICT')) void reloadPlan();
        setGeneralError(maintenanceErrorMessage(error));
      },
    };
    if (correcting) {
      // Un PDF nuevo reemplaza al del anulado: entonces el nuevo no lo lleva.
      correct.mutate({ reason, keepCertificate: correcting.certificate !== null && file === null, record: input }, handlers);
    } else {
      create.mutate(input, handlers);
    }
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
  const offered = (['faulted', 'restricted'] as const satisfies readonly AssetCondition[]).filter((option) => option !== assetCondition);
  const conditionOffer =
    saved?.result === 'fail' && canChangeCondition && assetCondition !== 'retired' && offered.length > 0
      ? {
          options: offered,
          reason: `No conforme en ${saved.plan?.title ?? 'mantenimiento'}${saved.observations ? `: ${saved.observations}` : ''}`.slice(0, 500),
        }
      : null;

  return {
    form,
    /** Hay algo por perder al cerrar. */
    dirty: form.formState.isDirty || file !== null,
    asset: assetMaintenance,
    assetPlans,
    openFaults,
    canReturn,
    plan,
    plans,
    selectPlan,
    selectFault,
    correcting: correcting ?? null,
    reviewChecklist,
    file,
    setFile,
    state,
    pending: state.step === 'saving' || state.step === 'attaching',
    generalError,
    submit,
    retryAttach,
    attachError: state.step === 'attachFailed' ? maintenanceErrorMessage(state.error) : null,
    outcome: saved ? recordOutcome(saved, dueBefore, { ...(repair ? { repair } : {}), corrected: correcting !== undefined }) : null,
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
