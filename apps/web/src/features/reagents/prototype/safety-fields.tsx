// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Field, Select, formatDecimal } from '@platlab/ui';
import { Lock } from 'lucide-react';
import { sampleOf, type SdsKind } from './catalog-sample';
import { ControlledMark, isControlled } from './controlled';
import { FilledInput, QuantityInput, fieldGrid, fieldLabel, filled } from './filled';
import { HazardGlyphs, HazardSelect } from './hazards';
import { physicalStateLabel } from '../product-parts';
import type { Draft, Errors } from './wizard-model';

const states = [
  { value: 'solid', label: 'Sólido' },
  { value: 'liquid', label: 'Líquido' },
  { value: 'aqueous', label: 'Acuoso' },
  { value: 'mixture', label: 'Mezcla' },
  { value: 'gas', label: 'Gas' },
];
const sdsLabels: Record<SdsKind, string> = { digital: 'Digital', physical: 'Solo en físico', none: 'No tiene' };
const sdsOptions = (Object.keys(sdsLabels) as SdsKind[]).map((value) => ({ value, label: sdsLabels[value] }));

/**
 * «Clasificación y seguridad». Un reactivo nuevo se clasifica aquí: estado físico, si es controlado,
 * peligros, ficha de seguridad y mínimo. Uno existente ya está clasificado en el catálogo, así que
 * la sección es una sola línea de resumen.
 */
export function SafetyFields({
  existing,
  draft,
  onDraft,
  errors,
}: {
  existing: StockedProduct | null;
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  errors: Errors;
}) {
  if (existing) {
    const sample = sampleOf(existing.casNumber);
    const dot = (
      <span aria-hidden className="text-ink-subtle">
        ·
      </span>
    );
    return (
      <div className="grid gap-1.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-ink">
          <span>{(existing.physicalState && physicalStateLabel[existing.physicalState]) ?? 'Estado sin dato'}</span>
          {sample.hazards.length > 0 ? (
            <>
              {dot}
              <HazardGlyphs ids={sample.hazards} />
            </>
          ) : null}
          {isControlled(existing.code) ? (
            <>
              {dot}
              <ControlledMark withText />
            </>
          ) : null}
          {dot}
          <span>{sample.sds ? `Ficha: ${sdsLabels[sample.sds].toLowerCase()}` : 'Sin ficha'}</span>
          {dot}
          <span>{existing.minimum ? `Mínimo ${formatDecimal(existing.minimum)} ${existing.baseUnit}` : 'Sin mínimo'}</span>
        </p>
        <p className="text-[13px] text-ink-muted">Del catálogo</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className={fieldGrid}>
        <Field label="Estado físico" required labelClassName={fieldLabel} error={errors.state}>
          <Select value={draft.state || undefined} onValueChange={(state) => onDraft({ state })} options={states} placeholder="Elige cómo es" triggerClassName={filled} />
        </Field>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 self-end rounded-control px-1 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action sm:min-h-[36px]">
          <input type="checkbox" className="size-4 shrink-0 accent-action" checked={draft.controlled} onChange={(event) => onDraft({ controlled: event.target.checked })} />
          <Lock className="size-4 shrink-0 text-action" aria-hidden />
          <span className="text-sm font-medium text-ink">
            Controlado <span className="font-normal text-ink-muted">(sujeta a fiscalización)</span>
          </span>
        </label>
      </div>

      <div role="group" aria-labelledby="peligros-legend" className="grid gap-1.5">
        <span id="peligros-legend" className={fieldLabel}>
          Peligros
        </span>
        <HazardSelect value={draft.hazards} onChange={(hazards) => onDraft({ hazards })} />
      </div>

      <div className={fieldGrid}>
        <Field label="Ficha de seguridad" labelClassName={fieldLabel}>
          <Select value={draft.sds || undefined} onValueChange={(sds) => onDraft({ sds: sds as SdsKind })} options={sdsOptions} placeholder="Elige una opción" triggerClassName={filled} />
        </Field>
        <Field label="Mínimo" labelClassName={fieldLabel} error={errors.min} hint="Avisa cuando queden menos existencias.">
          <QuantityInput unit={draft.unit} placeholder="Sin mínimo" value={draft.min} onChange={(event) => onDraft({ min: event.target.value })} />
        </Field>
        {draft.sds === 'digital' ? (
          <Field label="Enlace a la ficha" labelClassName={fieldLabel} error={errors.sdsUrl} hint="El PDF se podrá subir más adelante." className="sm:col-span-2">
            <FilledInput type="url" inputMode="url" autoComplete="off" placeholder="https://" value={draft.sdsUrl} onChange={(event) => onDraft({ sdsUrl: event.target.value })} />
          </Field>
        ) : null}
      </div>
    </div>
  );
}
