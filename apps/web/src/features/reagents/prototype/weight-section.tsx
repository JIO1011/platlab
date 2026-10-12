// Prototipo R-01D: solo interfaz
import { Field, Input, cn, formatDecimal } from '@platlab/ui';
import { ChevronDown, Scale } from 'lucide-react';
import { useId } from 'react';
import type { ReceiptWeight } from './weight';

/**
 * Control por peso (opcional, plegable): con el peso del frasco lleno se calcula la tara, y con ella
 * se podrá comparar el saldo con la balanza. Abierto, pide el peso y, solo en volúmenes sin
 * densidad conocida, la densidad.
 */
export function WeightSection({
  open,
  onToggle,
  full,
  onFull,
  density,
  onDensity,
  knownDensity,
  result,
}: {
  open: boolean;
  onToggle: () => void;
  full: string;
  onFull: (value: string) => void;
  density: string;
  onDensity: (value: string) => void;
  knownDensity: string | null;
  result: ReceiptWeight;
}) {
  const panel = useId();
  const weightError = result.error && !result.error.includes('densidad') ? result.error : undefined;
  const densityError = result.error?.includes('densidad') ? result.error : undefined;
  return (
    <div className="rounded-panel border border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={onToggle}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-panel px-4 py-2 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-12"
      >
        <Scale className="size-4 shrink-0 text-ink-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">
            Control por peso <span className="font-normal text-ink-subtle">(opcional)</span>
          </span>
          <span className="block text-[13px] text-ink-muted">Permite comprobar el saldo de cada frasco con la balanza.</span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-out-expo', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <div id={panel} className="grid gap-4 border-t border-line px-4 py-4">
          <div className={cn('grid gap-4', result.needsDensity && 'sm:grid-cols-2')}>
            <Field label="Peso del frasco lleno (g)" error={weightError}>
              <Input
                inputMode="decimal"
                autoComplete="off"
                className="tabular-nums max-sm:h-[44px]"
                value={full}
                onChange={(event) => onFull(event.target.value)}
              />
            </Field>
            {result.needsDensity ? (
              <Field label="Densidad (g/mL)" error={densityError} hint="Del rótulo o de la ficha de seguridad.">
                <Input
                  inputMode="decimal"
                  autoComplete="off"
                  className="tabular-nums max-sm:h-[44px]"
                  value={density}
                  onChange={(event) => onDensity(event.target.value)}
                />
              </Field>
            ) : null}
          </div>
          {knownDensity ? (
            <p className="text-[13px] text-ink-muted">
              Densidad del reactivo: <span className="font-medium tabular-nums text-ink">{formatDecimal(knownDensity)} g/mL</span>
            </p>
          ) : null}
          <p
            role="status"
            className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted"
          >
            <span>Tara calculada:</span>
            <span className="font-bold tabular-nums text-ink">{result.tare ? `${formatDecimal(result.tare)} g` : '—'}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
