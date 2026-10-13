// Prototipo R-01D: solo interfaz
import { Field, formatDecimal } from '@platlab/ui';
import { FilledInput, fieldGrid, fieldLabel } from './filled';
import type { ReceiptWeight } from './weight';

/**
 * Campos del control por peso (opcional): con el peso bruto del frasco lleno se calcula la tara, y con
 * ella se podrá comparar el saldo con la balanza. La densidad solo se pide en volúmenes (mL o L); si
 * el catálogo ya la tiene, viene rellena.
 */
export function WeightFields({
  full,
  onFull,
  density,
  onDensity,
  knownDensity,
  volume,
  result,
}: {
  full: string;
  onFull: (value: string) => void;
  density: string;
  onDensity: (value: string) => void;
  knownDensity: string | null;
  /** La unidad es mL o L. */
  volume: boolean;
  result: ReceiptWeight;
}) {
  const weightError = result.error && !result.error.includes('densidad') ? result.error : undefined;
  const densityError = result.error?.includes('densidad') ? result.error : undefined;
  return (
    <div className="grid gap-3">
      <div className={fieldGrid}>
        <Field label="Peso bruto (frasco lleno, g)" labelClassName={fieldLabel} error={weightError}>
          <FilledInput inputMode="decimal" autoComplete="off" className="tabular-nums" value={full} onChange={(event) => onFull(event.target.value)} />
        </Field>
        {volume ? (
          <Field label="Densidad (g/mL)" labelClassName={fieldLabel} error={densityError} hint={knownDensity ? 'Del catálogo' : 'Del rótulo o de la ficha de seguridad.'}>
            <FilledInput
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
              readOnly={knownDensity !== null}
              value={knownDensity ? formatDecimal(knownDensity) : density}
              onChange={(event) => onDensity(event.target.value)}
            />
          </Field>
        ) : null}
      </div>
      <p aria-live="polite" className="text-sm text-ink-muted">
        {result.tare ? (
          <>
            Tara: <span className="font-bold tabular-nums text-ink">{formatDecimal(result.tare)} g</span>
          </>
        ) : (
          'Con el peso bruto se calcula la tara del frasco.'
        )}
      </p>
    </div>
  );
}
