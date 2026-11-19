import type { Writable } from 'node:stream';
import type pg from 'pg';
import {
  issuePurposeLabel,
  materialMovementKindLabel,
  type MaterialListFilters,
  type MaterialMovement,
  type MaterialMovementFilters,
  type StockedMaterial,
} from '@platlab/contracts';
import { startReport, type ReportColumn } from '../../../platform/export/report.js';
import type { XlsxCell } from '../../../platform/export/xlsx.js';
import { activeLocations, recordAudit, requirePermission, type WorkspaceAccess } from '../../core/index.js';
import { materialName, stockPositionsOf, type IStockPositionsOfResult } from '../infrastructure/movements.queries.js';
import { REPORT, runQuery, type QueryRequest } from './command.js';
import { movementRows, toMovement } from './movements.js';
import { catalogPage, toStockedMaterial } from './queries.js';

/** Renglones por lote: el Excel sale por partes, sin cargar todo de una vez (ADR 0017). */
const EXPORT_BATCH = 500;

const classLabel: Record<StockedMaterial['class'], string> = {
  consumable: 'Insumo',
  reusable_counted: 'Reutilizable por cantidad',
  reusable_identified: 'Reutilizable identificado',
};
const outcomeLabel = { damaged: 'Dañado', lost: 'Perdido' } as const;
const amount = (value: string | null): XlsxCell => (value === null ? null : { number: value });

/** Fecha y hora en la zona del espacio: «19/10/26, 10:21». */
const dateTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

/**
 * Un Excel de Materiales (ADR 0022), del Administrador: abre el archivo solo después de autorizar, lo llena por partes,
 * deja la auditoría y lo cierra tras confirmarla; sin ella, la descarga queda incompleta. Es un reporte (01 §5).
 */
async function exportReport(
  pool: pg.Pool,
  request: QueryRequest,
  audit: { action: string; entityType: string; filters: object },
  fill: (access: WorkspaceAccess) => Promise<{ book: { end(): Promise<void> }; rows: number }>,
): Promise<void> {
  const sheet = await runQuery(pool, request, async (access) => {
    await requirePermission(access, REPORT);
    const { book, rows } = await fill(access);
    await recordAudit(access, { action: audit.action, entityType: audit.entityType, changes: { format: 'xlsx', filters: audit.filters, rows } });
    return book;
  });
  await sheet.end();
}

// --- Libro de movimientos ---------------------------------------------------

const movementColumns = (timeZone: string): ReportColumn<MaterialMovement>[] => [
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

/** Los filtros del libro en palabras: «Material: MAT-001 Guantes · Movimiento: Salida · Periodo: … ». */
async function movementFiltersText(access: WorkspaceAccess, filters: MaterialMovementFilters): Promise<string> {
  const parts: string[] = [];
  if (filters.productId) {
    const [item] = await materialName.run({ workspaceId: access.workspace.id, productId: filters.productId }, access.client);
    parts.push(`Material: ${item ? `${item.code} ${item.name}` : 'material no encontrado'}`);
  }
  if (filters.kind) parts.push(`Movimiento: ${materialMovementKindLabel[filters.kind]}`);
  if (filters.from || filters.to) parts.push(`Periodo: ${filters.from ?? 'el inicio'} a ${filters.to ?? 'hoy'}`);
  if (filters.purpose) parts.push(`Tipo de salida: ${issuePurposeLabel[filters.purpose]}`);
  if (filters.q) parts.push(`Búsqueda: «${filters.q}»`);
  return parts.length > 0 ? parts.join(' · ') : 'ninguno';
}

/** Excel del libro de Materiales (MA-01d): lo filtrado, con la cantidad exacta y con signo. */
export function exportMovements(pool: pg.Pool, request: QueryRequest, filters: MaterialMovementFilters, open: (fileName: string) => Writable): Promise<void> {
  return exportReport(pool, request, { action: 'materials.movements.export', entityType: 'materials.movements', filters }, async (access) => {
    const book = await startReport(open, {
      fileName: 'movimientos-materiales',
      sheetName: 'Movimientos',
      title: 'Libro de movimientos de Materiales',
      workspace: access.workspace,
      author: access.displayName,
      filters: await movementFiltersText(access, filters),
      columns: movementColumns(access.workspace.timeZone),
    });
    let rows = 0;
    let after: string[] | null = null;
    for (;;) {
      const batch = await movementRows(access, filters, after, EXPORT_BATCH);
      for (const row of batch) await book.add(toMovement(row));
      rows += batch.length;
      const last = batch.at(-1);
      if (batch.length < EXPORT_BATCH || !last) break;
      after = [last.cursor_at, last.id];
    }
    return { book, rows };
  });
}

// --- Existencias del Inventario ---------------------------------------------

/** Un renglón de existencias: el material con una de sus ubicaciones y lotes, o solo el material si está agotado. */
interface StockRow {
  material: StockedMaterial;
  place: { location: string; lot: string | null; expiresOn: string | null; balance: string; available: string } | null;
}

const stockColumns: ReportColumn<StockRow>[] = [
  ['Código', 12, (row) => row.material.code],
  ['Material', 34, (row) => row.material.name],
  ['Clase', 22, (row) => classLabel[row.material.class]],
  ['Ubicación', 22, (row) => row.place?.location ?? 'Sin existencia'],
  ['Lote', 12, (row) => row.place?.lot ?? null],
  ['Vence el', 12, (row) => (row.place?.expiresOn ? { date: row.place.expiresOn } : null)],
  ['Existencia', 11, (row) => amount(row.place?.balance ?? '0')],
  ['Disponible', 11, (row) => amount(row.place?.available ?? '0')],
  ['Unidad', 9, (row) => row.material.baseUnit],
  ['Mínimo del material', 12, (row) => amount(row.material.minimum)],
];

const stockLabels = { 'below-minimum': 'Bajo mínimo', expiring: 'Por vencer' } as const;

async function stockFiltersText(access: WorkspaceAccess, filters: MaterialListFilters): Promise<string> {
  const parts: string[] = [];
  if (filters.q) parts.push(`Búsqueda: «${filters.q}»`);
  if (filters.class) parts.push(`Clase: ${classLabel[filters.class]}`);
  if (filters.areaId) {
    const area = (await activeLocations(access)).find((location) => location.id === filters.areaId);
    parts.push(`Área: ${area?.name ?? 'área archivada'}`);
  }
  if (filters.stock) parts.push(stockLabels[filters.stock]);
  return parts.length > 0 ? parts.join(' · ') : 'ninguno';
}

/**
 * Excel de existencias del Inventario: lo filtrado en la pantalla, un renglón por ubicación y lote con saldo (lo que
 * vence antes primero), o uno con «Sin existencia» si está agotado. Es la planilla que el laboratorio llevaba a mano.
 */
export function exportStock(pool: pg.Pool, request: QueryRequest, filters: MaterialListFilters, open: (fileName: string) => Writable): Promise<void> {
  return exportReport(pool, request, { action: 'materials.stock.export', entityType: 'materials.stock', filters }, async (access) => {
    const book = await startReport(open, {
      fileName: 'existencias-materiales',
      sheetName: 'Existencias',
      title: 'Existencias de Materiales',
      workspace: access.workspace,
      author: access.displayName,
      filters: await stockFiltersText(access, filters),
      columns: stockColumns,
    });
    let rows = 0;
    let after: string[] | null = null;
    for (;;) {
      const batch = await catalogPage(access, {
        productId: null,
        q: filters.q ?? null,
        materialClass: filters.class ?? null,
        areaId: filters.areaId ?? null,
        stock: filters.stock ?? null,
        after,
        limit: EXPORT_BATCH,
      });
      const places = new Map<string, IStockPositionsOfResult[]>();
      for (const place of await stockPositionsOf.run({ workspaceId: access.workspace.id, itemIds: batch.map((row) => row.id) }, access.client)) {
        places.set(place.item_id, [...(places.get(place.item_id) ?? []), place]);
      }
      for (const row of batch) {
        const material = toStockedMaterial(row);
        const own = places.get(row.id) ?? [];
        if (own.length === 0) await book.add({ material, place: null });
        for (const place of own) {
          await book.add({
            material,
            place: { location: place.location_name, lot: place.supplier_lot, expiresOn: place.expires_on, balance: place.balance, available: place.available },
          });
        }
        rows += Math.max(own.length, 1);
      }
      const last = batch.at(-1);
      if (batch.length < EXPORT_BATCH || !last) break;
      after = [last.sort_code, last.id];
    }
    return { book, rows };
  });
}
