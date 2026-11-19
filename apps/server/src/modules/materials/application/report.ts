import type { Writable } from 'node:stream';
import type pg from 'pg';
import {
  issuePurposeLabel,
  materialMovementKindLabel,
  type MaterialMovement,
  type MaterialMovementFilters,
  type MaterialMovementList,
  type MaterialsReport,
  type materialMovementQuery,
} from '@platlab/contracts';
import type { z } from 'zod';
import { startReport, type ReportColumn } from '../../../platform/export/report.js';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import { recordAudit, requirePermission, type WorkspaceAccess } from '../../core/index.js';
import { listMaterialMovements, materialsReport, type IListMaterialMovementsResult } from '../infrastructure/report.queries.js';
import { REPORT, runQuery, type QueryRequest } from './command.js';
import { expiringBy } from './queries.js';

/** Renglones por lote: el Excel sale por partes, sin cargar el libro entero (ADR 0017). */
const EXPORT_BATCH = 500;

const toMovement = (row: IListMaterialMovementsResult): MaterialMovement => ({
  id: row.id,
  kind: row.kind as MaterialMovement['kind'],
  at: row.at.toISOString(),
  product: { id: row.product_id, code: row.product_code, name: row.product_name, class: row.product_class as MaterialMovement['product']['class'] },
  place: row.place,
  lot: row.lot,
  quantity: row.quantity,
  unit: row.unit,
  reference: row.reference,
  person: row.person ?? null,
  actor: row.actor ?? null,
  purpose: row.purpose as MaterialMovement['purpose'],
  outcome: row.outcome as MaterialMovement['outcome'],
  detail: row.detail,
});

const rows = (access: WorkspaceAccess, filters: MaterialMovementFilters, after: string[] | null, limit: number) =>
  listMaterialMovements.run(
    {
      workspaceId: access.workspace.id,
      timeZone: access.workspace.timeZone,
      kind: filters.kind ?? null,
      purpose: filters.purpose ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null,
      q: filters.q ?? null,
      beforeAt: after?.[0] ?? null,
      beforeId: after?.[1] ?? null,
      limit,
    },
    access.client,
  );

/** El libro de Materiales (MA-01d), del más nuevo al más viejo, con sus filtros. */
export function listMovementPage(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof materialMovementQuery>): Promise<MaterialMovementList> {
  return runQuery(pool, request, async (access) => {
    const { cursor, limit, ...filters } = query;
    const found = await rows(access, filters, decodeCursor(cursor, 2), limit + 1);
    const visible = found.slice(0, limit);
    const last = visible.at(-1);
    return {
      items: visible.map(toMovement),
      nextCursor: found.length > limit && last ? encodeCursor([last.cursor_at, last.id]) : null,
    };
  });
}

/** El estado por clase, hoy (MA-01d). */
export function getReport(pool: pg.Pool, request: QueryRequest): Promise<MaterialsReport> {
  return runQuery(pool, request, async (access) => {
    const [row] = await materialsReport.run({ workspaceId: access.workspace.id, expiringBy: expiringBy(access) }, access.client);
    if (!row) throw new Error('El informe no devolvió fila');
    return {
      consumable: { materials: row.consumables, belowMinimum: row.below_minimum, expiring: row.expiring, empty: row.empty },
      reusable: { materials: row.reusables, onShelf: row.on_shelf, lent: row.lent, writtenOff: row.written_off },
    };
  });
}

/** Fecha y hora en la zona del espacio: «19/10/26, 10:21». */
const dateTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

const outcomeLabel = { damaged: 'Dañado', lost: 'Perdido' } as const;

/** Columnas del Excel del libro: todo lo que muestra la pantalla, con la cantidad como número exacto y con signo. */
const columns = (timeZone: string): ReportColumn<MaterialMovement>[] => [
  ['Fecha', 16, (row) => dateTime(row.at, timeZone)],
  ['Movimiento', 12, (row) => materialMovementKindLabel[row.kind]],
  ['Código', 12, (row) => row.product.code],
  ['Material', 32, (row) => row.product.name],
  ['Ubicación', 20, (row) => row.place],
  ['Lote', 12, (row) => row.lot],
  ['Cantidad', 11, (row) => ({ number: row.quantity })],
  ['Unidad', 9, (row) => row.unit],
  ['Referencia', 22, (row) => row.reference],
  ['Persona', 22, (row) => row.person],
  ['Tipo de salida', 13, (row) => (row.purpose ? issuePurposeLabel[row.purpose] : null)],
  ['Detalle', 40, (row) => [row.outcome ? outcomeLabel[row.outcome] : null, row.detail].filter(Boolean).join(': ') || null],
  ['Registró', 22, (row) => row.actor],
];

/** Los filtros en palabras para el encabezado: «Movimiento: Salida · Periodo: 2026-11-01 a 2026-11-18». */
function filtersText(filters: MaterialMovementFilters): string {
  const parts: string[] = [];
  if (filters.kind) parts.push(`Movimiento: ${materialMovementKindLabel[filters.kind]}`);
  if (filters.from || filters.to) parts.push(`Periodo: ${filters.from ?? 'el inicio'} a ${filters.to ?? 'hoy'}`);
  if (filters.purpose) parts.push(`Tipo de salida: ${issuePurposeLabel[filters.purpose]}`);
  if (filters.q) parts.push(`Búsqueda: «${filters.q}»`);
  return parts.length > 0 ? parts.join(' · ') : 'ninguno';
}

/**
 * Excel del libro de Materiales (MA-01d), del Administrador: lo filtrado, con el espacio, la fecha, quién lo generó y
 * los filtros en el encabezado. Es un reporte (01 §5) y queda en la auditoría. Abre el destino solo después de
 * autorizar; el archivo se completa tras confirmar la auditoría.
 */
export async function exportMovements(pool: pg.Pool, request: QueryRequest, filters: MaterialMovementFilters, open: (fileName: string) => Writable): Promise<void> {
  const sheet = await runQuery(pool, request, async (access) => {
    await requirePermission(access, REPORT);
    const book = await startReport(open, {
      fileName: 'libro-materiales',
      sheetName: 'Movimientos',
      title: 'Libro de movimientos de Materiales',
      workspace: access.workspace,
      author: access.displayName,
      filters: filtersText(filters),
      columns: columns(access.workspace.timeZone),
    });
    let count = 0;
    let after: string[] | null = null;
    for (;;) {
      const batch = await rows(access, filters, after, EXPORT_BATCH);
      for (const row of batch) await book.add(toMovement(row));
      count += batch.length;
      const last = batch.at(-1);
      if (batch.length < EXPORT_BATCH || !last) break;
      after = [last.cursor_at, last.id];
    }
    await recordAudit(access, { action: 'materials.movements.export', entityType: 'materials.movements', changes: { format: 'xlsx', filters, rows: count } });
    return book;
  });
  // El cierre del archivo sale después de confirmar la auditoría: sin ella, la descarga queda incompleta.
  await sheet.end();
}
