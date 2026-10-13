// Prototipo R-01D: solo interfaz
import { Input, cn } from '@platlab/ui';
import { Check, Minus, Plus } from 'lucide-react';
import type { RefObject } from 'react';
import { LocationPicker } from './location-picker';
import { MAX_BOTTLES, countOf, countValid, type BottlesForm, type Errors, type Place } from './wizard-model';

const stepper =
  'inline-flex size-[44px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink transition-colors duration-150 hover:bg-surface-sunken disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:size-10';

/**
 * Paso 2, «Frascos»: la cantidad se lee como una frase («Llegaron [− 3 +] frascos de [500] mL»), la
 * ubicación se escribe y la caducidad es una fecha o «La etiqueta no lo indica». Se puede terminar aquí.
 */
export function StepBottles({
  form,
  onForm,
  unit,
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
  const bottles = count === 1 ? 'frasco' : 'frascos';

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="grid gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-ink">¿Cuántos frascos llegaron?</h3>
        <p className="text-sm text-ink-muted">Cada frasco recibirá su propio código y su QR.</p>
      </header>

      <div className="grid gap-2">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-3 text-lg text-ink">
          <span>Llegaron</span>
          <span className="inline-flex items-center gap-2">
            <button type="button" aria-label="Un frasco menos" disabled={(count ?? 1) <= 1} onClick={() => step(-1)} className={stepper}>
              <Minus className="size-4" aria-hidden />
            </button>
            <input
              aria-label="Número de frascos"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={errors.count ? true : undefined}
              className="h-[44px] w-16 rounded-control border border-line-strong bg-surface text-center text-lg font-bold tabular-nums text-ink focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20 aria-[invalid=true]:border-danger sm:h-10"
              value={form.count}
              onChange={(event) => onForm({ count: event.target.value })}
            />
            <button type="button" aria-label="Un frasco más" disabled={(count ?? 1) >= MAX_BOTTLES} onClick={() => step(1)} className={stepper}>
              <Plus className="size-4" aria-hidden />
            </button>
          </span>
          <span>{bottles} de</span>
          <span className="inline-flex items-center gap-2">
            <Input
              ref={quantityRef}
              aria-label="Cantidad por frasco"
              inputMode="decimal"
              autoComplete="off"
              placeholder="500"
              className="h-[44px] w-28 text-center text-lg font-bold tabular-nums sm:h-10"
              value={form.quantity}
              onChange={(event) => onForm({ quantity: event.target.value })}
            />
            <span className="font-medium text-ink-muted">{unit || 'unidad'}</span>
          </span>
        </p>
        {errors.count ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {errors.count}
          </p>
        ) : null}
        {errors.quantity ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {errors.quantity}
          </p>
        ) : null}
        {countValid(count) && count > 1 ? (
          <p className="text-[13px] text-ink-muted">Se crearán {count} frascos iguales.</p>
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

      <div className="grid gap-2">
        <label htmlFor="caducidad" className="text-base font-semibold text-ink">
          ¿Cuándo caducan?
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="caducidad"
            type="date"
            disabled={form.noExpiry}
            className="h-[44px] w-48 sm:h-10"
            value={form.expiresOn}
            onChange={(event) => onForm({ expiresOn: event.target.value })}
          />
          <button
            type="button"
            aria-pressed={form.noExpiry}
            onClick={() => onForm({ noExpiry: !form.noExpiry, expiresOn: form.noExpiry ? form.expiresOn : '' })}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-9',
              form.noExpiry ? 'border-action/40 bg-action-soft text-action' : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink',
            )}
          >
            {form.noExpiry ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
            La etiqueta no lo indica
          </button>
        </div>
        {form.noExpiry ? <p className="text-[13px] text-ink-muted">Quedará como «caducidad sin confirmar».</p> : null}
      </div>
    </div>
  );
}
