import { physicalState, type StockedProduct } from '@platlab/contracts';
import { Field, Select, cn } from '@platlab/ui';
import { Lock } from 'lucide-react';
import { useId } from 'react';
import { ControlledMark } from '../controlled';
import { HazardGlyphs, HazardSelect } from '../hazards';
import { physicalStateLabel } from '../product-parts';
import { isVolume } from '../weight';
import { FilledInput, fieldGrid, fieldLabel, filled } from './filled';
import type { Draft, Errors, SdsKind } from './model';

const states = physicalState.options.map((value) => ({ value, label: physicalStateLabel[value] ?? value }));
export const sdsLabels: Record<SdsKind, string> = { digital: 'Digital', physical: 'Solo en físico', none: 'No tiene' };
const sdsOptions = (Object.keys(sdsLabels) as SdsKind[]).map((value) => ({ value, label: sdsLabels[value] }));

/**
 * «Clasificación y seguridad» (ADR 0015): estado físico, si es controlado, peligros y ficha de
 * seguridad; con `withDensity`, también la densidad de los que se miden en volumen. Un reactivo ya del
 * catálogo se resume en una línea: en el ingreso no se edita.
 */
export function SafetyFields({
  existing,
  draft,
  onDraft,
  errors,
  withDensity = false,
}: {
  existing: StockedProduct | null;
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  errors: Errors;
  withDensity?: boolean;
}) {
  const hazardsId = useId();
  if (existing) return <CatalogSummary product={existing} />;

  return (
    <div className="grid gap-3">
      <div className={fieldGrid}>
        <Field label="Estado físico" required labelClassName={fieldLabel} error={errors.state}>
          <Select
            value={draft.state || undefined}
            onValueChange={(state) => onDraft({ state: physicalState.options.find((entry) => entry === state) ?? '' })}
            options={states}
            placeholder="Elige cómo es"
            triggerClassName={filled}
          />
        </Field>
        <ControlledSwitch checked={draft.controlled} onChange={(controlled) => onDraft({ controlled })} />
      </div>

      <div role="group" aria-labelledby={hazardsId} className="grid gap-1.5">
        <span id={hazardsId} className={fieldLabel}>
          Peligros
        </span>
        <HazardSelect value={draft.hazards} onChange={(hazards) => onDraft({ hazards })} />
      </div>

      <div className={fieldGrid}>
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
          <Field label="Enlace a la ficha" labelClassName={fieldLabel} error={errors.sdsUrl} hint="El PDF se podrá subir más adelante.">
            <FilledInput
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              value={draft.sdsUrl}
              onChange={(event) => onDraft({ sdsUrl: event.target.value })}
            />
          </Field>
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

/** Lo que el catálogo ya dice de un reactivo, en una línea: estado, peligros, si es controlado y su ficha. */
function CatalogSummary({ product }: { product: StockedProduct }) {
  const dot = (
    <span aria-hidden className="text-ink-subtle">
      ·
    </span>
  );
  return (
    <div className="grid gap-1.5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-ink">
        <span>{(product.physicalState && physicalStateLabel[product.physicalState]) ?? 'Estado sin indicar'}</span>
        {product.hazards.length > 0 ? (
          <>
            {dot}
            <HazardGlyphs ids={product.hazards} />
          </>
        ) : null}
        {product.controlled ? (
          <>
            {dot}
            <ControlledMark withText />
          </>
        ) : null}
        {dot}
        <span>{product.sdsKind ? `Ficha de seguridad: ${sdsLabels[product.sdsKind].toLowerCase()}` : 'Ficha de seguridad sin indicar'}</span>
      </p>
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
        <Lock className="size-4 shrink-0 text-action" aria-hidden />
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
