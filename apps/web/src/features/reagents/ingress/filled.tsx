import { Input, cn } from '@platlab/ui';
import type { ComponentProps, RefObject } from 'react';

/** Alto de los campos: 44 px (en px; la raíz es de 15 px), también el objetivo táctil en el móvil. */
const height = 'h-11';

/**
 * Campo claro del vidrio de las hojas, al estilo de ReactiLab: fondo blanco translúcido, borde suave,
 * esquinas de 12 px y, al enfocar, borde y aro índigo suave (el aro lo trae `Input`). Se aplica a
 * `Input` y a `Select` como clase.
 */
export const filled = cn(
  height,
  'rounded-xl border-line bg-white/60 hover:border-line-strong focus-visible:border-action read-only:bg-white/40 read-only:text-ink-muted',
);

/** Etiqueta de campo del formulario. */
export const fieldLabel = 'text-[13px] font-semibold';

/** Cuadrícula de campos: 2 columnas en escritorio, 1 en el móvil. */
export const fieldGrid = 'grid gap-x-3 gap-y-3 sm:grid-cols-2';

/** Un campo de texto relleno. */
export function FilledInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn(filled, className)} {...props} />;
}

/** Cantidad con su unidad pegada como sufijo, dentro del mismo campo claro (la unidad se elige en píldoras, aparte). */
export function QuantityInput({
  unit,
  inputRef,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'> & {
  unit: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      className={cn(
        'flex rounded-xl border border-line bg-white/60 transition-[border-color,box-shadow] duration-150 hover:border-line-strong',
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
      <span className="flex shrink-0 items-center border-l border-line px-3 text-sm font-medium text-ink-muted">{unit}</span>
    </div>
  );
}
