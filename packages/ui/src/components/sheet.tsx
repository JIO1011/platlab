import { X, type LucideIcon } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Icono del cuadro de la cabecera: lo que se va a hacer, no un adorno. */
  icon?: LucideIcon;
  children: ReactNode;
  /** Acciones fijas al pie, siempre visibles aunque el formulario sea largo. */
  footer?: ReactNode;
}

/**
 * Ventana emergente para registrar movimientos (ADR 0010, 04-10-2026, con el aspecto del modal de
 * salida de ReactiLab): centrada, con la cabecera de icono y título, el cuerpo desplazable y las
 * acciones fijas al pie. Nace de su centro con una curva sin rebote; el foco queda atrapado
 * mientras está abierta. En pantallas pequeñas deja 16 px a cada lado y se desplaza por dentro.
 */
export function Sheet({ open, onOpenChange, title, description, icon: Icon, children, footer }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-0 z-50 m-auto flex h-fit max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg flex-col overflow-hidden rounded-card bg-surface shadow-overlay outline-none data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in">
          <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
            <div className="flex min-w-0 items-center gap-4">
              {Icon ? (
                <span
                  aria-hidden
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-action text-on-action shadow-lg shadow-action/20"
                >
                  <Icon className="size-6" />
                </span>
              ) : null}
              <div className="grid min-w-0 gap-0.5">
                <Dialog.Title className="text-lg font-bold tracking-[-0.01em] text-ink">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="text-sm text-ink-muted">{description}</Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                )}
              </div>
            </div>
            <Dialog.Close
              className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              aria-label="Cerrar"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-6 py-4">{children}</div>
          {footer ? (
            <footer className="flex items-center gap-3 bg-surface px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">{footer}</footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
