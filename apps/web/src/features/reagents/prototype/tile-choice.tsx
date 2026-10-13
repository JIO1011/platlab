// Prototipo R-01D: solo interfaz
import { cn } from '@platlab/ui';
import { Check, type LucideIcon } from 'lucide-react';
import { useId } from 'react';

export interface TileOption<T extends string> {
  value: T;
  label: string;
  /** Segunda línea, más pequeña («g», «mL»). */
  detail?: string;
  icon: LucideIcon;
}

/**
 * Mosaicos grandes con icono para elegir una opción (radio nativo: flechas del teclado y lectores de
 * pantalla). Lo elegido lleva borde de acento, fondo suave y una marca; el nombre va siempre en texto.
 */
export function TileChoice<T extends string>({
  legend,
  value,
  options,
  onChange,
  error,
  columns,
}: {
  legend: string;
  value: T | '';
  options: ReadonlyArray<TileOption<T>>;
  onChange: (value: T) => void;
  error?: string | undefined;
  columns: string;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <span id={`${id}-legend`} className="text-base font-semibold text-ink">
        {legend}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-legend`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn('grid gap-2', columns)}
      >
        {options.map(({ value: option, label, detail, icon: Icon }) => {
          const checked = value === option;
          return (
            <label
              key={option}
              className={cn(
                'relative flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-panel border px-2 py-3 text-center transition-[background-color,border-color,color] duration-150 ease-out-expo',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-action',
                checked
                  ? 'border-action bg-action-soft text-action'
                  : error
                    ? 'border-danger/50 bg-surface text-ink-muted hover:bg-surface-sunken hover:text-ink'
                    : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:bg-surface-sunken hover:text-ink',
              )}
            >
              <input type="radio" name={id} className="sr-only" checked={checked} onChange={() => onChange(option)} />
              <Icon className="size-6" aria-hidden />
              <span className="text-sm font-semibold leading-tight">{label}</span>
              {detail ? <span className="text-[12px] leading-none opacity-80">{detail}</span> : null}
              {checked ? <Check className="absolute right-2 top-2 size-4" strokeWidth={3} aria-hidden /> : null}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
