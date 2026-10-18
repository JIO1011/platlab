import type { WorkResult } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { resultLabels } from './work-text';

const results = Object.keys(resultLabels) as WorkResult[];

/** El elegido lleva el color de su estado y, además, una marca: el color nunca va solo (ADR 0010). */
const chosen: Record<WorkResult, string> = {
  pass: 'border-success bg-success-soft text-success',
  pass_with_observations: 'border-warning bg-warning-soft text-warning',
  fail: 'border-danger bg-danger-soft text-danger',
};

/**
 * El resultado del trabajo con tres botones grandes (Conforme, Con observaciones, No conforme), sin valor por defecto:
 * quien registra decide. Radios para teclado y lectores de pantalla; el foco se dibuja en el botón.
 */
export function ResultChoice({
  value,
  onChange,
  error,
  hint,
}: {
  value: WorkResult | '';
  onChange: (value: WorkResult) => void;
  error?: string | undefined;
  hint?: ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="grid content-start gap-1.5">
      <span id={id} className="text-sm font-medium text-ink">
        Resultado
        <span aria-hidden className="ml-0.5">
          *
        </span>
      </span>
      <div role="radiogroup" aria-labelledby={id} aria-describedby={describedBy} aria-required className="grid grid-cols-3 gap-2">
        {results.map((result) => {
          const selected = value === result;
          return (
            <label
              key={result}
              className={cn(
                'relative flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border-2 px-1.5 py-2 text-center text-sm font-semibold leading-tight transition-colors',
                'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-action',
                selected ? chosen[result] : 'border-line bg-white/60 text-ink hover:bg-white',
              )}
            >
              <input
                type="radio"
                name={id}
                className="sr-only"
                checked={selected}
                aria-invalid={error ? true : undefined}
                onChange={() => onChange(result)}
              />
              <Check className={cn('size-4', selected ? 'opacity-100' : 'opacity-0')} strokeWidth={3} aria-hidden />
              {resultLabels[result]}
            </label>
          );
        })}
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
