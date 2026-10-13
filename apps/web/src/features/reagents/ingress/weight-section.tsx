import { Field } from '@platlab/ui';
import { formatWeight } from '../weight';
import { FilledInput, fieldGrid, fieldLabel } from './filled';
import type { Errors } from './model';

/**
 * Control por peso (opcional, ADR 0015): con el peso del frasco lleno, el servidor calcula la tara y
 * después la balanza comprueba el saldo. La densidad solo se pide en volumen (mL o L); si la ficha la
 * tiene, viene escrita. La tara que se ve es una vista previa.
 */
export function WeightFields({
  grossWeight,
  onGrossWeight,
  density,
  onDensity,
  volume,
  tare,
  errors,
}: {
  grossWeight: string;
  onGrossWeight: (value: string) => void;
  density: string;
  onDensity: (value: string) => void;
  /** La unidad es mL o L. */
  volume: boolean;
  tare: string | null;
  errors: Errors;
}) {
  // Tres campos en fila: la tara se ve como un campo más (calculado), sin texto debajo.
  return (
    <div className={volume ? 'grid gap-3 sm:grid-cols-3' : fieldGrid}>
      <Field label="Peso del frasco lleno (g)" labelClassName={fieldLabel} error={errors.weight}>
        <FilledInput
          inputMode="decimal"
          autoComplete="off"
          className="tabular-nums"
          value={grossWeight}
          onChange={(event) => onGrossWeight(event.target.value)}
        />
      </Field>
      {volume ? (
        <Field label="Densidad (g/mL)" labelClassName={fieldLabel} error={errors.density}>
          <FilledInput
            inputMode="decimal"
            autoComplete="off"
            className="tabular-nums"
            placeholder="Del rótulo o la ficha"
            value={density}
            onChange={(event) => onDensity(event.target.value)}
          />
        </Field>
      ) : null}
      <Field label="Tara (calculada, g)" labelClassName={fieldLabel}>
        <FilledInput
          readOnly
          tabIndex={-1}
          aria-live="polite"
          className="font-semibold tabular-nums"
          placeholder="—"
          value={tare ? formatWeight(tare) : ''}
        />
      </Field>
    </div>
  );
}
