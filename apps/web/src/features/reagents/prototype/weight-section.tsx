// Prototipo R-01D: solo interfaz
import { Field, Input, cn, formatDecimal } from '@platlab/ui';
import type { ReceiptWeight } from './weight';

/**
 * Campos del control por peso (opcional): con el peso del frasco lleno se calcula la tara, y con ella
 * se podrá comparar el saldo con la balanza. Pide el peso y, solo en volúmenes sin densidad
 * conocida, la densidad. Van dentro de una sección plegable del formulario.
 */
export function WeightFields({
  full,
  onFull,
  density,
  onDensity,
  knownDensity,
  result,
}: {
  full: string;
  onFull: (value: string) => void;
  density: string;
  onDensity: (value: string) => void;
  knownDensity: string | null;
  result: ReceiptWeight;
}) {
  const weightError = result.error && !result.error.includes('densidad') ? result.error : undefined;
  const densityError = result.error?.includes('densidad') ? result.error : undefined;
  const input = 'tabular-nums max-sm:h-[44px] sm:h-9';
  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-ink-muted">Permite comprobar el saldo de cada frasco con la balanza.</p>
      <div className={cn('grid gap-3', result.needsDensity && 'sm:grid-cols-2')}>
        <Field label="Peso del frasco lleno (g)" labelClassName="text-[13px] font-semibold" error={weightError}>
          <Input inputMode="decimal" autoComplete="off" className={input} value={full} onChange={(event) => onFull(event.target.value)} />
        </Field>
        {result.needsDensity ? (
          <Field label="Densidad (g/mL)" labelClassName="text-[13px] font-semibold" error={densityError} hint="Del rótulo o de la ficha de seguridad.">
            <Input inputMode="decimal" autoComplete="off" className={input} value={density} onChange={(event) => onDensity(event.target.value)} />
          </Field>
        ) : null}
      </div>
      {knownDensity ? (
        <p className="text-[13px] text-ink-muted">
          Densidad del reactivo: <span className="font-medium tabular-nums text-ink">{formatDecimal(knownDensity)} g/mL</span>
        </p>
      ) : null}
      <p role="status" className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-control bg-surface-sunken px-3 py-2 text-[13px] text-ink-muted">
        <span>Tara calculada:</span>
        <span className="text-sm font-bold tabular-nums text-ink">{result.tare ? `${formatDecimal(result.tare)} g` : '—'}</span>
      </p>
    </div>
  );
}
