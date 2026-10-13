import { Toaster as SonnerToaster } from 'sonner';

export { toast } from 'sonner';

/**
 * Los avisos de una acción hecha dentro de una hoja (p. ej. «Deshacer» al quitar una opción) van a
 * este Toaster, que vive dentro de la hoja: Radix deja fuera de la ventana modal al Toaster
 * general (sin puntero, sin foco y oculto a los lectores de pantalla).
 */
export const sheetToasterId = 'sheet';

/**
 * Avisos del resultado de un comando ya confirmado por el servidor (ADR 0010, Sonner). Arriba,
 * bajo la barra, para no tapar las últimas columnas de las tablas.
 */
export function Toaster({ id }: { id?: string } = {}) {
  return (
    <SonnerToaster
      {...(id ? { id } : {})}
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
