import { type WorkKind } from '@platlab/contracts';
import { Button, OptionRow, Skeleton } from '@platlab/ui';
import { ScanLine, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDate, formatDayInZone } from '../../app/format';
import { readEquipmentLabel } from '../../app/label-link';
import { PillField } from '../../app/pills';
import { ScannerView } from '../../app/scan/scanner-view';
import { AssetSearch, ChosenAsset } from './asset-search';
import { dueText, dueTone } from './due';
import { toneText } from './due-view';
import type { RecordWork } from './use-record-work';
import { kindLabels, titleWithKind } from './work-text';

const kindOptions = (Object.keys(kindLabels) as WorkKind[]).map((value) => ({ value, label: kindLabels[value] }));

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
  const read = useMemo(() => readEquipmentLabel(workspaceId, 'Equipo leído'), [workspaceId]);
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

/** «¿Qué trabajo se hizo?»: uno de los planes del equipo, la reparación de un incidente abierto o «Sin plan». */
function PlanChoice({
  work,
  today,
  timeZone,
  noPlan,
  planError,
  onSelectPlan,
  onSelectFault,
  onSelectNoPlan,
}: {
  work: RecordWork;
  today: string;
  timeZone: string;
  noPlan: boolean;
  planError: string | null;
  onSelectPlan: (planId: string) => void;
  onSelectFault: (faultId: string) => void;
  onSelectNoPlan: () => void;
}) {
  const selectedPlanId = work.form.watch('planId');
  const chosenFault = work.form.watch('faultId');
  if (work.assetPlans.length === 0 && work.openFaults.length === 0) {
    return (
      <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
        Este equipo no tiene plan: <span className="font-medium text-ink">Sin plan</span>. Indica el tipo de trabajo.
      </p>
    );
  }
  return (
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
              onChange={() => onSelectPlan(entry.plan.id)}
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
        {work.openFaults.map((fault) => (
          <OptionRow
            key={fault.id}
            type="radio"
            name="plan"
            checked={chosenFault === fault.id}
            aria-invalid={planError ? true : undefined}
            onChange={() => onSelectFault(fault.id)}
          >
            <span className="block font-medium">Reparación del incidente del {formatDayInZone(fault.reportedAt, timeZone)}</span>
            <span className="block truncate text-[13px] font-normal text-ink-muted">{fault.description}</span>
          </OptionRow>
        ))}
        <OptionRow
          type="radio"
          name="plan"
          checked={noPlan && selectedPlanId === '' && chosenFault === ''}
          aria-invalid={planError ? true : undefined}
          onChange={onSelectNoPlan}
        >
          <span className="block font-medium">Sin plan</span>
          <span className="block text-[13px] font-normal text-ink-muted">
            {work.assetPlans.length > 0 ? 'Un trabajo que no es de ninguno de estos planes' : 'Otro trabajo, que no es de un plan'}
          </span>
        </OptionRow>
      </div>
      {planError ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {planError}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * «Equipo y trabajo»: el equipo (por elegir, cargando, con error o elegido), qué plan o incidente se atendió y, sin
 * plan, el tipo de trabajo. `preselected` y `retired` los decide la hoja: ella también guarda lo elegido y el aviso.
 */
export function WorkSection({
  work,
  workspaceId,
  open,
  startScanning,
  today,
  timeZone,
  retired,
  preselected,
  planChosen,
  noPlan,
  planError,
  onResetAsset,
  onSelectPlan,
  onSelectFault,
  onSelectNoPlan,
}: {
  work: RecordWork;
  workspaceId: string;
  open: boolean;
  startScanning: boolean;
  today: string;
  timeZone: string;
  retired: boolean;
  preselected: boolean;
  planChosen: boolean;
  noPlan: boolean;
  planError: string | null;
  onResetAsset: (assetId: string) => void;
  onSelectPlan: (planId: string) => void;
  onSelectFault: (faultId: string) => void;
  onSelectNoPlan: () => void;
}) {
  const { form, asset, correcting } = work;
  const errors = form.formState.errors;
  const chosenId = form.watch('assetId');
  const selectedPlanId = form.watch('planId');
  const kind = form.watch('kind');
  const chosenFault = form.watch('faultId');
  const assetInfo = asset.data?.asset;

  return (
    <section aria-label="Equipo y trabajo" className="grid gap-4">
      {chosenId === '' ? (
        <AssetPicker workspaceId={workspaceId} open={open} startScanning={startScanning} error={errors.assetId?.message} onChoose={onResetAsset} />
      ) : asset.isPending ? (
        <Skeleton className="h-14" />
      ) : asset.isError || !assetInfo ? (
        <div role="alert" className="grid justify-items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <p>No se pudo cargar el equipo.</p>
          <div className="flex gap-2">
            <Button size="sm" className="max-sm:h-11" onClick={() => void asset.refetch()}>
              Reintentar
            </Button>
            {correcting ? null : (
              <Button size="sm" className="max-sm:h-11" onClick={() => onResetAsset('')}>
                Elegir otro
              </Button>
            )}
          </div>
        </div>
      ) : (
        <ChosenAsset
          asset={assetInfo}
          onClear={correcting ? undefined : () => onResetAsset('')}
          extra={
            retired ? (
              <p role="alert" className="text-[13px] font-medium text-danger">
                {correcting
                  ? 'Este equipo está dado de baja y ya no admite mantenimientos: el registro no se puede corregir.'
                  : 'Este equipo está dado de baja y ya no admite mantenimientos. Elige otro.'}
              </p>
            ) : correcting && (correcting.plan || correcting.faultId) ? (
              <p className="break-words text-sm text-ink">
                <span className="font-semibold">
                  {correcting.plan ? titleWithKind(work.plan?.title ?? correcting.plan.title, correcting.kind) : kindLabels[correcting.kind]}
                </span>
                {correcting.faultId ? <span className="block text-[13px] text-ink-muted">Atiende un incidente</span> : null}
              </p>
            ) : preselected && work.plan ? (
              <p className="break-words text-sm text-ink">
                <span className="font-semibold">{titleWithKind(work.plan.title, work.plan.kind)}</span>
              </p>
            ) : null
          }
        />
      )}

      {assetInfo && !retired && !preselected && !correcting ? (
        <PlanChoice
          work={work}
          today={today}
          timeZone={timeZone}
          noPlan={noPlan}
          planError={planError}
          onSelectPlan={onSelectPlan}
          onSelectFault={onSelectFault}
          onSelectNoPlan={onSelectNoPlan}
        />
      ) : null}

      {assetInfo && !retired && selectedPlanId === '' && planChosen && chosenFault === '' && !correcting?.plan ? (
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
  );
}
