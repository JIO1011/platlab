import { cn } from '@platlab/ui';
import { useId, type ReactNode } from 'react';

/**
 * Píldora de elección (como Motivo y Destino, ADR 0012): borde suave y fondo claro; la elegida, borde
 * índigo, fondo índigo-50 y texto índigo. `md` es la de las listas (h-10, ancho mínimo 7 rem), `sm` la
 * de opciones cortas (unidad) y `auto` se ajusta a su contenido. El foco del control interior
 * (radio o casilla, solo para lectores y teclado) se dibuja en la píldora.
 */
export const pillStyles = (selected: boolean, size: 'md' | 'sm' | 'auto' = 'md', disabled = false) =>
  cn(
    'inline-flex items-center justify-center rounded-full border text-sm font-medium transition-colors',
    'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-action',
    size === 'md' ? 'h-10 min-w-[7rem]' : size === 'sm' ? 'h-9 min-w-[3.5rem] px-4' : 'min-h-10 px-3',
    selected ? 'border-action bg-action-soft text-action' : 'border-line bg-white/60 text-ink-muted',
    disabled ? 'cursor-not-allowed opacity-60' : cn('cursor-pointer', !selected && 'hover:bg-white hover:text-ink'),
  );

/**
 * Elección única con píldoras (radios para lectores de pantalla y teclado): estado físico, unidad.
 * El rótulo sale de `label`; con `invalid`, cada radio lo declara para que el foco llegue al primero.
 */
export function PillField<T extends string>({
  label,
  required = false,
  value,
  options,
  onChange,
  size = 'md',
  disabled = false,
  error,
  hint,
  labelClassName,
  className,
}: {
  label: string;
  required?: boolean;
  value: T | '' | undefined;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  size?: 'md' | 'sm';
  disabled?: boolean;
  error?: string | undefined;
  hint?: ReactNode;
  labelClassName?: string;
  className?: string;
}) {
  const id = useId();
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <span id={id} className={cn('text-sm font-medium text-ink', labelClassName)}>
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5">
            *
          </span>
        ) : null}
      </span>
      <div role="radiogroup" aria-labelledby={id} aria-describedby={describedBy} aria-required={required || undefined} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={pillStyles(value === option.value, size, disabled)}>
            <input
              type="radio"
              name={id}
              className="sr-only"
              checked={value === option.value}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
