import { physicalState, type StockedProduct } from '@platlab/contracts';
import { Field, Select, cn } from '@platlab/ui';
import { Lock, LockOpen } from 'lucide-react';
import { useId } from 'react';
import { ControlledMark } from '../controlled';
import { PillField } from '../pills';
import { HazardGlyphs, HazardSelect } from '../hazards';
import { physicalStateLabel } from '../product-parts';
import { SdsReference, sdsLabels } from '../sds';
import { isVolume } from '../weight';
import { FilledInput, fieldGrid, fieldLabel, filled } from './filled';
import type { Draft, Errors, SdsKind } from './model';

const states = physicalState.options.map((value) => ({ value, label: physicalStateLabel[value] ?? value }));
const sdsOptions = (Object.keys(sdsLabels) as SdsKind[]).map((value) => ({ value, label: sdsLabels[value] }));
const sourceOptions: ReadonlyArray<{ value: Draft['sdsSource']; label: string }> = [
  { value: 'link', label: 'Enlace' },
  { value: 'pdf', label: 'PDF' },
];

/**
 * «Clasificación y seguridad» (ADR 0015): estado físico, si es controlado, peligros y ficha de
 * seguridad; con `withDensity`, también la densidad de los que se miden en volumen. Un reactivo ya del
 * catálogo se resume en una línea: en el ingreso no se edita. La ficha digital es un enlace o un PDF
 * (ADR 0017); `sdsFileUrl` es el PDF vigente de un reactivo que se edita.
 */
export function SafetyFields({
  existing,
  sdsFileUrl = null,
  draft,
  onDraft,
  errors,
  withDensity = false,
  compact = false,
}: {
  existing: StockedProduct | null;
  sdsFileUrl?: string | null;
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  errors: Errors;
  withDensity?: boolean;
  /** En una tarjeta angosta (el ingreso): los campos van en una sola columna. */
  compact?: boolean;
}) {
  const hazardsId = useId();
  const grid = compact ? 'grid gap-3' : fieldGrid;
  if (existing) return <CatalogSummary product={existing} />;

  return (
    <div className="grid gap-3">
      <div className={grid}>
        <PillField
          label="Estado físico"
          required
          labelClassName={fieldLabel}
          className={compact ? '' : 'sm:col-span-2'}
          value={draft.state}
          options={states}
          onChange={(state) => onDraft({ state: physicalState.options.find((entry) => entry === state) ?? '' })}
          error={errors.state}
        />
        <ControlledSwitch checked={draft.controlled} onChange={(controlled) => onDraft({ controlled })} />
      </div>

      <div role="group" aria-labelledby={hazardsId} className="grid gap-1.5">
        <span id={hazardsId} className={fieldLabel}>
          Peligros
        </span>
        <HazardSelect value={draft.hazards} onChange={(hazards) => onDraft({ hazards })} />
      </div>

      <div className={grid}>
        <Field label="Ficha de seguridad" labelClassName={fieldLabel}>
          <Select
            value={draft.sds || undefined}
            onValueChange={(sds) => onDraft({ sds: sdsOptions.find((option) => option.value === sds)?.value ?? '' })}
            options={sdsOptions}
            placeholder="Elige una opción"
            triggerClassName={filled}
          />
        </Field>
        {draft.sds === 'digital' ? (
          <div className="grid gap-3">
            <PillField
              label="Formato de la ficha"
              labelClassName={fieldLabel}
              size="sm"
              value={draft.sdsSource}
              options={sourceOptions}
              onChange={(sdsSource) => onDraft({ sdsSource })}
            />
            {draft.sdsSource === 'link' ? (
              <Field label="Enlace a la ficha" labelClassName={fieldLabel} error={errors.sdsUrl}>
                <FilledInput
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://"
                  value={draft.sdsUrl}
                  onChange={(event) => onDraft({ sdsUrl: event.target.value })}
                />
              </Field>
            ) : (
              <Field
                label={sdsFileUrl ? 'Reemplazar PDF' : 'PDF de la ficha'}
                labelClassName={fieldLabel}
                error={errors.sdsFile}
                hint={sdsFileUrl ? <CurrentPdf url={sdsFileUrl} /> : 'Hasta 6 MiB.'}
              >
                <FilledInput
                  type="file"
                  accept="application/pdf"
                  className="cursor-pointer py-2 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-action"
                  onChange={(event) => onDraft({ sdsFile: event.target.files?.[0] ?? null })}
                />
              </Field>
            )}
          </div>
        ) : null}
        {withDensity && isVolume(draft.unit) ? (
          <Field label="Densidad (g/mL)" labelClassName={fieldLabel} error={errors.density} hint="Para pesar los frascos en la balanza.">
            <FilledInput
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
              placeholder="0,789"
              value={draft.density}
              onChange={(event) => onDraft({ density: event.target.value })}
            />
          </Field>
        ) : null}
      </div>
    </div>
  );
}

/** El PDF vigente de la ficha, en una pestaña nueva. */
function CurrentPdf({ url }: { url: string }) {
  return (
    <>
      PDF vigente ·{' '}
      <a href={url} target="_blank" rel="noreferrer" className="font-medium text-action hover:text-action-hover">
        Ver
      </a>
    </>
  );
}

/** Lo que el catálogo ya dice de un reactivo, en una línea: estado, peligros, si es controlado y su ficha. */
function CatalogSummary({ product }: { product: StockedProduct }) {
  // Sin separadores: cada dato es un elemento con su espacio, y al envolver no queda ninguno suelto.
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink">
        <span>{(product.physicalState && physicalStateLabel[product.physicalState]) ?? 'Estado sin indicar'}</span>
        {product.hazards.length > 0 ? <HazardGlyphs ids={product.hazards} /> : null}
        {product.controlled ? <ControlledMark withText /> : null}
        <SdsReference kind={product.sdsKind} url={product.sdsFileUrl ?? product.sdsUrl} />
      </div>
      <p className="text-[13px] text-ink-muted">Del catálogo</p>
    </div>
  );
}

/** «Controlado» como interruptor con candado; el estado se lee en el texto, no solo en el color de la pista. */
function ControlledSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const labelId = useId();
  return (
    <div className="grid content-start gap-1.5">
      <span id={labelId} className={fieldLabel}>
        Controlado
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={() => onChange(!checked)}
        className={cn(
          filled,
          'flex w-full items-center gap-2 rounded-control border px-3 text-left text-sm transition-colors duration-150 hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
        )}
      >
        {checked ? <Lock className="size-4 shrink-0 text-action" aria-hidden /> : <LockOpen className="size-4 shrink-0 text-ink-muted" aria-hidden />}
        <span className="min-w-0 flex-1 text-ink">{checked ? 'Controlado' : 'No controlado'}</span>
        <span aria-hidden className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none', checked ? 'bg-action' : 'bg-line-strong')}>
          <span
            className={cn(
              'absolute left-0.5 top-0.5 size-4 rounded-full bg-surface shadow-sm transition-transform duration-150 ease-out-expo motion-reduce:transition-none',
              checked && 'translate-x-4',
            )}
          />
        </span>
      </button>
    </div>
  );
}
