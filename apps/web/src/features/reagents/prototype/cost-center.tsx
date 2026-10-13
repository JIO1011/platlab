// Prototipo R-01D: solo interfaz
import { Field } from '@platlab/ui';
import { useMemo } from 'react';
import { Combobox, type ComboOption } from './combobox';
import { fieldLabel } from './filled';
import { defaultAreas } from './wizard-model';

/**
 * Área o departamento: campo con sugerencias (las de ejemplo y las que ya se usaron). «Crear» deja lo
 * escrito como área nueva, que se recuerda al confirmar el ingreso.
 */
export function CostCenter({ value, extras, onChange }: { value: string; extras: string[]; onChange: (value: string) => void }) {
  const options = useMemo<ComboOption[]>(() => [...new Set([...defaultAreas, ...extras])].map((name) => ({ id: name, label: name })), [extras]);
  return (
    <Field label="Área o departamento" labelClassName={fieldLabel}>
      <Combobox value={value} onChange={onChange} options={options} onPick={(option) => onChange(option.label)} canCreate placeholder="Docencia, investigación…" />
    </Field>
  );
}
