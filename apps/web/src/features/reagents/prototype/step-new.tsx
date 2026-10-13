// Prototipo R-01D: solo interfaz
import { Field, Input, cn } from '@platlab/ui';
import { Blend, Box, CircleCheck, Droplet, GlassWater, Lock, Scale, Wind, Waves, Weight } from 'lucide-react';
import { useState, type RefObject } from 'react';
import { checkCas } from './cas';
import type { SdsKind } from './catalog-sample';
import { HazardPicker } from './hazards';
import { RadioPills } from './radio-pills';
import { TileChoice, type TileOption } from './tile-choice';
import type { Draft, Errors } from './wizard-model';

const units: Array<TileOption<string>> = [
  { value: 'g', label: 'Gramos', detail: 'g', icon: Scale },
  { value: 'kg', label: 'Kilos', detail: 'kg', icon: Weight },
  { value: 'mL', label: 'Mililitros', detail: 'mL', icon: Droplet },
  { value: 'L', label: 'Litros', detail: 'L', icon: GlassWater },
];
const states: Array<TileOption<string>> = [
  { value: 'solid', label: 'Sólido', icon: Box },
  { value: 'liquid', label: 'Líquido', icon: Droplet },
  { value: 'aqueous', label: 'Acuoso', icon: Waves },
  { value: 'mixture', label: 'Mezcla', icon: Blend },
  { value: 'gas', label: 'Gas', icon: Wind },
];
const sdsOptions: Array<{ value: SdsKind; label: string }> = [
  { value: 'digital', label: 'Digital' },
  { value: 'physical', label: 'Solo en físico' },
  { value: 'none', label: 'No tiene' },
];

/**
 * Paso 1b, solo si el reactivo es nuevo: «Cuéntanos del reactivo». Mosaicos grandes para la unidad y
 * el estado, el interruptor de sustancia controlada y, al final y sin prisa, la seguridad.
 */
export function StepNew({
  draft,
  onDraft,
  errors,
  nameRef,
}: {
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  errors: Errors;
  nameRef: RefObject<HTMLInputElement | null>;
}) {
  const [casTouched, setCasTouched] = useState(false);
  const cas = checkCas(draft.cas);
  const casMessage = cas === 'valid' ? 'valid' : cas === 'invalid' || (cas === 'partial' && casTouched) ? 'invalid' : null;

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="grid gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-ink">Cuéntanos del reactivo</h3>
        <p className="text-sm text-ink-muted">Con esto queda en el catálogo y no tendrás que volver a escribirlo.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
        <Field label="Nombre" error={errors.name}>
          <Input ref={nameRef} autoComplete="off" className="max-sm:h-[44px]" value={draft.name} onChange={(event) => onDraft({ name: event.target.value })} />
        </Field>
        <Field
          label="CAS"
          optional
          error={errors.cas}
          hint={
            casMessage === 'valid' ? (
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <CircleCheck className="size-3.5" aria-hidden />
                CAS válido
              </span>
            ) : casMessage === 'invalid' ? (
              <span className="font-medium text-danger">Revisa el CAS</span>
            ) : (
              'Por ejemplo, 7647-14-5.'
            )
          }
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            className="tabular-nums max-sm:h-[44px]"
            value={draft.cas}
            onBlur={() => setCasTouched(true)}
            onChange={(event) => onDraft({ cas: event.target.value })}
          />
        </Field>
      </div>

      <TileChoice legend="¿Cómo se mide?" columns="grid-cols-2 sm:grid-cols-4" value={draft.unit} options={units} onChange={(unit) => onDraft({ unit })} error={errors.unit} />
      <TileChoice legend="¿Cómo es?" columns="grid-cols-3 sm:grid-cols-5" value={draft.state} options={states} onChange={(state) => onDraft({ state })} error={errors.state} />

      <div className="grid gap-2">
        <span id="controlled-label" className="text-base font-semibold text-ink">
          ¿Es una sustancia controlada?
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={draft.controlled}
          aria-labelledby="controlled-label controlled-help"
          onClick={() => onDraft({ controlled: !draft.controlled })}
          className={cn(
            'flex min-h-[68px] w-full items-center gap-3 rounded-panel border px-4 py-3 text-left transition-[background-color,border-color] duration-150 ease-out-expo',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
            draft.controlled ? 'border-action bg-action-soft' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-sunken',
          )}
        >
          <Lock className={cn('size-6 shrink-0', draft.controlled ? 'text-action' : 'text-ink-muted')} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">{draft.controlled ? 'Sí, es controlada' : 'No es controlada'}</span>
            <span id="controlled-help" className="block text-[13px] text-ink-muted">
              Sujeta a fiscalización: sus movimientos se reportan.
            </span>
          </span>
          <span
            aria-hidden
            className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 ease-out-expo', draft.controlled ? 'bg-action' : 'bg-line-strong')}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 size-6 rounded-full bg-surface shadow-sm transition-transform duration-150 ease-out-expo',
                draft.controlled && 'translate-x-5',
              )}
            />
          </span>
        </button>
      </div>

      <section aria-labelledby="seguridad" className="grid gap-3 rounded-panel bg-surface-sunken/60 p-4">
        <h4 id="seguridad" className="text-sm font-semibold text-ink">
          Seguridad <span className="font-normal text-ink-muted">· puedes completarlo después</span>
        </h4>
        <div className="grid gap-2">
          <span id="peligros-legend" className="text-sm font-medium text-ink">
            Peligros
          </span>
          <div role="group" aria-labelledby="peligros-legend">
            <HazardPicker value={draft.hazards} onChange={(next) => onDraft({ hazards: next })} />
          </div>
        </div>
        <RadioPills<SdsKind> legend="Ficha de seguridad" value={draft.sds} options={sdsOptions} onChange={(sds) => onDraft({ sds })} />
        {draft.sds === 'digital' ? (
          <Field label="Enlace a la ficha" optional error={errors.sdsUrl} hint="El PDF se podrá subir más adelante.">
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              className="max-sm:h-[44px]"
              value={draft.sdsUrl}
              onChange={(event) => onDraft({ sdsUrl: event.target.value })}
            />
          </Field>
        ) : null}
      </section>
    </div>
  );
}
