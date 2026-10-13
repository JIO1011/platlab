// Prototipo R-01D: solo interfaz
import { cn } from '@platlab/ui';
import { useId, type ReactNode } from 'react';

export interface PillOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Opciones cortas como píldoras de radio nativas (flechas del teclado y lectores de pantalla), como el
 * motivo y el destino de las ventanas de movimiento. Segmentados pequeños: 36 px de alto y 44 px por
 * debajo de 640 px, en px.
 */
export function RadioPills<T extends string>({
  legend,
  value,
  options,
  onChange,
  error,
  hint,
  optional = false,
  required = false,
  onClear,
  action,
}: {
  legend: string;
  value: T | '';
  options: ReadonlyArray<PillOption<T>>;
  onChange: (value: T) => void;
  error?: string | undefined;
  hint?: ReactNode;
  optional?: boolean;
  required?: boolean;
  /** Volver a pulsar la elegida la quita (campos opcionales). */
  onClear?: () => void;
  /** Acción a la derecha del rótulo (p. ej., «Añadir»). */
  action?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="grid content-start gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span id={`${id}-legend`} className="text-[13px] font-semibold text-ink">
          {legend}
          {optional ? <span className="ml-1 font-normal text-ink-subtle">(opcional)</span> : null}
          {required ? (
            <span aria-hidden className="ml-0.5">
              *
            </span>
          ) : null}
        </span>
        {action}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-legend`}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="flex flex-wrap gap-1.5"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150 sm:min-h-9 sm:px-3',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action',
              value === option.value
                ? 'border-action/40 bg-action-soft text-action'
                : error
                  ? 'border-danger/50 text-ink-muted hover:bg-surface-sunken hover:text-ink'
                  : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink',
            )}
          >
            <input type="radio" name={id} className="sr-only" checked={value === option.value} onChange={() => onChange(option.value)}
              onClick={() => {
                if (onClear && value === option.value) onClear();
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && !error ? <p className="text-[13px] text-ink-muted">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
