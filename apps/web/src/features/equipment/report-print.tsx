import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import { useState } from 'react';
import { formatDateTime } from '../../app/format';
import { PrintDialog, printCell, printHead } from '../../app/print-dialog';
import { PRINT_LIMIT, usePrintRows } from '../../app/print-rows';
import { QueryErrorState } from '../../app/states';
import type { ActiveFilter } from './active-filters';
import { assetsText, conditionLabel, placeLines } from './asset-text';
import { useEquipment } from './context';
import type { useAssets } from './queries';

const columns = ['Código', 'Nombre', 'Tipo', 'Ubicación', 'Estado', 'Responsable'];

/** Los filtros activos en palabras, uno por grupo («Estado: Operativo, Uso limitado»). */
function filterLines(filters: ActiveFilter[]): string[] {
  const groups = new Map<string, string[]>();
  for (const filter of filters) groups.set(filter.group, [...(groups.get(filter.group) ?? []), filter.label]);
  return [...groups].map(([group, labels]) => `${group}: ${labels.join(', ')}`);
}

/**
 * Vista imprimible del Informe (E-01c, ADR 0019): el espacio, la fecha y los filtros en texto y una tabla A4
 * apaisada con todas las páginas de la consulta actual (hasta 1.000 equipos). Es el mismo caché que la
 * lista: no pide nada nuevo, solo termina de cargarla. El diálogo y la hoja son los de `PrintDialog`.
 */
export function ReportPrint({
  assets,
  filters,
  onClose,
}: {
  assets: ReturnType<typeof useAssets>;
  filters: ActiveFilter[];
  onClose: () => void;
}) {
  const { me } = useEquipment();
  const [printedAt] = useState(() => new Date().toISOString());
  const { rows, loadedCount, hasMore, loadingMore } = usePrintRows(assets);

  const ready = assets.isSuccess && !assets.isPlaceholderData && !loadingMore;
  const lines = filterLines(filters);

  return (
    <PrintDialog
      workspaceName={me.workspace.name}
      title="Informe de equipos"
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
        { term: 'Equipos', detail: ready ? assetsText(rows.length, hasMore) : 'Cargando…' },
        { term: 'Impreso', detail: formatDateTime(printedAt, me.workspace.timeZone) },
      ]}
      closeLabel="Volver al Informe"
      loadingText={`Cargando equipos… ${loadedCount}`}
      ready={ready}
      failed={assets.isError}
      hasContent={rows.length > 0}
      landscape
      onClose={onClose}
    >
      {assets.isError ? (
        <QueryErrorState error={assets.error} onRetry={() => void assets.refetch()} />
      ) : !ready ? (
        <p className="py-8 text-center text-sm text-ink-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No hay equipos con estos filtros.</p>
      ) : (
        <>
          <Table className="text-[12px]">
            <caption className="sr-only">Equipos</caption>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                {columns.map((title) => (
                  <TableHeader key={title} className={printHead}>
                    {title}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((asset) => (
                <TableRow key={asset.id} className="break-inside-avoid hover:bg-transparent">
                  <TableCell className={cn(printCell, 'whitespace-nowrap font-mono tabular-nums')}>{asset.code}</TableCell>
                  <TableCell className={cn(printCell, 'font-medium')}>{asset.name}</TableCell>
                  <TableCell className={printCell}>{asset.type.name}</TableCell>
                  <TableCell className={printCell}>{placeLines(asset.location).full}</TableCell>
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>{conditionLabel[asset.condition]}</TableCell>
                  <TableCell className={printCell}>{asset.responsible?.name ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasMore ? (
            <p className="mt-3 text-[12px] font-medium">
              Se imprimen los primeros {PRINT_LIMIT} equipos por código; hay más con estos filtros. Acota los filtros para ver el resto.
            </p>
          ) : null}
        </>
      )}
    </PrintDialog>
  );
}
