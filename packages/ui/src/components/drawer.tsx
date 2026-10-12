import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useLayoutEffect, useRef, type ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** Acción fija al pie, siempre visible aunque el contenido sea largo. */
  footer?: ReactNode;
}

/**
 * Cajón lateral (R-01C): sale del borde derecho, el lado donde viven los filtros, con alto completo,
 * hasta 24 rem de ancho y todo el ancho en el móvil. Atrapa el foco, se cierra con Esc y devuelve el
 * foco a quien lo abrió (Radix). Entra con `ease-sheet`; con movimiento reducido, solo se funde.
 */
export function Drawer({ open, onOpenChange, title, children, footer }: DrawerProps) {
  // Sin Dialog.Trigger, Radix no devuelve el foco: se recuerda quién lo tenía al abrir (antes de que
  // el cajón tome el suyo) y se le devuelve al cerrar.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-none flex-col sm:max-w-[24rem] border-l border-line bg-surface shadow-overlay outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
          }}
        >
          <header className="flex items-center justify-between gap-4 border-b border-line py-2 pl-5 pr-3">
            <Dialog.Title className="text-lg font-bold tracking-[-0.01em] text-ink">{title}</Dialog.Title>
            <Dialog.Close
              className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              aria-label="Cerrar"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>
          {footer ? (
            <footer className="border-t border-line bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
