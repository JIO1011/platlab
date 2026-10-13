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
  // Tres campos en fila: la tara se ve como un campo más (calculado), sin texto debajo.
  return (
    <div className={volume ? 'grid gap-3 sm:grid-cols-3' : fieldGrid}>
      <Field label="Peso bruto (frasco lleno, g)" labelClassName={fieldLabel} error={weightError}>
        <FilledInput inputMode="decimal" autoComplete="off" className="tabular-nums" value={full} onChange={(event) => onFull(event.target.value)} />
      </Field>
      {volume ? (
        <Field label="Densidad (g/mL)" labelClassName={fieldLabel} error={densityError}>
          <FilledInput
            inputMode="decimal"
            autoComplete="off"
            className="tabular-nums"
            placeholder="Del rótulo o la ficha"
            readOnly={knownDensity !== null}
            title={knownDensity ? 'Del catálogo' : undefined}
            value={knownDensity ? formatDecimal(knownDensity) : density}
            onChange={(event) => onDensity(event.target.value)}
          />
        </Field>
      ) : null}
      <Field label="Tara (calculada, g)" labelClassName={fieldLabel}>
        <FilledInput readOnly tabIndex={-1} aria-live="polite" className="font-semibold tabular-nums" placeholder="—" value={result.tare ? formatDecimal(result.tare) : ''} />
      </Field>
    </div>
  );
}
