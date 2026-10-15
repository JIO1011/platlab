import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Tiempo que el tooltip espera antes de abrir y antes de cerrar. */
const delay = 300;

/**
 * Tooltip de un control sin texto visible (ADR 0010; DESIGN.md, «Tooltip»): muestra el nombre al pasar el puntero
 * o al enfocar con el teclado. Abre a los 300 ms con un fundido y 4 px de desplazamiento (150 ms, `ease-out`; sin
 * movimiento si el usuario lo reduce). Se queda abierto si el puntero pasa al propio tooltip y tarda 300 ms en
 * cerrarse, para que un movimiento brusco no cierre el nombre ni lleve el clic a otro botón; el clic sobre el
 * disparador y Esc lo cierran al instante. El nombre accesible sigue siendo del disparador (`aria-label`): el
 * tooltip solo lo muestra.
 */
export function Tooltip({
  label,
  children,
  side = 'bottom',
  className,
}: {
  label: ReactNode;
  /** El disparador: un único elemento que recibe foco (un botón). */
  children: ReactElement;
  side?: 'top' | 'bottom';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closing = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closing.current), []);

  const keep = () => window.clearTimeout(closing.current);
  const closeNow = () => {
    keep();
    setOpen(false);
  };
  const change = (next: boolean) => {
    keep();
    if (next) setOpen(true);
    else closing.current = window.setTimeout(() => setOpen(false), delay);
  };

  return (
    <TooltipPrimitive.Provider delayDuration={delay} disableHoverableContent={false}>
      <TooltipPrimitive.Root open={open} onOpenChange={change}>
        <TooltipPrimitive.Trigger asChild onPointerDown={closeNow} onClick={closeNow}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            collisionPadding={12}
            onPointerEnter={keep}
            onPointerLeave={() => change(false)}
            onEscapeKeyDown={closeNow}
            className={cn(
              'z-50 max-w-[17rem] origin-[var(--radix-tooltip-content-transform-origin)] rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-medium leading-snug text-white shadow-overlay',
              'data-[side=top]:[--tooltip-from:4px] data-[side=bottom]:[--tooltip-from:-4px]',
              'data-[state=delayed-open]:animate-tooltip-in data-[state=instant-open]:animate-tooltip-in data-[state=closed]:animate-tooltip-out',
              className,
            )}
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
