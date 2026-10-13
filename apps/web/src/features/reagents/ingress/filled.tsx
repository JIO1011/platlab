import { Input, cn } from '@platlab/ui';
import { ChevronDown } from 'lucide-react';
import type { ComponentProps, RefObject } from 'react';

/** Alto de los campos: 36 px en escritorio y 44 px en el móvil (en px; la raíz es de 15 px). */
const height = 'h-[44px] sm:h-[36px]';

/**
 * Campo relleno, al estilo de ReactiLab: fondo hundido, borde transparente y borde de acento al
 * enfocar. Se aplica a `Input` y a `Select` como clase.
 */
export const filled = cn(
  height,
  'border-transparent bg-surface-sunken hover:border-transparent focus-visible:border-action read-only:text-ink-muted',
);

/** Etiqueta de campo del formulario. */
export const fieldLabel = 'text-[13px] font-semibold';

/** Cuadrícula de campos: 2 columnas en escritorio, 1 en el móvil. */
export const fieldGrid = 'grid gap-x-3 gap-y-3 sm:grid-cols-2';

/** Un campo de texto relleno. */
export function FilledInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn(filled, className)} {...props} />;
}

/**
 * Cantidad con su unidad pegada como sufijo, dentro del mismo campo relleno: un selector si la
 * unidad se puede elegir (`units`) y un texto fijo si ya viene del catálogo.
 */
export function QuantityInput({
  unit,
  units,
  onUnit,
  inputRef,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'> & {
  unit: string;
  units?: readonly string[];
  onUnit?: (unit: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      className={cn(
        'flex rounded-control border border-transparent bg-surface-sunken transition-[border-color,box-shadow] duration-150',
        'focus-within:border-action focus-within:ring-3 focus-within:ring-action/20 has-[[aria-invalid=true]]:border-danger',
        height,
        className,
      )}
    >
      <Input
        ref={inputRef}
        inputMode="decimal"
        autoComplete="off"
        className="h-full min-w-0 flex-1 border-0 bg-transparent tabular-nums hover:border-0 focus-visible:ring-0 aria-[invalid=true]:ring-0"
        {...props}
      />
      {units && onUnit ? (
        <span className="relative flex shrink-0 items-center border-l border-line">
          <select
            aria-label="Unidad"
            value={unit}
            onChange={(event) => onUnit(event.target.value)}
            className="h-full cursor-pointer appearance-none rounded-r-control bg-transparent pl-3 pr-7 text-sm font-medium text-ink outline-none focus-visible:bg-action-soft"
          >
            {units.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 size-4 text-ink-muted" aria-hidden />
        </span>
      ) : (
        <span className="flex shrink-0 items-center border-l border-line px-3 text-sm font-medium text-ink-muted">{unit}</span>
      )}
    </div>
  );
}
