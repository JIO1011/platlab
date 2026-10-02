import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Acciones fijas al pie, siempre visibles aunque el formulario sea largo. */
  footer?: ReactNode;
}

/**
 * Hoja para registrar movimientos (ADR 0010): lateral en escritorio, inferior en el móvil.
 * Entra desde su borde con una curva sin rebote; el foco queda atrapado mientras está abierta.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/25 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed z-50 flex flex-col bg-surface shadow-overlay outline-none',
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-card data-[state=closed]:animate-sheet-out-bottom data-[state=open]:animate-sheet-in-bottom',
            'md:inset-y-4 md:left-auto md:right-4 md:max-h-none md:w-[min(460px,calc(100vw-2rem))] md:rounded-card',
            'md:data-[state=closed]:animate-sheet-out-right md:data-[state=open]:animate-sheet-in-right',
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
            <div className="grid gap-1">
              <Dialog.Title className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-sm text-ink-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 inline-flex size-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              aria-label="Cerrar"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer ? (
            <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
