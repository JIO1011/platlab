import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn, formatDecimal } from '@platlab/ui';
import { useState } from 'react';
import { formatDateTime, formatShortDate } from '../../app/format';
import { PrintDialog, printCell, printHead } from '../../app/print-dialog';
import { PRINT_LIMIT, usePrintRows } from '../../app/print-rows';
import { QueryErrorState } from '../../app/states';
import { useMaintenance } from './context';
import type { HistoryFilters } from './history-filters';
import { historyFilterLines, printedWork, recordsText, type HistoryNames } from './history-text';
import type { useRecords } from './queries';
import { resultLabels } from './work-text';

const columns = ['Fecha', 'Equipo', 'Área', 'Trabajo', 'Resultado', 'Quién lo hizo', 'Costo', 'Válida hasta', 'Registró'];

/**
 * Vista imprimible del Historial (M-01d, ADR 0020): el espacio, «Historial de mantenimiento» y los filtros en
 * texto, y una tabla A4 apaisada con todas las páginas de la consulta actual (hasta 1.000 registros). Es el mismo
 * caché que la lista: no pide nada nuevo, solo termina de cargarla. Los anulados siguen a la vista con su marca.
 * El diálogo y la hoja son los de `PrintDialog`.
 */
export function HistoryPrint({
  records,
  filters,
  names,
  namesPending,
  onClose,
}: {
  records: ReturnType<typeof useRecords>;
  filters: HistoryFilters;
  names: HistoryNames;
  /** Los nombres del área o del proveedor filtrado aún llegan: la hoja espera para no imprimir un filtro sin nombre. */
  namesPending: boolean;
  onClose: () => void;
}) {
  const { me } = useMaintenance();
  const [printedAt] = useState(() => new Date().toISOString());
  const { rows, loadedCount, hasMore, loadingMore } = usePrintRows(records);

  const ready = records.isSuccess && !records.isPlaceholderData && !loadingMore && !namesPending;
  const lines = historyFilterLines(filters, names);

  return (
    <PrintDialog
      workspaceName={me.workspace.name}
      title="Historial de mantenimiento"
      facts={[
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
        { term: 'Registros', detail: ready ? recordsText(rows.length, hasMore) : 'Cargando…' },
        { term: 'Impreso', detail: formatDateTime(printedAt, me.workspace.timeZone) },
      ]}
      closeLabel="Volver al Historial"
      loadingText={`Cargando registros… ${loadedCount}`}
      ready={ready}
      failed={records.isError}
      hasContent={rows.length > 0}
      landscape
      onClose={onClose}
    >
      {records.isError ? (
        <QueryErrorState error={records.error} onRetry={() => void records.refetch()} />
      ) : !ready ? (
        <p className="py-8 text-center text-sm text-ink-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No hay registros con estos filtros.</p>
      ) : (
        <>
          <Table className="text-[12px]">
            <caption className="sr-only">Registros de mantenimiento</caption>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                {columns.map((title) => (
                  <TableHeader key={title} className={cn(printHead, title === 'Costo' && 'text-right')}>
                    {title}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((record) => (
                <TableRow key={record.id} className="break-inside-avoid hover:bg-transparent">
                  <TableCell className={cn(printCell, 'whitespace-nowrap tabular-nums')}>{formatShortDate(record.performedOn)}</TableCell>
                  <TableCell className={printCell}>
                    <span className="mr-1 font-mono tabular-nums">{record.asset.code}</span>
                    <span className="font-medium">{record.asset.name}</span>
                  </TableCell>
                  <TableCell className={printCell}>{record.asset.area ?? '—'}</TableCell>
                  <TableCell className={printCell}>{printedWork(record)}</TableCell>
                  <TableCell className={printCell}>{resultLabels[record.result]}</TableCell>
                  <TableCell className={printCell}>{record.provider?.name ?? 'Interno'}</TableCell>
                  <TableCell className={cn(printCell, 'whitespace-nowrap text-right tabular-nums')}>
                    {record.cost ? `$\u00a0${formatDecimal(record.cost)}` : '—'}
                  </TableCell>
                  <TableCell className={cn(printCell, 'whitespace-nowrap tabular-nums')}>
                    {record.validUntil ? formatShortDate(record.validUntil) : '—'}
                  </TableCell>
                  <TableCell className={printCell}>{record.recordedBy?.name ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasMore ? (
            <p className="mt-3 text-[12px] font-medium">
              Se imprimen los primeros {PRINT_LIMIT} registros, del más reciente al más antiguo; hay más con estos filtros. Acota los filtros para ver el resto.
            </p>
          ) : null}
        </>
      )}
    </PrintDialog>
  );
}
