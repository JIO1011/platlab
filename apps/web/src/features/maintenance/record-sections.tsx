import { conservationLabel } from '@platlab/contracts';
import { Field, Input, OptionRow, Select, Textarea, normalizeDecimalInput } from '@platlab/ui';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { PillField } from '../../app/pills';
import { CertificateField } from './certificate-field';
import { ResultChoice } from './result-choice';
import { useProviders } from './queries';
import type { RecordWork } from './use-record-work';

const INTERNAL = 'internal';
const NEW_PROVIDER = '__new-provider';
const conservationOptions = (['good', 'fair', 'poor'] as const).map((value) => ({ value, label: conservationLabel[value] }));

type RecordFormApi = RecordWork['form'];

/** «Motivo de la corrección»: solo al corregir un registro, con el aviso de lo que no se revierte. */
export function ReasonSection({ form }: { form: RecordFormApi }) {
  return (
    <>
      <Field label="Motivo de la corrección" required error={form.formState.errors.reason?.message}>
        <Textarea rows={3} maxLength={500} {...form.register('reason')} />
      </Field>
      <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
        Lo que el registro anterior aplicó en Equipos (estado físico, incidente solucionado) no cambia: corrígelo en Equipos.
      </p>
    </>
  );
}

/** «Fecha» y, en calibración y verificación, «Válida hasta» (no puede ser anterior a la fecha). */
export function DateSection({ form, today, showValidity }: { form: RecordFormApi; today: string; showValidity: boolean }) {
  const errors = form.formState.errors;
  const performedOn = form.watch('performedOn');
  return (
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
  );
}

/** «Lista de verificación» y criterio de aceptación del plan elegido; nada si el plan no los tiene. */
export function ChecklistSection({ work }: { work: RecordWork }) {
  const { form, plan } = work;
  const checklist = form.watch('checklist');
  if (!plan || (plan.checklist.length === 0 && !plan.acceptanceCriteria)) return null;
  return (
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
      {plan.acceptanceCriteria ? (
        <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink">
          <span className="block text-[13px] font-semibold text-ink-muted">Criterio de aceptación</span>
          <span className="whitespace-pre-line break-words">{plan.acceptanceCriteria}</span>
        </p>
      ) : null}
      {plan.checklist.length > 0 ? (
        <div className="grid gap-0.5 rounded-xl border border-line bg-white/60 p-1">
          {plan.checklist.map((item, index) => (
            <OptionRow
              key={`${index}-${item}`}
              checked={checklist[index] ?? false}
              onChange={(event) =>
                form.setValue(
                  'checklist',
                  plan.checklist.map((_, position) => (position === index ? event.target.checked : (checklist[position] ?? false))),
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
  );
}

/**
 * El resultado en tres botones, lo que se hizo o encontró (obligatorio en un correctivo y con resultado distinto de
 * Conforme) y, si se atiende un incidente, si se soluciona y si el equipo vuelve a Operativo.
 */
export function ResultSection({ work, corrective }: { work: RecordWork; corrective: boolean }) {
  const { form } = work;
  const errors = form.formState.errors;
  const result = form.watch('result');
  const chosenFault = form.watch('faultId');
  const resolveFault = form.watch('resolveFault');
  const returnToOperational = form.watch('returnToOperational');
  return (
    <>
      <ResultChoice
        value={result}
        onChange={(value) => {
          form.setValue('result', value, { shouldDirty: true });
          form.clearErrors(['result', 'observations']);
        }}
        error={errors.result?.message}
        hint={result === 'fail' ? 'Seguirá por hacer hasta que se registre uno Conforme.' : undefined}
      />
      {corrective || (result !== '' && result !== 'pass') ? (
        <Field
          label={corrective ? 'Qué se hizo' : 'Observaciones'}
          required
          hint={
            result === 'fail'
              ? corrective
                ? 'Qué se hizo y qué hace falta para corregirlo.'
                : 'Qué falló y qué hace falta para corregirlo.'
              : corrective
                ? undefined
                : 'Qué encontraste o qué conviene vigilar.'
          }
          error={errors.observations?.message}
        >
          <Textarea rows={3} maxLength={2000} {...form.register('observations')} />
        </Field>
      ) : null}
      {chosenFault !== '' && !work.correcting ? (
        result === 'fail' ? (
          <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">Con No conforme, el incidente sigue abierto.</p>
        ) : (
          <div className="grid gap-1">
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium text-ink">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-action"
                checked={resolveFault}
                onChange={(event) => form.setValue('resolveFault', event.target.checked, { shouldDirty: true })}
              />
              <span>
                Solucionar el incidente
                <span className="block text-[13px] font-normal text-ink-muted">Queda solucionado con lo que escribiste en «Qué se hizo».</span>
              </span>
            </label>
            {resolveFault && work.canReturn ? (
              <label className="ml-8 flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 cursor-pointer accent-action"
                  checked={returnToOperational}
                  onChange={(event) => form.setValue('returnToOperational', event.target.checked, { shouldDirty: true })}
                />
                <span>El equipo vuelve a Operativo</span>
              </label>
            ) : null}
          </div>
        )
      ) : null}
    </>
  );
}

/** «Lo hizo»: personal interno o un proveedor; con permiso, «+ Nuevo proveedor» pide abrir su hoja a la hoja madre. */
export function ProviderField({
  form,
  workspaceId,
  canCreate,
  onNewProvider,
}: {
  form: RecordFormApi;
  workspaceId: string;
  canCreate: boolean;
  onNewProvider: () => void;
}) {
  const providers = useProviders(workspaceId);
  const providerId = form.watch('providerId');
  return (
    <Field label="Lo hizo" error={form.formState.errors.providerId?.message}>
      <Select
        value={providerId === '' ? INTERNAL : providerId}
        onValueChange={(value) => {
          if (value === NEW_PROVIDER) onNewProvider();
          else form.setValue('providerId', value === INTERNAL ? '' : value, { shouldDirty: true });
        }}
        placeholder="Interno"
        triggerClassName="h-11 sm:h-10"
        options={[
          { value: INTERNAL, label: 'Interno' },
          ...(providers.data?.items ?? []).map((provider) => ({ value: provider.id, label: provider.name })),
          ...(canCreate ? [{ value: NEW_PROVIDER, label: '+ Nuevo proveedor' }] : []),
        ]}
      />
    </Field>
  );
}

/**
 * «Más datos», plegado: costo, estado físico y certificado. La hoja decide si está abierto (un error en un dato
 * plegado lo abre) y guarda el error del archivo.
 */
export function ExtraSection({
  work,
  expanded,
  onExpandedChange,
  fileError,
  onFileChange,
}: {
  work: RecordWork;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  fileError: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const { form, correcting } = work;
  const assetInfo = work.asset.data?.asset;
  const conservation = form.watch('conservation');
  // Al corregir, el costo empieza con el del registro (cadena decimal: coma en pantalla, punto en el contrato).
  const [costText, setCostText] = useState(() => correcting?.cost?.replace('.', ',') ?? '');
  return (
    <details open={expanded} onToggle={(event) => onExpandedChange(event.currentTarget.open)} className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">Más datos</span>
          <span className="block text-[13px] text-ink-muted">Costo, estado físico y certificado. Todo es opcional.</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-4 grid gap-4">
        <Field label="Costo" optional error={form.formState.errors.cost?.message}>
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
        {correcting?.certificate && work.file === null ? (
          <p className="flex flex-wrap items-center gap-x-3 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink">
            <span>Se conserva el certificado del registro anterior.</span>
            <a
              href={correcting.certificate.url}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center font-semibold text-action underline-offset-2 hover:underline sm:min-h-8"
            >
              Ver<span className="sr-only"> el certificado (PDF, se abre en otra pestaña)</span>
            </a>
          </p>
        ) : null}
        <CertificateField
          file={work.file}
          onChange={onFileChange}
          error={fileError}
          {...(correcting?.certificate ? { label: 'Reemplazar el certificado (PDF)' } : {})}
        />
      </div>
    </details>
  );
}
