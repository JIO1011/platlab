import { Input, cn } from '@platlab/ui';
import type { ComponentProps } from 'react';

/** Alto de los campos: 44 px (en px; la raíz es de 15 px), también el objetivo táctil en el móvil. */
export const fieldHeight = 'h-11';

/**
 * Campo claro del vidrio de las hojas, al estilo de ReactiLab: fondo blanco translúcido, borde suave,
 * esquinas de 12 px y, al enfocar, borde y aro del acento suave (el aro lo trae `Input`). Se aplica a
 * `Input` y a `Select` como clase.
 */
export const filled = cn(
  fieldHeight,
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
