import { VALIDITY_KINDS, conservationLabel, type WorkKind, type WorkspaceMeResponse } from '@platlab/contracts';
import { Button, Field, Input, OptionRow, Select, Skeleton, Textarea, normalizeDecimalInput } from '@platlab/ui';
import { ChevronDown, ClipboardCheck, ScanLine, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { useMediaQuery } from '../../app/use-media-query';
import { formatDate } from '../../app/format';
import { PillField } from '../../app/pills';
import { ScannerView } from '../../app/scan/scanner-view';
import { AssetSearch, ChosenAsset } from './asset-search';
import { CertificateField } from './certificate-field';
import { certificateFileError } from './certificate-file';
import { dueText, dueTone, todayInZone } from './due';
import { toneText } from './due-view';
import { ProviderSheet } from './provider-sheet';
import { RecordSaved } from './record-saved';
import { ResultChoice } from './result-choice';
import { readAssetScan, useRecordWork } from './use-record-work';
import { useProviders } from './queries';
import { kindLabels, titleWithKind } from './work-text';

const INTERNAL = 'internal';
const NEW_PROVIDER = '__new-provider';
const kindOptions = (Object.keys(kindLabels) as WorkKind[]).map((value) => ({ value, label: kindLabels[value] }));
const conservationOptions = (['good', 'fair', 'poor'] as const).map((value) => ({ value, label: conservationLabel[value] }));

/** El equipo: buscarlo por código o nombre, o escanear su etiqueta sin salir de la hoja. */
function AssetPicker({
  workspaceId,
  open,
  startScanning,
  error,
  onChoose,
}: {
  workspaceId: string;
  open: boolean;
  startScanning: boolean;
  error: string | undefined;
  onChoose: (assetId: string) => void;
}) {
  const [scanning, setScanning] = useState(startScanning);
  const read = useMemo(() => readAssetScan(workspaceId), [workspaceId]);
  if (scanning) {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink">Equipo</span>
          <Button size="sm" className="max-sm:h-11" onClick={() => setScanning(false)}>
            Buscar por nombre
          </Button>
        </div>
        <ScannerView
          active={open}
          read={read}
          onFound={(assetId) => {
            setScanning(false);
            onChoose(assetId);
          }}
        />
      </div>
    );
  }
  return (
    <AssetSearch
      workspaceId={workspaceId}
      error={error}
      onChoose={(asset) => onChoose(asset.id)}
      action={
        // En pantallas angostas queda solo el icono (44 px), para que el buscador conserve su texto.
        <Button className="h-11 shrink-0 max-[420px]:w-11 max-[420px]:px-0" onClick={() => setScanning(true)}>
          <ScanLine aria-hidden />
          <span className="max-[420px]:sr-only">Escanear</span>
        </Button>
      }
    />
  );
}

/**
 * «Registrar mantenimiento» (ADR 0020), una hoja corta: el equipo y el trabajo (elegidos o por buscar), la fecha, el
 * resultado en tres botones, quién lo hizo y, plegado, «Más datos» (costo, estado físico y certificado). Guarda en dos
 * pasos —el registro y su certificado— y, ya guardado, dice qué pasó. Un registro guardado no se edita.
 */
export function RecordSheet({
  workspaceId,
  me,
  open,
  onOpenChange,
  assetId,
  planId,
  scan = false,
}: SheetBaseProps & { me: WorkspaceMeResponse; assetId?: string; planId?: string; scan?: boolean }) {
  const [today] = useState(() => todayInZone(me.workspace.timeZone, Date.now()));
  // En pantalla ancha la hoja abre en su primer campo; en el móvil no, para no abrir el teclado ni el selector de fecha.
  const wideScreen = useMediaQuery('(min-width: 640px)');
  const canChangeCondition =
    me.permissions.includes('equipment.condition.change') &&
    (me.modules.find((entry) => entry.code === 'equipment')?.access.includes('new_operation') ?? false);
  const work = useRecordWork({
    workspaceId,
    today,
    ...(assetId ? { assetId } : {}),
    ...(planId ? { planId } : {}),
    canChangeCondition,
  });
  const { form } = work;
  const providers = useProviders(workspaceId);
  const canCreateProvider =
    me.permissions.includes('maintenance.plan.manage') && (me.modules.find((entry) => entry.code === 'maintenance')?.access.includes('new_operation') ?? false);
  // La hoja de «Nuevo proveedor» va aparte, fuera del formulario: un envío suyo no debe llegar al de esta hoja.
  const [newProvider, setNewProvider] = useState<number | null>(null);
  const errors = form.formState.errors;
  const chosenId = form.watch('assetId');
  const selectedPlanId = form.watch('planId');
  const kind = form.watch('kind');
  const result = form.watch('result');
  const checklist = form.watch('checklist');
  const providerId = form.watch('providerId');
  const conservation = form.watch('conservation');
  const performedOn = form.watch('performedOn');
  const assetInfo = work.asset.data?.asset;
  const retired = assetInfo?.condition === 'retired';
  const [noPlan, setNoPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [costText, setCostText] = useState('');
  const [extraOpen, setExtraOpen] = useState(false);
  // Con el plan que se pidió al abrir (desde «Por hacer») no hay nada que elegir: se muestra como resumen.
  const [pickedAnother, setPickedAnother] = useState(false);
  const preselected = planId !== undefined && !pickedAnother && (selectedPlanId === planId || work.plans.isPending);
  const saved = work.state.step !== 'idle' && work.state.step !== 'saving';

  // Con un solo plan, se elige solo: es lo más común y ahorra un toque; con varios, se elige a propósito.
  const autoFor = useRef('');
  useEffect(() => {
    if (!chosenId || autoFor.current === chosenId || !work.asset.data || !work.plans.data) return;
    autoFor.current = chosenId;
    const only = work.assetPlans.length === 1 ? work.assetPlans[0] : undefined;
    if (only && selectedPlanId === '' && !noPlan) work.selectPlan(only.plan.id);
    // Solo reacciona a la llegada de los datos del equipo y de los planes.
  }, [chosenId, work.asset.data, work.plans.data]);

  const effectiveKind = work.plan?.kind ?? (kind || null);
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

  const planChosen = selectedPlanId !== '' || noPlan || (work.asset.data !== undefined && work.assetPlans.length === 0);
  const submit = () => {
    if (saved) {
      onOpenChange(false);
      return;
    }
    const values = form.getValues();
    form.clearErrors();
    setPlanError(null);
    setFileError(null);
    let invalid = false;
    if (!values.assetId) {
      form.setError('assetId', { message: 'Elige el equipo al que se le hizo el mantenimiento.' });
      invalid = true;
    } else if (retired) {
      invalid = true;
    } else if (!planChosen) {
      setPlanError('Elige el plan que se cumplió, o «Sin plan».');
      invalid = true;
    } else if (!values.planId && !values.kind) {
      form.setError('kind', { message: 'Elige el tipo de trabajo.' });
      invalid = true;
    }
    if (!values.result) {
      form.setError('result', { message: 'Elige el resultado del mantenimiento.' });
      invalid = true;
    } else if (values.result !== 'pass' && values.observations.trim() === '') {
      // Con observaciones o No conforme, decir qué pasó es obligatorio: se avisa aquí, sin esperar al servidor.
      form.setError('observations', {
        message: values.result === 'fail' ? 'Escribe qué falló y qué hace falta para corregirlo.' : 'Escribe qué encontraste o qué conviene vigilar.',
      });
      invalid = true;
    }
    if (work.file) {
      const problem = certificateFileError(work.file);
      if (problem) {
        setFileError(problem);
        setExtraOpen(true);
        invalid = true;
      }
    }
    if (invalid) return;
    work.submit();
  };

  const planDetail = work.plan;
  const generalError = work.generalError ?? errors.root?.message ?? null;
  const asset = work.asset;

  return (
    <>
      <FormSheet
        icon={ClipboardCheck}
        title="Registrar mantenimiento"
        description="Queda en el historial del equipo y no se puede editar después."
        open={open}
        onOpenChange={onOpenChange}
        submitLabel={saved ? 'Listo' : 'Guardar'}
        pending={work.pending}
        generalError={saved ? null : generalError}
        onSubmit={submit}
        submitDisabled={!saved && chosenId !== '' && asset.isPending}
        dirty={work.dirty && !saved}
        fullWidthSubmit
        fullscreenMobile
        focusFirst={wideScreen}
        pendingText={work.state.step === 'attaching' ? 'Adjuntando el certificado…' : 'Guardando el mantenimiento…'}
        announcement={work.state.step === 'done' ? `Mantenimiento guardado. ${work.outcome?.text ?? ''}` : undefined}
      >
        {saved ? (
          <RecordSaved work={work} />
        ) : (
          <>
            <p aria-hidden className="-mb-2 text-[13px] text-ink-muted">
              * obligatorio
            </p>
            <section aria-label="Equipo y trabajo" className="grid gap-4">
              {chosenId === '' ? (
                <AssetPicker workspaceId={workspaceId} open={open} startScanning={scan} error={errors.assetId?.message} onChoose={resetAsset} />
              ) : asset.isPending ? (
                <Skeleton className="h-14" />
              ) : asset.isError || !assetInfo ? (
                <div role="alert" className="grid justify-items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
                  <p>No se pudo cargar el equipo.</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="max-sm:h-11" onClick={() => void asset.refetch()}>
                      Reintentar
                    </Button>
                    <Button size="sm" className="max-sm:h-11" onClick={() => resetAsset('')}>
                      Elegir otro
                    </Button>
                  </div>
                </div>
              ) : (
                <ChosenAsset
                  asset={assetInfo}
                  onClear={() => resetAsset('')}
                  extra={
                    retired ? (
                      <p role="alert" className="text-[13px] font-medium text-danger">
                        Este equipo está dado de baja y ya no admite mantenimientos. Elige otro.
                      </p>
                    ) : preselected && work.plan ? (
                      <p className="break-words text-sm text-ink">
                        <span className="font-semibold">{titleWithKind(work.plan.title, work.plan.kind)}</span>
                      </p>
                    ) : null
                  }
                />
              )}

              {assetInfo && !retired && !preselected ? (
                work.assetPlans.length === 0 ? (
                  <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
                    Este equipo no tiene plan: <span className="font-medium text-ink">Sin plan</span>. Indica el tipo de trabajo.
                  </p>
                ) : (
                  <fieldset className="grid min-w-0 gap-1.5">
                    <legend className="mb-1.5 text-sm font-medium text-ink">
                      ¿Qué trabajo se hizo?
                      <span aria-hidden className="ml-0.5">
                        *
                      </span>
                    </legend>
                    <div className="grid gap-0.5 rounded-xl border border-line bg-white/60 p-1">
                      {work.assetPlans.map((entry) => {
                        const tone = dueTone(entry, today);
                        return (
                          <OptionRow
                            key={entry.plan.id}
                            type="radio"
                            name="plan"
                            checked={selectedPlanId === entry.plan.id}
                            aria-invalid={planError ? true : undefined}
                            onChange={() => {
                              work.selectPlan(entry.plan.id);
                              setNoPlan(false);
                              setPlanError(null);
                            }}
                          >
                            <span className="block font-medium">
                              {titleWithKind(entry.plan.title, entry.plan.kind)}
                            </span>
                            <span className={`block text-[13px] font-medium ${toneText[tone]}`}>
                              {entry.lastResult === 'fail' ? 'No conforme, pendiente' : `${formatDate(entry.dueOn)} · ${dueText(entry.dueOn, today)}`}
                            </span>
                          </OptionRow>
                        );
                      })}
                      <OptionRow
                        type="radio"
                        name="plan"
                        checked={noPlan && selectedPlanId === ''}
                        aria-invalid={planError ? true : undefined}
                        onChange={() => {
                          work.selectPlan('');
                          setNoPlan(true);
                          setPlanError(null);
                        }}
                      >
                        <span className="block font-medium">Sin plan</span>
                        <span className="block text-[13px] font-normal text-ink-muted">Un trabajo que no es de ninguno de estos planes</span>
                      </OptionRow>
                    </div>
                    {planError ? (
                      <p role="alert" className="text-[13px] font-medium text-danger">
                        {planError}
                      </p>
                    ) : null}
                  </fieldset>
                )
              ) : null}

              {assetInfo && !retired && selectedPlanId === '' && planChosen ? (
                <>
                  <PillField
                    label="Tipo de trabajo"
                    required
                    value={kind}
                    options={kindOptions}
                    onChange={(value) => {
                      form.setValue('kind', value, { shouldDirty: true });
                      form.clearErrors('kind');
                    }}
                    error={errors.kind?.message}
                  />
                  <p role="status" className="flex items-start gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    Este registro no actualizará ningún plan.
                  </p>
                </>
              ) : null}
            </section>

            <div className={showValidity ? 'grid gap-4 min-[420px]:grid-cols-2' : 'grid gap-4'}>
              <Field label="Fecha" required error={errors.performedOn?.message}>
                <Input type="date" max={today} className="h-11 sm:h-10" {...form.register('performedOn')} />
              </Field>
              {showValidity ? (
                <Field label="Válida hasta" optional error={errors.validUntil?.message}>
                  <Input type="date" min={performedOn} className="h-11 sm:h-10" {...form.register('validUntil')} />
                </Field>
              ) : null}
            </div>

            {planDetail && (planDetail.checklist.length > 0 || planDetail.acceptanceCriteria) ? (
              <fieldset className="grid min-w-0 gap-2">
                <legend className="text-sm font-medium text-ink">
                  Lista de verificación
                  <span className="ml-1 font-normal text-ink-subtle">(opcional)</span>
                </legend>
                <p className="text-[13px] text-ink-muted">Marca lo que hiciste.</p>
                {work.reviewChecklist ? (
                  <p role="alert" className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm font-medium text-warning">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    El plan cambió: revisa la lista.
                  </p>
                ) : null}
                {planDetail.acceptanceCriteria ? (
                  <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink">
                    <span className="block text-[13px] font-semibold text-ink-muted">Criterio de aceptación</span>
                    <span className="whitespace-pre-line break-words">{planDetail.acceptanceCriteria}</span>
                  </p>
                ) : null}
                {planDetail.checklist.length > 0 ? (
                  <div className="grid gap-0.5 rounded-xl border border-line bg-white/60 p-1">
                    {planDetail.checklist.map((item, index) => (
                      <OptionRow
                        key={`${index}-${item}`}
                        checked={checklist[index] ?? false}
                        onChange={(event) =>
                          form.setValue(
                            'checklist',
                            planDetail.checklist.map((_, position) => (position === index ? event.target.checked : (checklist[position] ?? false))),
                            { shouldDirty: true },
                          )
                        }
                      >
                        {item}
                      </OptionRow>
                    ))}
                  </div>
                ) : null}
              </fieldset>
            ) : null}

            <ResultChoice
              value={result}
              onChange={(value) => {
                form.setValue('result', value, { shouldDirty: true });
                form.clearErrors(['result', 'observations']);
              }}
              error={errors.result?.message}
              hint={result === 'fail' ? 'Seguirá por hacer hasta que se registre uno Conforme.' : undefined}
            />
            {result !== '' && result !== 'pass' ? (
              <Field
                label="Observaciones"
                required
                hint={result === 'fail' ? 'Qué falló y qué hace falta para corregirlo.' : 'Qué encontraste o qué conviene vigilar.'}
                error={errors.observations?.message}
              >
                <Textarea rows={3} maxLength={2000} {...form.register('observations')} />
              </Field>
            ) : null}

            <Field label="Lo hizo" error={errors.providerId?.message}>
              <Select
                value={providerId === '' ? INTERNAL : providerId}
                onValueChange={(value) => {
                  if (value === NEW_PROVIDER) setNewProvider((newProvider ?? 0) + 1);
                  else form.setValue('providerId', value === INTERNAL ? '' : value, { shouldDirty: true });
                }}
                placeholder="Interno"
                triggerClassName="h-11 sm:h-10"
                options={[
                  { value: INTERNAL, label: 'Interno' },
                  ...(providers.data?.items ?? []).map((provider) => ({ value: provider.id, label: provider.name })),
                  ...(canCreateProvider ? [{ value: NEW_PROVIDER, label: '+ Nuevo proveedor' }] : []),
                ]}
              />
            </Field>

            <details open={extraOpen} onToggle={(event) => setExtraOpen(event.currentTarget.open)} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">Más datos</span>
                  <span className="block text-[13px] text-ink-muted">Costo, estado físico y certificado. Todo es opcional.</span>
                </span>
                <ChevronDown className="size-5 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-4 grid gap-4">
                <Field label="Costo" optional error={errors.cost?.message}>
                  <div className="relative">
                    <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                      $
                    </span>
                    <Input
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0,00"
                      className="h-11 pl-7 tabular-nums sm:h-10"
                      value={costText}
                      onChange={(event) => {
                        setCostText(event.target.value);
                        form.setValue('cost', normalizeDecimalInput(event.target.value), { shouldDirty: true });
                      }}
                    />
                  </div>
                </Field>
                {assetInfo ? (
                  <PillField
                    label="Estado físico actual"
                    size="sm"
                    value={conservation || assetInfo.conservation || ''}
                    options={conservationOptions}
                    onChange={(value) => form.setValue('conservation', value === assetInfo.conservation ? '' : value, { shouldDirty: true })}
                    hint={
                      assetInfo.conservation
                        ? `Ahora: ${conservationLabel[assetInfo.conservation]}. Cambia solo si lo encontraste distinto.`
                        : 'El equipo no tiene este dato. Elige uno si lo evaluaste.'
                    }
                  />
                ) : null}
                <CertificateField
                  file={work.file}
                  onChange={(file) => {
                    work.setFile(file);
                    setFileError(null);
                  }}
                  error={fileError}
                />
              </div>
            </details>
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
