import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

/**
 * Superficie que nace de su disparador y admite controles dentro (casillas, campos de fecha), a diferencia del
 * DropdownMenu, que solo lleva acciones. Misma superficie y entrada que el menú (ADR 0010); en el móvil nunca
 * pasa del ancho de la ventana.
 */
export function PopoverContent({ className, sideOffset = 6, align = 'start', collisionPadding = 8, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={collisionPadding}
        className={cn(
          'z-50 w-72 max-w-[calc(100vw-1rem)] rounded-control border border-line bg-surface p-1.5 shadow-overlay outline-none',
          'origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:animate-pop-in',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
