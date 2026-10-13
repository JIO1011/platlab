import { X, type LucideIcon } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode, RefObject } from 'react';
import { cn } from '../lib/cn';

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
  /** Ventana ancha: hasta 40 rem. Por omisión, 32 rem. */
  wide?: boolean;
  /** Formulario compacto (R-01D): cabecera con el degradado del módulo y espaciado más ajustado. */
  compact?: boolean;
  /** Quién recibe el foco al abrir; por omisión, el primer control tabulable (Radix). */
  initialFocus?: RefObject<HTMLElement | null> | undefined;
}

/**
 * Ventana emergente para registrar movimientos (ADR 0010, 04-10-2026, con el aspecto del modal de
 * salida de ReactiLab): centrada, con la cabecera de icono y título, el cuerpo desplazable y las
 * acciones fijas al pie. Nace de su centro con una curva sin rebote; el foco queda atrapado
 * mientras está abierta. En pantallas pequeñas deja 16 px a cada lado y se desplaza por dentro.
 */
export function Sheet({ open, onOpenChange, title, description, icon: Icon, children, footer, wide = false, compact = false, initialFocus }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            if (!initialFocus?.current) return;
            event.preventDefault();
            initialFocus.current.focus();
          }}
          className={cn(
            'fixed inset-0 z-50 m-auto flex h-fit max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-card bg-surface shadow-overlay outline-none data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in',
            wide ? 'max-w-[40rem]' : 'max-w-lg',
          )}
        >
          <header
            className={cn(
              'flex items-start justify-between gap-4',
              compact ? 'bg-linear-to-r from-action to-action-deep px-4 py-3 text-on-action sm:px-5' : 'px-6 pb-4 pt-5',
            )}
          >
            <div className={cn('flex min-w-0 items-center', compact ? 'gap-3' : 'gap-4')}>
              {Icon ? (
                <span
                  aria-hidden
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center',
                    compact ? 'size-9 rounded-control bg-on-action/15 text-on-action' : 'size-12 rounded-2xl bg-action text-on-action shadow-lg shadow-action/20',
                  )}
                >
                  <Icon className={compact ? 'size-5' : 'size-6'} />
                </span>
              ) : null}
              <div className="grid min-w-0 gap-0.5">
                <Dialog.Title className={cn('font-bold tracking-[-0.01em]', compact ? 'text-lg text-on-action' : 'text-lg text-ink')}>{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className={cn(compact ? 'text-[13px] text-on-action/90' : 'text-sm text-ink-muted')}>{description}</Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                )}
              </div>
            </div>
            <Dialog.Close
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
                compact
                  ? '-mr-1.5 size-[44px] text-on-action hover:bg-on-action/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-on-action sm:size-9'
                  : '-mr-2 -mt-1 size-10 text-ink-muted hover:bg-surface-sunken hover:text-ink',
              )}
              aria-label="Cerrar"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>
          <div className={cn('min-h-0 flex-1 overflow-y-auto', compact ? 'bg-surface-sunken/50 px-4 py-3 sm:px-5' : 'border-t border-line px-6 py-4')}>{children}</div>
          {footer ? (
            <footer
              className={cn(
                'flex items-center gap-3 bg-surface',
                compact ? 'border-t border-line px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5' : 'px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2',
              )}
            >
              {footer}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
