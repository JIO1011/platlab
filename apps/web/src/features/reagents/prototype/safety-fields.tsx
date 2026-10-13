// Prototipo R-01D: solo interfaz
import type { StockedProduct } from '@platlab/contracts';
import { Field, Select, cn } from '@platlab/ui';
import { Lock } from 'lucide-react';
import { sampleOf, type SdsKind } from './catalog-sample';
import { ControlledMark, isControlled } from './controlled';
import { FilledInput, fieldGrid, fieldLabel, filled } from './filled';
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
 * peligros y ficha de seguridad. Uno existente ya está clasificado en el catálogo, así que
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
        <ControlledSwitch checked={draft.controlled} onChange={(controlled) => onDraft({ controlled })} />
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
        {draft.sds === 'digital' ? (
          <Field label="Enlace a la ficha" labelClassName={fieldLabel} error={errors.sdsUrl} hint="El PDF se podrá subir más adelante.">
            <FilledInput type="url" inputMode="url" autoComplete="off" placeholder="https://" value={draft.sdsUrl} onChange={(event) => onDraft({ sdsUrl: event.target.value })} />
          </Field>
        ) : null}
      </div>
    </div>
  );
}

/**
 * «Controlado» como interruptor con candado, en un campo relleno como los demás. El estado se lee
 * en el texto («Sujeto a fiscalización» o «No controlado»), no solo en el color de la pista.
 */
function ControlledSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="grid content-start gap-1.5">
      <span id="controlado-label" className={fieldLabel}>
        Controlado
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby="controlado-label"
        onClick={() => onChange(!checked)}
        className={cn(filled, 'flex w-full items-center gap-2 rounded-control border px-3 text-left text-sm transition-colors duration-150 hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action')}
      >
        <Lock className="size-4 shrink-0 text-action" aria-hidden />
        <span className="min-w-0 flex-1 text-ink">{checked ? 'Sujeto a fiscalización' : 'No controlado'}</span>
        <span aria-hidden className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none', checked ? 'bg-action' : 'bg-line-strong')}>
          <span className={cn('absolute left-0.5 top-0.5 size-4 rounded-full bg-surface shadow-sm transition-transform duration-150 ease-out-expo motion-reduce:transition-none', checked && 'translate-x-4')} />
        </span>
      </button>
    </div>
  );
}
