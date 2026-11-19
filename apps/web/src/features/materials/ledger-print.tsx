import { materialMovementKindLabel, type MaterialMovementFilters } from '@platlab/contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn, formatDecimal, unitText } from '@platlab/ui';
import { useState } from 'react';
import { formatDateTime, formatShortDateTime } from '../../app/format';
import { PrintDialog, printCell, printHead } from '../../app/print-dialog';
import { PRINT_LIMIT, usePrintRows } from '../../app/print-rows';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { ledgerFilterLines, movementNote, movementReference } from './ledger-text';
import type { useMovementPage } from './queries';

const columns = ['Fecha', 'Movimiento', 'Código', 'Material', 'Ubicación', 'Cantidad', 'Referencia', 'Detalle'];

/**
 * Vista imprimible del libro de Materiales (MA-01d): el espacio, el título y los filtros en texto, y una tabla A4
 * apaisada con todas las páginas de la consulta actual (hasta 1.000 renglones). Es el mismo caché que la lista: no
 * pide nada nuevo, solo termina de cargarla.
 */
export function LedgerPrint({ movements, filters, onClose }: { movements: ReturnType<typeof useMovementPage>; filters: MaterialMovementFilters; onClose: () => void }) {
  const { me } = useMaterials();
  const timeZone = me.workspace.timeZone;
  const [printedAt] = useState(() => new Date().toISOString());
  const { rows, loadedCount, hasMore, loadingMore } = usePrintRows(movements);
  const ready = movements.isSuccess && !movements.isPlaceholderData && !loadingMore;
  const lines = ledgerFilterLines(filters);
  return (
    <PrintDialog
      workspaceName={me.workspace.name}
      title="Libro de movimientos de Materiales"
      facts={[
        { term: 'Filtros', detail: lines.length === 0 ? 'Sin filtros' : lines.join(' · ') },
        {
          term: 'Movimientos',
          detail: ready ? `${rows.length}${hasMore ? ` (los primeros ${PRINT_LIMIT}; el resto, en el Excel)` : ''}` : 'Cargando…',
        },
        { term: 'Impreso', detail: formatDateTime(printedAt, timeZone) },
      ]}
      closeLabel="Volver a Informes"
      loadingText={`Cargando movimientos… ${loadedCount}`}
      ready={ready}
      failed={movements.isError}
      hasContent={rows.length > 0}
      landscape
      onClose={onClose}
    >
      {movements.isError ? (
        <QueryErrorState error={movements.error} onRetry={() => void movements.refetch()} />
      ) : !ready ? (
        <p className="py-8 text-center text-sm text-ink-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No hay movimientos con estos filtros.</p>
      ) : (
        <Table className="text-[12px]">
          <caption className="sr-only">Movimientos de Materiales</caption>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              {columns.map((title) => (
                <TableHeader key={title} className={cn(printHead, title === 'Cantidad' && 'text-right')}>
                  {title}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="break-inside-avoid">
                <TableCell className={cn(printCell, 'whitespace-nowrap tabular-nums')}>{formatShortDateTime(row.at, timeZone, true)}</TableCell>
                <TableCell className={printCell}>{materialMovementKindLabel[row.kind]}</TableCell>
                <TableCell className={cn(printCell, 'whitespace-nowrap font-mono')}>{row.product.code}</TableCell>
                <TableCell className={printCell}>
                  {row.product.name}
                  {row.lot ? ` · lote ${row.lot}` : ''}
                </TableCell>
                <TableCell className={printCell}>{row.place}</TableCell>
                <TableCell className={cn(printCell, 'whitespace-nowrap text-right tabular-nums')}>
                  {row.quantity.startsWith('-') ? '' : '+'}
                  {formatDecimal(row.quantity)} {unitText(row.unit, row.quantity)}
                </TableCell>
                <TableCell className={printCell}>{movementReference(row)}</TableCell>
                <TableCell className={printCell}>{movementNote(row) ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PrintDialog>
  );
}
