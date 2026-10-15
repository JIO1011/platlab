import { Button, Quantity, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { formatDateTime, formatShortDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { useReagents } from './context';
import { MovementTotals } from './movement-totals';
import {
  dayKey,
  filterLines,
  groupNames,
  hourOf,
  movementsText,
  periodText,
  tight,
  typeSingular,
} from './movement-text';
import { purposeOf, responsibleOf } from './operation-text';

/** Cuántas filas imprime el Detalle como máximo (ADR 0014); si hay más, el informe lo avisa. */
const PRINT_LIMIT = 1000;

const cell = 'px-2 py-1.5 align-top text-[12px] leading-snug break-words print:px-1.5 print:py-1 print:text-[10.5px]';

/**
 * Vista imprimible de Movimientos (R-01C, ADR 0014): el espacio, el período y los filtros en texto y,
 * en Detalle, una tabla con todas las páginas de la consulta actual (hasta 1.000 filas) o, en Totales,
 * la tabla de totales. Es el mismo caché que la lista: no pide nada nuevo, solo termina de cargarla.
 * Al terminar de cargar abre el diálogo de impresión; el CSS de impresión (`styles.css`) deja la hoja
 * A4 sola, sin la barra lateral. En pantalla es un diálogo a toda la ventana, con «Volver» y «Imprimir».
 */
export function MovementPrint({
  view,
  total,
  currentYear,
  onClose,
}: {
  view: 'detail' | 'totals';
  total: number | undefined;
  currentYear: number;
  onClose: () => void;
}) {
  const { me, base, operations, operationTotals, movementFilters: filters, operationFacets, productList } = useReagents();
  const timeZone = me.workspace.timeZone;
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [printedAt] = useState(() => new Date().toISOString());

  const { fetchNextPage, isFetchingNextPage, isPlaceholderData, hasNextPage, isSuccess, isError } = operations;
  const loaded = useMemo(() => operations.data?.pages.flatMap((page) => page.items) ?? [], [operations.data]);
  const capped = loaded.length >= PRINT_LIMIT;
  const rows = capped ? loaded.slice(0, PRINT_LIMIT) : loaded;
  const hasMore = loaded.length > PRINT_LIMIT || (capped && hasNextPage);

  // Termina de cargar la consulta página a página, hasta el límite.
  const loadingMore = view === 'detail' && isSuccess && hasNextPage && !capped;
  useEffect(() => {
    if (loadingMore && !isFetchingNextPage && !isPlaceholderData) void fetchNextPage();
  }, [loadingMore, isFetchingNextPage, isPlaceholderData, fetchNextPage, loaded.length]);

  const ready =
    view === 'detail'
      ? isSuccess && !isPlaceholderData && !loadingMore
      : operationTotals.isSuccess && !operationTotals.isPlaceholderData;
  const hasContent = view === 'detail' ? rows.length > 0 : (operationTotals.data?.groups.length ?? 0) > 0;
  const failed = view === 'detail' ? isError : operationTotals.isError;

  // `window.print()` al terminar de cargar; el aplazo deja que la tabla se dibuje antes de la hoja.
  useEffect(() => {
    if (!ready || !hasContent) return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [ready, hasContent]);

  // Diálogo modal: el foco entra en «Volver», Tab no sale de la ventana y Esc cierra; al cerrar, vuelve a «Imprimir».
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.current?.querySelector('button')?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
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

  const productName = (id: string) =>
    operationFacets.data?.products.options.find((option) => option.id === id)?.name ?? productList.find((product) => product.id === id)?.name;
  const lines = filterLines(filters, operationFacets.data, productName);
  const count = view === 'detail' ? (total ?? rows.length) : total;

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
          Volver a Movimientos
        </Button>
        <p role="status" className="min-w-0 text-sm text-ink-muted">
          {failed ? 'No se pudo cargar todo.' : ready ? 'Lista para imprimir.' : `Cargando movimientos… ${view === 'detail' ? loaded.length : ''}`}
        </p>
        <Button variant="primary" size="sm" className="ml-auto h-[44px] sm:h-8" disabled={!ready || !hasContent} onClick={() => window.print()}>
          <Printer aria-hidden />
          Imprimir
        </Button>
      </div>

      <article className="print-report mx-auto my-6 w-[210mm] max-w-[calc(100%-2rem)] bg-white p-5 text-ink shadow-raised sm:p-[14mm] print:m-0 print:w-auto print:max-w-none print:p-0 print:shadow-none">
        <header className="grid gap-1 border-b border-ink pb-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{me.workspace.name}</p>
          <h2 id={titleId} className="text-[20px] font-bold leading-tight tracking-[-0.01em]">
            Movimientos de reactivos
          </h2>
          <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12px] leading-snug">
            <dt className="text-ink-muted">Período</dt>
            <dd className="font-medium">{periodText(filters.period, currentYear)}</dd>
            <dt className="text-ink-muted">Filtros</dt>
            <dd className="font-medium">
              {lines.length === 0 ? (
                'Sin filtros'
              ) : (
                <ul>
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </dd>
            <dt className="text-ink-muted">Informe</dt>
            <dd className="font-medium">
              {view === 'detail' ? 'Detalle' : `Totales por ${groupNames[filters.groupBy].toLowerCase()}`}
              {count === undefined ? '' : ` · ${movementsText(count)}`}
            </dd>
            <dt className="text-ink-muted">Impreso</dt>
            <dd className="font-medium">{formatDateTime(printedAt, timeZone)}</dd>
          </dl>
        </header>

        <div className="mt-4">
          {failed ? (
            <QueryErrorState
              error={view === 'detail' ? operations.error : operationTotals.error}
              onRetry={() => void (view === 'detail' ? operations.refetch() : operationTotals.refetch())}
            />
          ) : !ready ? (
            <p className="py-8 text-center text-sm text-ink-muted">Cargando…</p>
          ) : !hasContent ? (
            <p className="py-8 text-center text-sm text-ink-muted">No hay movimientos con estos filtros.</p>
          ) : view === 'totals' ? (
            <MovementTotals totals={operationTotals} filters={filters} base={base} print />
          ) : (
            <>
              <Table className="text-[12px]">
                <caption className="sr-only">Movimientos</caption>
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    {['Fecha', 'Tipo', 'Reactivo', 'Frasco', 'Cantidad', 'Motivo o destino', 'Responsable'].map((title) => (
                      <TableHeader key={title} numeric={title === 'Cantidad'} className="h-8 px-2 align-bottom print:h-7 print:px-1.5 print:text-[10px]">
                        {title}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((operation) => (
                    <TableRow key={operation.entryId} className="break-inside-avoid hover:bg-transparent">
                      <TableCell className={cn(cell, 'whitespace-nowrap')}>
                        {formatShortDate(dayKey(new Date(operation.effectiveAt), timeZone))} {hourOf(operation.effectiveAt, timeZone)}
                      </TableCell>
                      <TableCell className={cell}>{typeSingular[operation.type]}</TableCell>
                      <TableCell className={cn(cell, 'font-medium')}>{tight(operation.product.name)}</TableCell>
                      <TableCell className={cn(cell, 'whitespace-nowrap')}>{operation.container?.code ?? operation.lot.code}</TableCell>
                      <TableCell numeric className={cn(cell, 'font-semibold')}>
                        <Quantity value={operation.quantity} unit={operation.unit} signed />
                      </TableCell>
                      <TableCell className={cell}>{purposeOf(operation) ?? '—'}</TableCell>
                      <TableCell className={cell}>{responsibleOf(operation)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasMore ? (
                <p className="mt-3 text-[12px] font-medium">
                  Se imprimen los {PRINT_LIMIT} movimientos más recientes; hay más con estos filtros. Acota el período para ver el resto.
                </p>
              ) : null}
            </>
          )}
        </div>
      </article>
    </div>,
    document.body,
  );
}
