import type { Writable } from 'node:stream';
import type pg from 'pg';
import type { z } from 'zod';
import type { Operation, OperationFacets, operationExportQuery } from '@platlab/contracts';
import { listOperationPage, operationFacetsOf, type InventoryContext, type OperationFilter } from '../../../capabilities/inventory/index.js';
import { writeXlsx, type XlsxCell } from '../../../platform/export/xlsx.js';
import { recordAudit, requirePermission, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import { listProductSafety } from '../infrastructure/products.queries.js';
import { inventoryContext } from './command.js';
import { operationFilter, REPORT, runQuery } from './queries.js';

type ExportQuery = z.infer<typeof operationExportQuery>;

/** Asientos por lote: el Excel sale por partes, sin cargar el libro entero (ADR 0017). */
const EXPORT_BATCH = 500;

const typeLabel: Record<Operation['type'], string> = { receipt: 'Ingreso', issue: 'Salida', adjustment: 'Ajuste', transfer: 'Traslado' };

/** Día civil (`YYYY-MM-DD`) y hora («14:05») en la zona del espacio. */
const dayIn = (iso: string, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));
const hourIn = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('es-EC', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const stamp = (timeZone: string) => new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'short', timeStyle: 'short' }).format(new Date());

/** Un asiento con la marca «Controlado» de su reactivo, que es de la ficha química y no de la capacidad (ADR 0015). */
interface Row {
  operation: Operation;
  controlled: boolean;
}

/**
 * Columnas del Excel de Movimientos (ADR 0021): todo lo que el asiento guarda, con su ancho en caracteres. Las
 * cantidades van con signo y como número decimal exacto; «Controlado» sirve al reporte de controlados (ADR 0016).
 */
const columns = (timeZone: string): Array<[title: string, width: number, value: (row: Row) => XlsxCell]> => [
  ['Fecha', 12, ({ operation }) => ({ date: dayIn(operation.effectiveAt, timeZone) })],
  ['Hora', 7, ({ operation }) => hourIn(operation.effectiveAt, timeZone)],
  ['Tipo', 10, ({ operation }) => typeLabel[operation.type]],
  ['Código del reactivo', 14, ({ operation }) => operation.product.code],
  ['Reactivo', 30, ({ operation }) => operation.product.name],
  ['Controlado', 11, ({ controlled }) => (controlled ? 'Sí' : 'No')],
  ['Frasco', 18, ({ operation }) => operation.container?.code ?? null],
  ['Lote', 18, ({ operation }) => operation.lot.code],
  ['Ubicación', 30, ({ operation }) => (operation.location.path.length > 0 ? operation.location.path.join(' › ') : operation.location.name)],
  ['Cantidad', 12, ({ operation }) => ({ number: operation.quantity })],
  ['Saldo después', 13, ({ operation }) => ({ number: operation.balanceAfter })],
  ['Unidad', 7, ({ operation }) => operation.unit],
  ['Motivo', 28, ({ operation }) => operation.reason],
  ['Destino', 24, ({ operation }) => operation.destination],
  ['Referencia', 20, ({ operation }) => operation.reference],
  ['Responsable', 24, ({ operation }) => operation.actor.displayName ?? 'Miembro anterior'],
  ['Pidió', 24, ({ operation }) => (operation.requestedBy ? (operation.requestedBy.displayName ?? 'Miembro anterior') : null)],
];

/** Los nombres de lo elegido, por las facetas, que siempre traen las opciones elegidas aunque queden en cero. */
const namesOf = (ids: readonly string[], options: ReadonlyArray<[id: string, name: string | null]>, missing: string) => {
  const names = new Map(options);
  return ids.map((id) => names.get(id) ?? missing).join(', ');
};

/** Los filtros en palabras para el encabezado: «Periodo: últimos 30 días · Tipo: Salida». */
async function filtersText(ctx: InventoryContext, query: ExportQuery, filter: OperationFilter): Promise<string> {
  const parts: string[] = [];
  if (query.days) parts.push(`Periodo: últimos ${query.days} días`);
  else if (query.from || query.to) parts.push(`Periodo: ${query.from ?? 'el inicio'} a ${query.to ?? 'hoy'}`);
  if (query.type) parts.push(`Tipo: ${query.type.map((type) => typeLabel[type]).join(', ')}`);
  let facets: OperationFacets | null = null;
  if (query.productId || query.responsibleId || query.locationId) facets = await operationFacetsOf(ctx, filter);
  if (query.productId && facets) {
    parts.push(`Reactivo: ${namesOf(query.productId, facets.products.options.map((option) => [option.id, option.name]), 'reactivo no encontrado')}`);
  }
  if (query.responsibleId && facets) {
    const options = facets.responsibles.map((option): [string, string] => [option.principalId, option.displayName ?? 'Miembro anterior']);
    parts.push(`Responsable: ${namesOf(query.responsibleId, options, 'miembro anterior')}`);
  }
  if (query.destination) parts.push(`Destino: ${query.destination.join(', ')}`);
  if (query.reason) parts.push(`Motivo: ${query.reason.join(', ')}`);
  if (query.locationId && facets) {
    parts.push(`Ubicación: ${namesOf(query.locationId, facets.locations.map((option) => [option.id, option.name]), 'ubicación archivada')}`);
  }
  if (query.positionId) parts.push('Un solo frasco');
  return parts.length > 0 ? parts.join(' · ') : 'ninguno';
}

/**
 * Excel de Movimientos (ADR 0021; el pendiente de R-01B, ADR 0017), de quien tiene el reporte: lo filtrado, en el
 * ámbito de ubicaciones del miembro, con el espacio, la fecha, quién lo generó y los filtros en el encabezado. Queda
 * en la auditoría. Abre el destino solo después de autorizar, así un rechazo responde con su error; si algo falla
 * después, revierte, y el archivo solo se completa tras confirmar la auditoría.
 */
export async function exportOperations(
  pool: pg.Pool,
  request: QueryRequest,
  query: ExportQuery,
  open: (fileName: string) => Writable,
): Promise<void> {
  const sheet = await runQuery(pool, request, async (access: WorkspaceAccess) => {
    await requirePermission(access, REPORT);
    const { timeZone } = access.workspace;
    const ctx = inventoryContext(access);
    const filter = operationFilter(access, query);
    const filterLine = await filtersText(ctx, query, filter);
    const sheetColumns = columns(timeZone);
    const book = writeXlsx(open(`movimientos-reactivos-${dayIn(new Date().toISOString(), timeZone)}.xlsx`), {
      sheetName: 'Movimientos',
      widths: sheetColumns.map(([, width]) => width),
    });
    await book.row(['Movimientos de reactivos'], { bold: true });
    await book.row([`Espacio: ${access.workspace.name}`]);
    await book.row([`Generado el ${stamp(timeZone)} por ${access.displayName}`]);
    await book.row([`Filtros: ${filterLine}`]);
    await book.row([]);
    await book.row(
      sheetColumns.map(([title]) => title),
      { bold: true },
    );

    // «Controlado» por reactivo, pedido una vez por reactivo nuevo de cada lote.
    const controlled = new Map<string, boolean>();
    let cursor: string | undefined;
    let rows = 0;
    do {
      const page = await listOperationPage(ctx, { ...filter, cursor, limit: EXPORT_BATCH });
      const unknown = [...new Set(page.items.map((operation) => operation.product.id))].filter((id) => !controlled.has(id));
      if (unknown.length > 0) {
        const safety = await listProductSafety.run({ workspaceId: access.workspace.id, itemIds: unknown }, access.client);
        for (const id of unknown) controlled.set(id, false);
        for (const row of safety) controlled.set(row.item_id, row.controlled);
      }
      for (const operation of page.items) {
        await book.row(sheetColumns.map(([, , value]) => value({ operation, controlled: controlled.get(operation.product.id) === true })));
      }
      rows += page.items.length;
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    await recordAudit(access, {
      action: 'reagents.movements.export',
      entityType: 'reagents.movements',
      changes: { format: 'xlsx', filters: query, rows },
    });
    return book;
  });
  // El cierre del archivo sale después de confirmar la auditoría: sin ella, la descarga queda incompleta.
  await sheet.end();
}
