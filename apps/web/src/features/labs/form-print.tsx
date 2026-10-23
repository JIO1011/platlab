import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Draft } from './form-draft';
import { FormPaper, type PaperSlots } from './form-paper';

/**
 * Imprime la hoja del Formato en A4, sin la pantalla de edición (ADR 0023): monta una copia de solo lectura en el
 * `body` como única hoja (`data-print-root`; el CSS de impresión de `styles.css` oculta lo demás y fija la página A4 de
 * `print-report`, la misma de los informes) y abre el diálogo de impresión. Con `slots` imprime la hoja llena (una solicitud); sin ellos, la plantilla. Al terminar, `onDone` la desmonta.
 */
export function FormPrint({ draft, workspaceName, revision, slots, onDone }: { draft: Draft; workspaceName: string; revision: number; slots?: PaperSlots; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  // El aplazo deja que la hoja se dibuje antes de abrir el diálogo.
  useEffect(() => {
    const finish = () => done.current();
    const timer = window.setTimeout(() => window.print(), 100);
    window.addEventListener('afterprint', finish, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finish);
    };
  }, []);

  return createPortal(
    <div data-print-root className="hidden print:block">
      <div className="print-report">
        <FormPaper mode="view" draft={draft} workspaceName={workspaceName} revision={revision} {...(slots ? { slots } : {})} />
      </div>
    </div>,
    document.body,
  );
}
