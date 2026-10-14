import { Info } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Botón ⓘ con un globo de ayuda. Se abre con clic, toque o foco por teclado y se cierra con Esc, con
 * un segundo clic o al salir. El globo no recibe el foco ni cambia el diseño: flota sobre el campo y se
 * recoloca si no cabe. Un clic con el ratón no abre y cierra de inmediato: el foco que trae el propio
 * clic no abre el globo.
 */
export function HelpTip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pointer = useRef(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <button
          ref={button}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-describedby={open ? tipId : undefined}
          onPointerDown={() => {
            pointer.current = true;
          }}
          onFocus={() => {
            if (!pointer.current) setOpen(true);
          }}
          onClick={() => {
            pointer.current = false;
            setOpen((previous) => !previous);
          }}
          onBlur={() => {
            pointer.current = false;
          }}
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors duration-150 hover:bg-action-soft hover:text-action',
            'aria-expanded:bg-action-soft aria-expanded:text-action focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action max-sm:size-9',
            className,
          )}
        >
          <Info className="size-4" aria-hidden />
        </button>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          id={tipId}
          role="tooltip"
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            // Pulsar de nuevo el botón lo cierra el propio clic; si no, se cerraría y se reabriría.
            if (button.current?.contains(event.target as Node)) event.preventDefault();
          }}
          className="z-50 max-w-[17rem] origin-[var(--radix-popover-content-transform-origin)] rounded-xl bg-ink px-3 py-2.5 text-[13px] leading-snug text-white shadow-overlay data-[state=open]:animate-pop-in"
        >
          {children}
          <Popover.Arrow className="fill-ink" width={14} height={7} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
