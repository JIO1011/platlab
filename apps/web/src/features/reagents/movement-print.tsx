import { Quantity, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import { useState } from 'react';
import { formatDateTime, formatShortDate } from '../../app/format';
import { PrintDialog, printCell, printHead } from '../../app/print-dialog';
import { PRINT_LIMIT, usePrintRows } from '../../app/print-rows';
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

/**
 * Vista imprimible de Movimientos (R-01C, ADR 0014): el espacio, el período y los filtros en texto y,
 * en Detalle, una tabla con todas las páginas de la consulta actual (hasta 1.000 filas) o, en Totales,
 * la tabla de totales. Es el mismo caché que la lista: no pide nada nuevo, solo termina de cargarla.
 * El diálogo, el foco y la hoja A4 son los de `PrintDialog`.
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
  const [printedAt] = useState(() => new Date().toISOString());

  const { isSuccess, isError, isPlaceholderData } = operations;
  const { rows, loadedCount, hasMore, loadingMore } = usePrintRows(operations, view === 'detail');

  const ready =
    view === 'detail'
      ? isSuccess && !isPlaceholderData && !loadingMore
      : operationTotals.isSuccess && !operationTotals.isPlaceholderData;
  const hasContent = view === 'detail' ? rows.length > 0 : (operationTotals.data?.groups.length ?? 0) > 0;
  const failed = view === 'detail' ? isError : operationTotals.isError;

  const productName = (id: string) =>
    operationFacets.data?.products.options.find((option) => option.id === id)?.name ?? productList.find((product) => product.id === id)?.name;
  const lines = filterLines(filters, operationFacets.data, productName);
  const count = view === 'detail' ? (total ?? rows.length) : total;

  return (
    <PrintDialog
      workspaceName={me.workspace.name}
      title="Movimientos de reactivos"
      facts={[
        { term: 'Período', detail: periodText(filters.period, currentYear) },
        {
          term: 'Filtros',
          detail:
            lines.length === 0 ? (
              'Sin filtros'
            ) : (
              <ul>
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ),
        },
        {
          term: 'Informe',
          detail: `${view === 'detail' ? 'Detalle' : `Totales por ${groupNames[filters.groupBy].toLowerCase()}`}${count === undefined ? '' : ` · ${movementsText(count)}`}`,
        },
        { term: 'Impreso', detail: formatDateTime(printedAt, timeZone) },
      ]}
      closeLabel="Volver a Movimientos"
      loadingText={`Cargando movimientos… ${view === 'detail' ? loadedCount : ''}`}
      ready={ready}
      failed={failed}
      hasContent={hasContent}
      onClose={onClose}
    >
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
                  <TableHeader key={title} numeric={title === 'Cantidad'} className={printHead}>
                    {title}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((operation) => (
                <TableRow key={operation.entryId} className="break-inside-avoid hover:bg-transparent">
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>
                    {formatShortDate(dayKey(new Date(operation.effectiveAt), timeZone))} {hourOf(operation.effectiveAt, timeZone)}
                  </TableCell>
                  <TableCell className={printCell}>{typeSingular[operation.type]}</TableCell>
                  <TableCell className={cn(printCell, 'font-medium')}>{tight(operation.product.name)}</TableCell>
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>{operation.container?.code ?? operation.lot.code}</TableCell>
                  <TableCell numeric className={cn(printCell, 'font-semibold')}>
                    <Quantity value={operation.quantity} unit={operation.unit} signed />
                  </TableCell>
                  <TableCell className={printCell}>{purposeOf(operation) ?? '—'}</TableCell>
                  <TableCell className={printCell}>{responsibleOf(operation)}</TableCell>
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
    </PrintDialog>
  );
}
