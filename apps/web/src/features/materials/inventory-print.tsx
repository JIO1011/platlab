import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn, formatDecimal, unitText } from '@platlab/ui';
import { useState } from 'react';
import { formatDate, formatDateTime } from '../../app/format';
import { PrintDialog, printCell, printHead } from '../../app/print-dialog';
import { PRINT_LIMIT, usePrintRows } from '../../app/print-rows';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import type { useMaterialPage } from './queries';
import { classLabels, lentOut, materialStatus } from './text';

const columns = ['Código', 'Material', 'Clase', 'Ubicaciones', 'Existencia', 'Disponible', 'En préstamo', 'Mínimo', 'Vence primero', 'Estado'];
const numeric = new Set(['Existencia', 'Disponible', 'En préstamo', 'Mínimo']);

const amount = (value: string, unit: string) => `${formatDecimal(value)} ${unitText(unit, value)}`;

/**
 * Vista imprimible del Inventario: el espacio, «Existencias de Materiales», los filtros en texto y una tabla A4 apaisada
 * con lo filtrado (hasta 1.000 materiales). Es el mismo caché que la lista: solo termina de cargarla. El detalle por lote
 * y ubicación va en el Excel.
 */
export function InventoryPrint({ materials, filterLines, onClose }: { materials: ReturnType<typeof useMaterialPage>; filterLines: string[]; onClose: () => void }) {
  const { me } = useMaterials();
  const [printedAt] = useState(() => new Date().toISOString());
  const { rows, loadedCount, hasMore, loadingMore } = usePrintRows(materials);
  const ready = materials.isSuccess && !materials.isPlaceholderData && !loadingMore;
  return (
    <PrintDialog
      workspaceName={me.workspace.name}
      title="Existencias de Materiales"
      facts={[
        { term: 'Filtros', detail: filterLines.length === 0 ? 'Sin filtros' : filterLines.join(' · ') },
        { term: 'Materiales', detail: ready ? `${rows.length}${hasMore ? ` (los primeros ${PRINT_LIMIT}; el resto, en el Excel)` : ''}` : 'Cargando…' },
        { term: 'Impreso', detail: formatDateTime(printedAt, me.workspace.timeZone) },
      ]}
      closeLabel="Volver al Inventario"
      loadingText={`Cargando materiales… ${loadedCount}`}
      ready={ready}
      failed={materials.isError}
      hasContent={rows.length > 0}
      landscape
      onClose={onClose}
    >
      {materials.isError ? (
        <QueryErrorState error={materials.error} onRetry={() => void materials.refetch()} />
      ) : !ready ? (
        <p className="py-8 text-center text-sm text-ink-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No hay materiales con estos filtros.</p>
      ) : (
        <Table className="text-[12px]">
          <caption className="sr-only">Existencias de Materiales</caption>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              {columns.map((title) => (
                <TableHeader key={title} className={cn(printHead, numeric.has(title) && 'text-right')}>
                  {title}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((material) => (
              <TableRow key={material.id} className="break-inside-avoid">
                <TableCell className={cn(printCell, 'whitespace-nowrap font-mono')}>{material.code}</TableCell>
                <TableCell className={printCell}>{material.name}</TableCell>
                <TableCell className={printCell}>{classLabels[material.class]}</TableCell>
                <TableCell className={printCell}>{material.locationNames.join(', ') || '—'}</TableCell>
                <TableCell className={cn(printCell, 'whitespace-nowrap text-right tabular-nums')}>{amount(material.balance, material.baseUnit)}</TableCell>
                <TableCell className={cn(printCell, 'whitespace-nowrap text-right tabular-nums')}>{amount(material.available, material.baseUnit)}</TableCell>
                <TableCell className={cn(printCell, 'whitespace-nowrap text-right tabular-nums')}>
                  {amount(lentOut(material.balance, material.available), material.baseUnit)}
                </TableCell>
                <TableCell className={cn(printCell, 'whitespace-nowrap text-right tabular-nums')}>
                  {material.minimum ? amount(material.minimum, material.baseUnit) : '—'}
                </TableCell>
                <TableCell className={cn(printCell, 'whitespace-nowrap')}>{material.nextExpiry ? formatDate(material.nextExpiry) : '—'}</TableCell>
                <TableCell className={printCell}>{materialStatus(material).label}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PrintDialog>
  );
}
