import { Button, cn } from '@platlab/ui';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Celda de las tablas de los informes impresos: compacta en pantalla y aún más en papel. */
export const printCell = 'px-2 py-1.5 align-top text-[12px] leading-snug break-words print:px-1.5 print:py-1 print:text-[10.5px]';
/** Encabezado de columna de esas tablas. */
export const printHead = 'h-8 px-2 align-bottom print:h-7 print:px-1.5 print:text-[10px]';

/**
 * Vista imprimible de un informe (ADR 0014, 0019): un diálogo a toda la ventana montado en el `body`
 * (`data-print-root`; el CSS de impresión de `styles.css` lo deja como única hoja, sin la barra lateral) con
 * «Volver» e «Imprimir», y la hoja con el espacio, el título y los datos del informe en texto; el cuerpo es
 * de quien lo usa. Al terminar de cargar (`ready` y `hasContent`) abre el diálogo de impresión. La hoja es A4
 * vertical o, con `landscape`, apaisada.
 */
export function PrintDialog({
  workspaceName,
  title,
  facts,
  closeLabel,
  loadingText,
  ready,
  failed,
  hasContent,
  landscape = false,
  onClose,
  children,
}: {
  workspaceName: string;
  title: string;
  /** Los datos del informe bajo el título (período, filtros, impreso…), cada uno con su nombre. */
  facts: { term: string; detail: ReactNode }[];
  /** «Volver a Movimientos». */
  closeLabel: string;
  /** Lo que la barra dice mientras carga («Cargando movimientos… 120»). */
  loadingText: string;
  ready: boolean;
  failed: boolean;
  hasContent: boolean;
  landscape?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const canPrint = ready && hasContent;

  // `window.print()` al terminar de cargar; el aplazo deja que la tabla se dibuje antes de la hoja.
  useEffect(() => {
    if (!canPrint) return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [canPrint]);

  // Diálogo modal: el foco entra en «Volver», Tab no sale de la ventana y Esc cierra; al cerrar, vuelve a quien lo abrió.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusInside = () => root.current?.querySelector('button')?.focus();
    focusInside();
    // Abierta desde el menú «Exportar», el menú aún bloquea la página al montarse: el foco entra un cuadro después.
    const frame = requestAnimationFrame(focusInside);
    // Si el foco sale (el menú lo devuelve a su botón al cerrarse), vuelve a la ventana: es modal.
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) focusInside();
    };
    document.addEventListener('focusin', keepFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('focusin', keepFocus);
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  // Esc cierra aunque el foco no haya entrado todavía (queda en `body`).
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close.current();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, []);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={root}
      data-print-root
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-canvas print:static print:overflow-visible print:bg-white"
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5 print:hidden">
        <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={onClose}>
          <ArrowLeft aria-hidden />
          {closeLabel}
        </Button>
        <p role="status" className="min-w-0 text-sm text-ink-muted">
          {failed ? 'No se pudo cargar todo.' : ready ? 'Lista para imprimir.' : loadingText}
        </p>
        <Button variant="primary" size="sm" className="ml-auto h-[44px] sm:h-8" disabled={!canPrint} onClick={() => window.print()}>
          <Printer aria-hidden />
          Imprimir
        </Button>
      </div>

      <article
        className={cn(
          'mx-auto my-6 max-w-[calc(100%-2rem)] bg-white p-5 text-ink shadow-raised sm:p-[14mm] print:m-0 print:w-auto print:max-w-none print:p-0 print:shadow-none',
          landscape ? 'print-report-landscape w-[297mm]' : 'print-report w-[210mm]',
        )}
      >
        <header className="grid gap-1 border-b border-ink pb-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{workspaceName}</p>
          <h2 id={titleId} className="text-[20px] font-bold leading-tight tracking-[-0.01em]">
            {title}
          </h2>
          <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12px] leading-snug">
            {facts.map((fact) => (
              <div key={fact.term} className="contents">
                <dt className="text-ink-muted">{fact.term}</dt>
                <dd className="font-medium">{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </header>
        <div className="mt-4">{children}</div>
      </article>
    </div>,
    document.body,
  );
}
