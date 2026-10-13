// Prototipo R-01D: solo interfaz
import { Field, Input } from '@platlab/ui';
import { CircleCheck, Lock } from 'lucide-react';
import { useState, type RefObject } from 'react';
import { checkCas } from './cas';
import type { SdsKind } from './catalog-sample';
import { Disclosure } from './form-section';
import { HazardPicker } from './hazards';
import { RadioPills } from './radio-pills';
import type { Draft, Errors } from './wizard-model';

const units = ['g', 'kg', 'mL', 'L'].map((value) => ({ value, label: value }));
const states = [
  { value: 'solid', label: 'Sólido' },
  { value: 'liquid', label: 'Líquido' },
  { value: 'aqueous', label: 'Acuoso' },
  { value: 'mixture', label: 'Mezcla' },
  { value: 'gas', label: 'Gas' },
];
const sdsOptions: Array<{ value: SdsKind; label: string }> = [
  { value: 'digital', label: 'Digital' },
  { value: 'physical', label: 'Solo en físico' },
  { value: 'none', label: 'No tiene' },
];
const label = 'text-[13px] font-semibold';

/**
 * Campos de «Reactivo» cuando es nuevo: nombre y CAS en una cuadrícula, unidad y estado como
 * segmentados pequeños, la casilla de sustancia controlada y, plegada, la seguridad (opcional).
 */
export function NewProductFields({
  draft,
  onDraft,
  errors,
  nameRef,
  securityOpen,
  onSecurityToggle,
}: {
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  errors: Errors;
  nameRef: RefObject<HTMLInputElement | null>;
  securityOpen: boolean;
  onSecurityToggle: () => void;
}) {
  const [casTouched, setCasTouched] = useState(false);
  const cas = checkCas(draft.cas);
  const casMessage = cas === 'valid' ? 'valid' : cas === 'invalid' || (cas === 'partial' && casTouched) ? 'invalid' : null;
  const input = 'max-sm:h-[44px] sm:h-9';

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[3fr_2fr]">
        <Field label="Nombre" required labelClassName={label} error={errors.name}>
          <Input ref={nameRef} autoComplete="off" className={input} value={draft.name} onChange={(event) => onDraft({ name: event.target.value })} />
        </Field>
        <Field
          label="CAS"
          optional
          labelClassName={label}
          error={errors.cas}
          hint={
            casMessage === 'valid' ? (
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <CircleCheck className="size-3.5" aria-hidden />
                CAS válido
              </span>
            ) : casMessage === 'invalid' ? (
              <span className="font-medium text-danger">Revisa el CAS</span>
            ) : undefined
          }
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="7647-14-5"
            className={`tabular-nums ${input}`}
            value={draft.cas}
            onBlur={() => setCasTouched(true)}
            onChange={(event) => onDraft({ cas: event.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-x-6">
        <RadioPills legend="Unidad" required value={draft.unit} options={units} onChange={(unit) => onDraft({ unit })} error={errors.unit} />
        <RadioPills legend="Estado" required value={draft.state} options={states} onChange={(state) => onDraft({ state })} error={errors.state} />
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-control px-1 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action sm:min-h-9">
        <input type="checkbox" className="size-4 shrink-0 accent-action" checked={draft.controlled} onChange={(event) => onDraft({ controlled: event.target.checked })} />
        <Lock className="size-4 shrink-0 text-action" aria-hidden />
        <span className="text-sm font-medium text-ink">
          Controlado <span className="font-normal text-ink-muted">(sujeta a fiscalización)</span>
        </span>
      </label>

      <Disclosure title="Seguridad" badge="Opcional" hint="Peligros y ficha" open={securityOpen} onToggle={onSecurityToggle}>
        <div className="grid gap-1.5">
          <span id="peligros-legend" className="text-[13px] font-semibold text-ink">
            Peligros
          </span>
          <div role="group" aria-labelledby="peligros-legend">
            <HazardPicker value={draft.hazards} onChange={(next) => onDraft({ hazards: next })} />
          </div>
        </div>
        <RadioPills<SdsKind> legend="Ficha de seguridad" value={draft.sds} options={sdsOptions} onChange={(sds) => onDraft({ sds })} />
        {draft.sds === 'digital' ? (
          <Field label="Enlace a la ficha" optional labelClassName={label} error={errors.sdsUrl} hint="El PDF se podrá subir más adelante.">
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              className={input}
              value={draft.sdsUrl}
              onChange={(event) => onDraft({ sdsUrl: event.target.value })}
            />
          </Field>
        ) : null}
      </Disclosure>
    </div>
  );
}
