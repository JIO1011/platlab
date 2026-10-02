import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

interface FieldControl {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

const FieldContext = createContext<FieldControl | null>(null);

/**
 * Atributos que un control toma de su Field: aunque vaya envuelto (en un Controller o junto a
 * su unidad), queda unido a su etiqueta, su ayuda y su error para los lectores de pantalla.
 */
export function useFieldControl(): FieldControl | Record<string, never> {
  return useContext(FieldContext) ?? {};
}

export interface FieldProps {
  label: string;
  /** Ayuda permanente bajo el control (formato, unidad, consecuencias). */
  hint?: ReactNode;
  /** Error de validación o del servidor: nombra el problema y cómo resolverlo. */
  error?: string | undefined;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, optional = false, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const control: FieldControl = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
  };

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-subtle">(opcional)</span> : null}
      </label>
      <FieldContext.Provider value={control}>{children}</FieldContext.Provider>
      {hintId ? (
        <p id={hintId} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
      {errorId ? (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
