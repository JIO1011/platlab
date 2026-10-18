import { X, type LucideIcon } from 'lucide-react';
import { IconTile } from './icon-tile';
import { Dialog } from 'radix-ui';
import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '../lib/cn';
import { Toaster, sheetToasterId } from './toaster';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Icono del cuadro de la cabecera: lo que se va a hacer, no un adorno. */
  icon?: LucideIcon;
  children: ReactNode;
  /** Acciones fijas al pie, siempre visibles aunque el formulario sea largo. */
  footer?: ReactNode;
  /** Ventana ancha: hasta 40 rem. Por omisión, 32 rem. `xl` llega a 64 rem desde 1024 px (ingreso en dos columnas). */
  wide?: boolean | 'xl';
  /** Quién recibe el foco al abrir; por omisión, el primer control tabulable (Radix). */
  initialFocus?: RefObject<HTMLElement | null> | undefined;
  /** En pantallas de menos de 640 px ocupa toda la pantalla (formularios largos); desde ahí, igual que las demás. */
  fullscreenMobile?: boolean;
}

/**
 * Ventana emergente para registrar movimientos (ADR 0010, 04-10-2026, con el aspecto del modal de
 * salida de ReactiLab): centrada, con la cabecera de icono y título, el cuerpo desplazable y las
 * acciones fijas al pie. Nace de su centro con una curva sin rebote; el foco queda atrapado
 * mientras está abierta. En pantallas pequeñas deja 16 px a cada lado y se desplaza por dentro.
 * Material (ADR 0010, 13-10-2026): vidrio esmerilado, blanco al 80 % con desenfoque y saturación
 * sobre un velo claro; sin `backdrop-filter`, superficie sólida.
 */
export function Sheet({ open, onOpenChange, title, description, icon: Icon, children, footer, wide = false, initialFocus, fullscreenMobile = false }: SheetProps) {
  // Una sombra al pie del cuerpo avisa de que queda contenido abajo: un centinela al final del cuerpo
  // la apaga cuando se ve entero (IntersectionObserver; sin él, no hay sombra).
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const [end, setEnd] = useState<HTMLDivElement | null>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (!body || !end || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setMore(entry ? !entry.isIntersecting : false), { root: body });
    observer.observe(end);
    return () => observer.disconnect();
  }, [body, end]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/15 backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            if (!initialFocus?.current) return;
            event.preventDefault();
            initialFocus.current.focus();
          }}
          onEscapeKeyDown={(event) => {
            // Con un menú de sugerencias abierto, Esc cierra solo el menú.
            const focused = document.activeElement;
            if (focused instanceof HTMLElement && focused.getAttribute('role') === 'combobox' && focused.getAttribute('aria-expanded') === 'true') event.preventDefault();
          }}
          className={cn(
            // Vidrio esmerilado: superficie blanca al 80 % sobre el fondo desenfocado; sin `backdrop-filter`, sólida.
            'fixed inset-0 z-50 m-auto flex h-fit max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-surface/80 shadow-overlay outline-none backdrop-blur-xl backdrop-saturate-150 not-supports-[backdrop-filter]:bg-surface data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in',
            wide === 'xl' ? 'max-w-[40rem] lg:max-w-[64rem]' : wide ? 'max-w-[40rem]' : 'max-w-lg',
            fullscreenMobile && 'max-sm:m-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-0',
          )}
        >
          <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
            <div className="flex min-w-0 items-center gap-4">
              {Icon ? <IconTile icon={Icon} /> : null}
              <div className="grid min-w-0 gap-0.5">
                <Dialog.Title className="text-xl font-bold tracking-[-0.01em] text-ink">{title}</Dialog.Title>
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
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              ref={setBody}
              className="relative min-h-0 flex-1 overflow-y-auto border-t border-line px-6 py-4"
            >
              {children}
              <div ref={setEnd} aria-hidden className="h-px" />
            </div>
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-ink/12 to-transparent transition-opacity duration-150 ease-out-expo',
                more ? 'opacity-100' : 'opacity-0',
              )}
            />
          </div>
          {footer ? (
            <footer className="flex items-center gap-3 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">{footer}</footer>
          ) : null}
          <Toaster id={sheetToasterId} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
