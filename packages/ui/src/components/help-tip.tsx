import { Info } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Botón con un globo de ayuda; por omisión, el ⓘ. Se abre con clic, toque o foco por teclado y se cierra con
 * Esc, con un segundo clic o al salir. El globo no recibe el foco ni cambia el diseño: flota sobre el campo y se
 * recoloca si no cabe. Un clic con el ratón no abre y cierra de inmediato: el foco que trae el propio
 * clic no abre el globo.
 *
 * Con `trigger`, el disparador es propio (una ficha, una cifra): reemplaza al ⓘ y `className` lo viste entero.
 * Con `hover`, el puntero también lo abre al pasar y lo cierra al salir del disparador y del globo; un clic con
 * el ratón lo deja fijo. Con `children` como función, el globo trae acciones: recibe `close`, que lo cierra y
 * devuelve el foco al disparador, y el Tab desde el disparador entra al globo.
 */
export function HelpTip({
  label,
  children,
  className,
  trigger,
  hover = false,
}: {
  /** Nombre accesible del disparador; con `trigger`, debe contener su texto visible. */
  label: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  className?: string;
  trigger?: ReactNode;
  hover?: boolean;
}) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pointer = useRef<string | null>(null);
  const pinned = useRef(false);
  const quiet = useRef(false);
  const leaving = useRef<number | undefined>(undefined);
  const interactive = typeof children === 'function';

  useEffect(() => () => window.clearTimeout(leaving.current), []);

  const change = (next: boolean) => {
    window.clearTimeout(leaving.current);
    if (!next) pinned.current = false;
    setOpen(next);
  };
  const close = () => {
    change(false);
    quiet.current = true;
    button.current?.focus();
    quiet.current = false;
  };
  // Solo el ratón abre al pasar; el toque no tiene «pasar» y sigue siendo clic.
  const enter = (event: PointerEvent) => {
    if (!hover || event.pointerType !== 'mouse') return;
    window.clearTimeout(leaving.current);
    setOpen(true);
  };
  const leave = (event: PointerEvent) => {
    if (!hover || event.pointerType !== 'mouse' || pinned.current) return;
    window.clearTimeout(leaving.current);
    leaving.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover.Root open={open} onOpenChange={change}>
      <Popover.Anchor asChild>
        <button
          ref={button}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-describedby={open ? tipId : undefined}
          onPointerDown={(event) => {
            pointer.current = event.pointerType;
          }}
          onPointerEnter={enter}
          onPointerLeave={leave}
          onFocus={(event) => {
            // Abre el foco del teclado, no el que trae un clic ni el que devuelve una hoja al cerrarse.
            if (!quiet.current && pointer.current === null && event.currentTarget.matches(':focus-visible')) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!interactive || !open || event.key !== 'Tab' || event.shiftKey) return;
            const first = content.current?.querySelector<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
            if (!first) return;
            event.preventDefault();
            first.focus();
          }}
          onClick={() => {
            const mouse = pointer.current === 'mouse';
            pointer.current = null;
            if (hover && mouse && !pinned.current) {
              // Ya abrió al pasar: el clic lo deja fijo, no lo cierra; otro clic sí.
              pinned.current = true;
              setOpen(true);
              return;
            }
            change(!open);
          }}
          onBlur={() => {
            pointer.current = null;
          }}
          className={
            trigger
              ? cn('shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action', className)
              : cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors duration-150 hover:bg-action-soft hover:text-action',
                  'aria-expanded:bg-action-soft aria-expanded:text-action focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action max-sm:size-9',
                  className,
                )
          }
        >
          {trigger ?? <Info className="size-4" aria-hidden />}
        </button>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          ref={content}
          id={tipId}
          role={interactive ? 'dialog' : 'tooltip'}
          aria-label={interactive ? label : undefined}
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          onPointerEnter={enter}
          onPointerLeave={leave}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={() => {
            // Con foco dentro del globo, Esc lo devuelve al disparador en vez de perderlo en la página.
            if (interactive && content.current?.contains(document.activeElement)) button.current?.focus();
          }}
          onInteractOutside={(event) => {
            // Pulsar de nuevo el botón lo cierra el propio clic; si no, se cerraría y se reabriría.
            if (button.current?.contains(event.target as Node)) event.preventDefault();
          }}
          className="z-50 max-w-[17rem] origin-[var(--radix-popover-content-transform-origin)] rounded-xl bg-ink px-3 py-2.5 text-[13px] leading-snug text-white shadow-overlay data-[state=open]:animate-pop-in"
        >
          {typeof children === 'function' ? children(close) : children}
          <Popover.Arrow className="fill-ink" width={14} height={7} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
