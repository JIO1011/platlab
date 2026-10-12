import { cn } from '../lib/cn';

interface SegmentedProps<T extends string> {
  /** Nombre del grupo para los lectores de pantalla. */
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onValueChange: (value: T) => void;
  className?: string;
}

/**
 * Selector segmentado para elegir una vista (Detalle | Totales): el mismo lenguaje que las pestañas
 * (pista hundida, opción elevada) sin su semántica de paneles. `aria-pressed` dice el estado.
 */
export function Segmented<T extends string>({ label, value, options, onValueChange, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex gap-1 rounded-full bg-surface-sunken p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onValueChange(option.value)}
          className={cn(
            'h-[44px] rounded-full px-4 text-sm font-medium text-ink-muted transition-[background-color,color,box-shadow] duration-150 ease-out-expo sm:h-8',
            'hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-raised',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
