import { HelpTip } from '@platlab/ui';
import { Scale } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { formatWeight } from '../weight';
import { FilledInput, fieldLabel } from '../../../app/filled';
import { Section } from '../../../app/form-section';
import type { Errors } from './model';

type WeightFieldsProps = Parameters<typeof WeightFields>[0];

/**
 * «Control por peso» como sección plegable. Empieza plegado (14-10-2026) y se abre solo cuando llega algo suyo: el
 * peso escrito o un error de peso o densidad. Se abre en el momento en que aparece, no mientras dura: plegarlo
 * después no lo reabre ni borra lo escrito.
 */
export function WeightSection(props: WeightFieldsProps) {
  const [open, setOpen] = useState(false);
  const wanted = props.grossWeight.trim() !== '' || Boolean(props.errors.weight || props.errors.density);
  const [seen, setSeen] = useState(false);
  if (wanted !== seen) {
    setSeen(wanted);
    if (wanted) setOpen(true);
  }
  return (
    <Section icon={Scale} title="Control por peso" badge="Opcional" fold={{ open, onToggle: () => setOpen(!open) }}>
      <WeightFields {...props} />
    </Section>
  );
}

/**
 * Control por peso (opcional, ADR 0015): con el peso del frasco lleno, el servidor calcula la tara y
 * después la balanza comprueba el saldo. La densidad solo se pide en volumen (mL o L); si la ficha la
 * tiene, viene escrita. La tara que se ve es una vista previa. Cada campo explica qué se escribe en un
 * globo ⓘ, y una línea guía arriba dice para qué sirve la sección.
 */
function WeightFields({
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
    <div className="grid gap-4">
      <p className="text-[13px] text-ink-muted">Con el peso del frasco lleno se calcula la tara; después la balanza comprueba cuánto queda.</p>
      <div className={volume ? 'grid gap-x-3 gap-y-3 sm:grid-cols-3' : 'grid gap-x-3 gap-y-3 sm:grid-cols-2'}>
        <WeightField label="Peso del frasco lleno (g)" tip="Cómo pesar el frasco" help="Pon el frasco lleno y cerrado en la balanza y escribe lo que marca, en gramos" error={errors.weight}>
          {(id, describedBy) => (
            <FilledInput
              id={id}
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
              aria-invalid={errors.weight ? true : undefined}
              aria-describedby={describedBy}
              value={grossWeight}
              onChange={(event) => onGrossWeight(event.target.value)}
            />
          )}
        </WeightField>
        {volume ? (
          <WeightField label="Densidad (g/mL)" tip="Dónde está la densidad" help="Gramos por mL; está en la sección 9 de la ficha de seguridad" error={errors.density}>
            {(id, describedBy) => (
              <FilledInput
                id={id}
                inputMode="decimal"
                autoComplete="off"
                className="tabular-nums"
                placeholder="Del rótulo o la ficha"
                aria-invalid={errors.density ? true : undefined}
                aria-describedby={describedBy}
                value={density}
                onChange={(event) => onDensity(event.target.value)}
              />
            )}
          </WeightField>
        ) : null}
        <WeightField label="Tara (calculada, g)" tip="Qué es la tara" help="Peso del frasco vacío: lleno − contenido; sirve para saber cuánto queda pesándolo">
          {(id) => (
            <FilledInput
              id={id}
              readOnly
              tabIndex={-1}
              aria-live="polite"
              className="font-semibold tabular-nums"
              placeholder="—"
              value={tare ? formatWeight(tare) : ''}
            />
          )}
        </WeightField>
      </div>
    </div>
  );
}

/** Un campo de la sección: su rótulo con el botón ⓘ al lado (el globo explica qué se escribe) y el control. */
function WeightField({
  label,
  tip,
  help,
  error,
  children,
}: {
  label: string;
  /** Nombre accesible del botón ⓘ. */
  tip: string;
  help: string;
  error?: string | undefined;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid content-start gap-1.5">
      <div className="flex items-center gap-0.5">
        <label htmlFor={id} className={fieldLabel}>
          {label}
        </label>
        <HelpTip label={tip} className="-my-1.5">{help}</HelpTip>
      </div>
      {children(id, error ? errorId : undefined)}
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
