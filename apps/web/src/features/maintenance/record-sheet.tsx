import { VALIDITY_KINDS, type MaintenanceRecord, type WorkspaceMeResponse } from '@platlab/contracts';
import { ClipboardCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { useMediaQuery } from '../../app/use-media-query';
import { formatDate, todayInZone } from '../../app/format';
import { pdfFileError } from '../../app/pdf-file';
import { ProviderSheet } from './provider-sheet';
import { RecordSaved } from './record-saved';
import { ChecklistSection, DateSection, ExtraSection, ProviderField, ReasonSection, ResultSection } from './record-sections';
import { WorkSection } from './record-work-section';
import { useRecordWork } from './use-record-work';
import { canOperateModule } from '../../app/module-access';

/**
 * «Registrar mantenimiento» (ADR 0020), una hoja corta: el equipo y el trabajo (elegidos o por buscar), la fecha, el
 * resultado en tres botones, quién lo hizo y, plegado, «Más datos» (costo, estado físico y certificado). Guarda en dos
 * pasos —el registro y su certificado— y, ya guardado, dice qué pasó. Un registro guardado no se edita.
 *
 * Un correctivo dice «Qué se hizo» y puede atender un incidente abierto del equipo y solucionarlo (M-01b). Con
 * `correcting`, es «Corregir registro» (Administrador): empieza con los datos del registro, pide el motivo y el
 * anterior queda anulado y a la vista.
 */
export function RecordSheet({
  workspaceId,
  me,
  open,
  onOpenChange,
  assetId,
  planId,
  faultId,
  correcting,
  scan = false,
}: SheetBaseProps & {
  me: WorkspaceMeResponse;
  assetId?: string;
  planId?: string;
  /** El incidente que atiende: la hoja abre en su reparación (desde la hoja del incidente, M-01b). */
  faultId?: string;
  /** El registro que se corrige (Administrador, M-01b): la hoja empieza con sus datos y pide el motivo. */
  correcting?: MaintenanceRecord;
  scan?: boolean;
}) {
  const [today] = useState(() => todayInZone(me.workspace.timeZone, Date.now()));
  // En pantalla ancha la hoja abre en su primer campo; en el móvil no, para no abrir el teclado ni el selector de fecha.
  const wideScreen = useMediaQuery('(min-width: 640px)');
  const canChangeCondition =
    me.permissions.includes('equipment.condition.change') && canOperateModule(me, 'equipment');
  const work = useRecordWork({
    workspaceId,
    today,
    ...(assetId ? { assetId } : {}),
    ...(planId ? { planId } : {}),
    ...(faultId ? { faultId } : {}),
    ...(correcting ? { correcting } : {}),
    canChangeCondition,
  });
  const { form } = work;
  const canCreateProvider =
    me.permissions.includes('maintenance.plan.manage') && canOperateModule(me, 'maintenance');
  // La hoja de «Nuevo proveedor» va aparte, fuera del formulario: un envío suyo no debe llegar al de esta hoja.
  const [newProvider, setNewProvider] = useState<number | null>(null);
  const errors = form.formState.errors;
  const chosenId = form.watch('assetId');
  const selectedPlanId = form.watch('planId');
  const kind = form.watch('kind');
  const chosenFault = form.watch('faultId');
  const assetInfo = work.asset.data?.asset;
  const retired = assetInfo?.condition === 'retired';
  const [noPlan, setNoPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  // Con el plan que se pidió al abrir (desde «Por hacer») no hay nada que elegir: se muestra como resumen.
  const [pickedAnother, setPickedAnother] = useState(false);
  // Al corregir, el plan del registro tampoco se elige: se muestra como resumen.
  const preselected = correcting
    ? correcting.plan !== null
    : planId !== undefined && !pickedAnother && (selectedPlanId === planId || work.plans.isPending);
  const saved = work.state.step !== 'idle' && work.state.step !== 'saving';

  // Con un solo plan, se elige solo: es lo más común y ahorra un toque; con varios, se elige a propósito. No corre si
  // ya hay un incidente elegido, si se pidió uno al abrir o si se está corrigiendo un registro.
  const autoFor = useRef('');
  useEffect(() => {
    if (!chosenId || autoFor.current === chosenId || !work.asset.data || !work.plans.data) return;
    autoFor.current = chosenId;
    if (work.correcting || faultId || form.getValues('faultId') !== '') return;
    const only = work.assetPlans.length === 1 ? work.assetPlans[0] : undefined;
    if (only && selectedPlanId === '' && !noPlan) work.selectPlan(only.plan.id);
    // Solo reacciona a la llegada de los datos del equipo y de los planes.
  }, [chosenId, work.asset.data, work.plans.data]);

  const effectiveKind = work.plan?.kind ?? (kind || null);
  const corrective = effectiveKind === 'corrective';
  const showValidity = effectiveKind !== null && VALIDITY_KINDS.includes(effectiveKind);
  // «Válida hasta» solo existe en calibración y verificación: si cambia el trabajo, se descarta.
  useEffect(() => {
    if (!showValidity && form.getValues('validUntil') !== '') form.setValue('validUntil', '');
  }, [showValidity]);
  // Un error en un dato plegado abre el bloque, para que se vea.
  useEffect(() => {
    if (errors.cost) setExtraOpen(true);
  }, [errors.cost]);

  const resetAsset = (id: string) => {
    form.setValue('assetId', id, { shouldDirty: true });
    form.clearErrors();
    work.selectPlan('');
    form.setValue('conservation', '');
    setNoPlan(false);
    setPlanError(null);
    autoFor.current = '';
    setPickedAnother(true);
  };

  const planChosen =
    selectedPlanId !== '' ||
    noPlan ||
    chosenFault !== '' ||
    correcting !== undefined ||
    (work.asset.data !== undefined && work.assetPlans.length === 0 && work.openFaults.length === 0);
  const submit = () => {
    if (saved) {
      onOpenChange(false);
      return;
    }
    const values = form.getValues();
    // Mientras llegan los datos del equipo elegido aún no hay qué validar: el esqueleto ya lo dice.
    if (chosenId !== '' && work.asset.isPending) return;
    form.clearErrors();
    setPlanError(null);
    setFileError(null);
    let invalid = false;
    if (work.correcting && values.reason.trim() === '') {
      form.setError('reason', { message: 'Escribe por qué se corrige el registro.' });
      invalid = true;
    }
    if (!values.assetId) {
      form.setError('assetId', { message: 'Elige el equipo al que se le hizo el mantenimiento.' });
      invalid = true;
    } else if (retired) {
      invalid = true;
    } else if (!planChosen) {
      setPlanError(
        work.openFaults.length > 0 ? 'Elige el plan que se cumplió, la reparación de un incidente o «Sin plan».' : 'Elige el plan que se cumplió, o «Sin plan».',
      );
      invalid = true;
    } else if (!values.planId && !values.kind) {
      form.setError('kind', { message: 'Elige el tipo de trabajo.' });
      invalid = true;
    }
    if (!values.result) {
      form.setError('result', { message: 'Elige el resultado del mantenimiento.' });
      invalid = true;
    }
    // Un correctivo dice qué se hizo con cualquier resultado; con observaciones o No conforme, decir qué pasó es
    // obligatorio: se avisa aquí, sin esperar al servidor.
    if (values.observations.trim() === '' && (corrective || (values.result !== '' && values.result !== 'pass'))) {
      form.setError('observations', {
        message: corrective
          ? 'Escribe qué se hizo.'
          : values.result === 'fail'
            ? 'Escribe qué falló y qué hace falta para corregirlo.'
            : 'Escribe qué encontraste o qué conviene vigilar.',
      });
      invalid = true;
    }
    if (work.file) {
      const problem = pdfFileError(work.file);
      if (problem) {
        setFileError(problem);
        setExtraOpen(true);
        invalid = true;
      }
    }
    if (invalid) return;
    work.submit();
  };

  const generalError = work.generalError ?? errors.root?.message ?? null;

  return (
    <>
      <FormSheet
        icon={ClipboardCheck}
        title={correcting ? 'Corregir registro' : 'Registrar mantenimiento'}
        description={
          correcting
            ? `El registro del ${formatDate(correcting.performedOn)} queda anulado y a la vista, con el motivo.`
            : 'Queda en el historial del equipo y no se puede editar después.'
        }
        open={open}
        onOpenChange={onOpenChange}
        submitLabel={saved ? 'Listo' : correcting ? 'Guardar corrección' : 'Registrar mantenimiento'}
        pending={work.pending}
        generalError={saved ? null : generalError}
        onSubmit={submit}
        required={!saved}
        dirty={work.dirty && !saved}
        fullscreenMobile
        focusFirst={wideScreen}
        pendingText={
          work.state.step === 'attaching' ? 'Adjuntando el certificado…' : correcting ? 'Guardando la corrección…' : 'Guardando el mantenimiento…'
        }
        announcement={
          work.state.step === 'done' ? `${correcting ? 'Corrección guardada' : 'Mantenimiento guardado'}. ${work.outcome?.text ?? ''}` : undefined
        }
      >
        {saved ? (
          <RecordSaved work={work} />
        ) : (
          <>
            <WorkSection
              work={work}
              workspaceId={workspaceId}
              open={open}
              startScanning={scan}
              today={today}
              timeZone={me.workspace.timeZone}
              retired={retired}
              preselected={preselected}
              planChosen={planChosen}
              noPlan={noPlan}
              planError={planError}
              onResetAsset={resetAsset}
              onSelectPlan={(id) => {
                work.selectPlan(id);
                setNoPlan(false);
                setPlanError(null);
              }}
              onSelectFault={(id) => {
                work.selectFault(id);
                setNoPlan(false);
                setPlanError(null);
              }}
              onSelectNoPlan={() => {
                work.selectPlan('');
                setNoPlan(true);
                setPlanError(null);
              }}
            />
            {correcting ? <ReasonSection form={form} /> : null}
            <DateSection form={form} today={today} showValidity={showValidity} />
            <ChecklistSection work={work} />
            <ResultSection work={work} corrective={corrective} />
            <ProviderField
              form={form}
              workspaceId={workspaceId}
              canCreate={canCreateProvider}
              onNewProvider={() => setNewProvider((current) => (current ?? 0) + 1)}
            />
            <ExtraSection
              work={work}
              expanded={extraOpen}
              onExpandedChange={setExtraOpen}
              fileError={fileError}
              onFileChange={(file) => {
                work.setFile(file);
                setFileError(null);
              }}
            />
          </>
        )}
      </FormSheet>
      {newProvider !== null ? (
        <ProviderSheet
          key={newProvider}
          workspaceId={workspaceId}
          open
          onOpenChange={(next) => {
            if (!next) setNewProvider(null);
          }}
          onCreated={(created) => form.setValue('providerId', created.id, { shouldDirty: true })}
        />
      ) : null}
    </>
  );
}
