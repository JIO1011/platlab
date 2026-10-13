// Prototipo R-01D: solo interfaz
import { Field, Input, cn } from '@platlab/ui';
import { Minus, Plus } from 'lucide-react';
import type { RefObject } from 'react';
import { LocationPicker } from './location-picker';
import { MAX_BOTTLES, countOf, countValid, sampleCode, type BottlesForm, type Errors, type Place } from './wizard-model';

const stepper =
  'inline-flex size-[44px] shrink-0 items-center justify-center rounded-control border border-line-strong bg-surface text-ink transition-colors duration-150 hover:bg-surface-sunken disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:size-9';
const label = 'text-[13px] font-semibold';

/**
 * Campos de «Frascos»: cantidad por frasco con su unidad, número de frascos con − y +, ubicación y
 * caducidad. Debajo, lo que se va a crear («Se crearán 3 frascos con su QR: HEXA-2026-01 … 03»).
 */
export function BottlesFields({
  form,
  onForm,
  unit,
  name,
  errors,
  places,
  recentPlaces,
  canCreatePlace,
  onCreatePlace,
  quantityRef,
  placeRef,
}: {
  form: BottlesForm;
  onForm: (patch: Partial<BottlesForm>) => void;
  unit: string;
  name: string;
  errors: Errors;
  places: Place[];
  recentPlaces: Place[];
  canCreatePlace: boolean;
  onCreatePlace: (name: string, parentId: string) => void;
  quantityRef: RefObject<HTMLInputElement | null>;
  placeRef: RefObject<HTMLInputElement | null>;
}) {
  const count = countOf(form.count);
  const step = (delta: number) => onForm({ count: String(Math.min(MAX_BOTTLES, Math.max(1, (count ?? 1) + delta))) });
  const first = sampleCode(name, 0);
  const last = countValid(count) ? sampleCode(name, count - 1) : first;
  const codes = !countValid(count) ? null : count === 1 ? first : count === 2 ? `${first} y ${last}` : `${first} … ${last.slice(-2)}`;

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cantidad por frasco" required labelClassName={label} error={errors.quantity}>
          <div className="flex items-center gap-2">
            <Input
              ref={quantityRef}
              inputMode="decimal"
              autoComplete="off"
              placeholder="500"
              className="min-w-0 flex-1 tabular-nums max-sm:h-[44px] sm:h-9"
              value={form.quantity}
              onChange={(event) => onForm({ quantity: event.target.value })}
            />
            <span className="w-8 shrink-0 text-sm font-medium text-ink-muted">{unit}</span>
          </div>
        </Field>

        <div className="grid content-start gap-1.5">
          <span id="count-label" className={cn(label, 'text-ink')}>
            N.º de frascos
            <span aria-hidden className="ml-0.5">
              *
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Un frasco menos" disabled={(count ?? 1) <= 1} onClick={() => step(-1)} className={stepper}>
              <Minus className="size-4" aria-hidden />
            </button>
            <input
              aria-labelledby="count-label"
              aria-required
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={errors.count ? true : undefined}
              className="h-[44px] w-14 rounded-control border border-line-strong bg-surface text-center text-sm font-bold tabular-nums text-ink focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20 aria-[invalid=true]:border-danger sm:h-9"
              value={form.count}
              onChange={(event) => onForm({ count: event.target.value })}
            />
            <button type="button" aria-label="Un frasco más" disabled={(count ?? 1) >= MAX_BOTTLES} onClick={() => step(1)} className={stepper}>
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          {errors.count ? (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {errors.count}
            </p>
          ) : null}
        </div>

        <LocationPicker
          places={places}
          recents={recentPlaces}
          value={form.placeId}
          onChange={(placeId) => {
            onForm({ placeId });
            // Elegida la ubicación, lo siguiente es la caducidad.
            if (placeId) requestAnimationFrame(() => document.getElementById('caducidad')?.focus());
          }}
          canCreate={canCreatePlace}
          onCreate={onCreatePlace}
          error={errors.placeId}
          inputRef={placeRef}
        />

        <div className="grid content-start gap-1.5">
          <label htmlFor="caducidad" className={cn(label, 'text-ink')}>
            Caducidad
          </label>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Input
              id="caducidad"
              type="date"
              disabled={form.noExpiry}
              className="w-40 max-sm:h-[44px] sm:h-9"
              value={form.expiresOn}
              onChange={(event) => onForm({ expiresOn: event.target.value })}
            />
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px] font-medium text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action sm:min-h-9">
              <input
                type="checkbox"
                aria-label="No indica la caducidad en la etiqueta"
                className="size-4 accent-action"
                checked={form.noExpiry}
                onChange={(event) => onForm({ noExpiry: event.target.checked, expiresOn: event.target.checked ? '' : form.expiresOn })}
              />
              No indica
            </label>
          </div>
          {form.noExpiry ? <p className="text-[13px] text-ink-muted">Quedará como «caducidad sin confirmar».</p> : null}
        </div>
      </div>

      {codes ? (
        <p className="rounded-control bg-surface-sunken px-3 py-2 text-[13px] text-ink-muted" role="status">
          Se {count === 1 ? 'creará 1 frasco' : `crearán ${count} frascos`} con su QR: <span className="font-medium tabular-nums text-ink">{codes}</span>
        </p>
      ) : null}
    </div>
  );
}
