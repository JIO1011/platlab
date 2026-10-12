import { Toaster as SonnerToaster } from 'sonner';

export { toast } from 'sonner';

/**
 * Avisos del resultado de un comando ya confirmado por el servidor (ADR 0010, Sonner). Arriba,
 * bajo la barra, para no tapar las últimas columnas de las tablas.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      offset={72}
      mobileOffset={64}
      closeButton
      toastOptions={{
        closeButtonAriaLabel: 'Cerrar aviso',
        classNames: {
          toast: 'rounded-panel border border-line bg-surface text-ink shadow-overlay font-sans',
          title: 'text-sm font-semibold text-ink',
          description: 'text-sm text-ink-muted',
        },
      }}
    />
  );
}
