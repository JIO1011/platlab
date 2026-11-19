import type pg from 'pg';
import type { z } from 'zod';
import { subtractDecimals } from '@platlab/contracts';
import type {
  LocationList,
  MaterialAreaList,
  materialListQuery,
  MaterialsSummary,
  materialStockQuery,
  MaterialDetail,
  MaterialList,
  MaterialStockList,
  StockedMaterial,
  MaterialClass,
} from '@platlab/contracts';
import { listPositionPage } from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import { listMaterialAreas, listMaterials, type IListMaterialsResult } from '../infrastructure/products.queries.js';
import { activeLocations, hasPermission, type HomeContribution, type WorkspaceAccess } from '../../core/index.js';
import { materialsSummary } from '../infrastructure/summary.queries.js';
import { unitEditable } from './catalog.js';
import { inventoryContext, RECEIPT, runQuery, type QueryRequest } from './command.js';

/** Consultas de Materiales: catálogo con sus existencias y las posiciones por ubicación. */

const toStockedMaterial = (row: IListMaterialsResult): StockedMaterial => ({
  id: row.id,
  code: row.code,
  name: row.name,
  class: row.class as MaterialClass,
  baseUnit: row.base_unit,
  minimum: row.minimum,
  balance: row.balance,
  available: row.available,
  locationsWithStock: row.locations_with_stock,
  locationNames: row.location_names,
  belowMinimum: row.below_minimum,
});

const catalogPage = (access: Parameters<typeof inventoryContext>[0], params: { productId: string | null; q: string | null; materialClass: MaterialClass | null; areaId: string | null; stock: 'below-minimum' | null; after: string[] | null; limit: number }) =>
  listMaterials.run(
    {
      workspaceId: access.workspace.id,
      productId: params.productId,
      q: params.q,
      class: params.materialClass,
      areaId: params.areaId,
      stock: params.stock,
      afterCode: params.after?.[0] ?? null,
      afterId: params.after?.[1] ?? null,
      limit: params.limit,
    },
    access.client,
  );

/** El catálogo del espacio con su existencia total, paginado por código. */
export function listProducts(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof materialListQuery>): Promise<MaterialList> {
  return runQuery(pool, request, async (access) => {
    const rows = await catalogPage(access, {
      productId: null,
      q: query.q ?? null,
      materialClass: query.class ?? null,
      areaId: query.areaId ?? null,
      stock: query.stock ?? null,
      after: decodeCursor(query.cursor, 2),
      limit: query.limit + 1,
    });
    const visible = rows.slice(0, query.limit);
    const last = visible.at(-1);
    return {
      items: visible.map(toStockedMaterial),
      nextCursor: rows.length > query.limit && last ? encodeCursor([last.sort_code, last.id]) : null,
    };
  });
}

/** Ficha de un material: su total y si su unidad aún puede cambiar. */
export function getProduct(pool: pg.Pool, request: QueryRequest, productId: string): Promise<MaterialDetail> {
  return runQuery(pool, request, async (access) => {
    const [row] = await catalogPage(access, { productId, q: null, materialClass: null, areaId: null, stock: null, after: null, limit: 1 });
    if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    return { ...toStockedMaterial(row), unitEditable: await unitEditable(access, productId) };
  });
}

/** Existencias por ubicación, de un material o de todos: de aquí salen las posiciones de salidas y ajustes. */
export function listStock(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof materialStockQuery>): Promise<MaterialStockList> {
  return runQuery(pool, request, async (access) => {
    const page = await listPositionPage(inventoryContext(access), {
      itemId: query.productId,
      locationId: query.locationId,
      cursor: query.cursor,
      limit: query.limit,
    });
    return {
      items: page.items.map((position) => ({
        positionId: position.id,
        productId: position.product.id,
        locationId: position.location.id,
        locationName: position.location.name,
        locationPath: position.location.path,
        balance: position.balance,
        available: subtractDecimals(position.balance, position.reserved),
        unit: position.unit,
      })),
      nextCursor: page.nextCursor,
    };
  });
}

/** Las cifras del Resumen; la tarjeta de Inicio las reutiliza. */
export async function summaryOf(access: WorkspaceAccess): Promise<MaterialsSummary> {
  const [row] = await materialsSummary.run({ workspaceId: access.workspace.id, timeZone: access.workspace.timeZone }, access.client);
  if (!row) throw new Error('El resumen de Materiales no devolvió fila');
  return { materials: row.materials, belowMinimum: row.below_minimum, openLoans: row.open_loans, overdueLoans: row.overdue_loans };
}

export const getSummary = (pool: pg.Pool, request: QueryRequest): Promise<MaterialsSummary> => runQuery(pool, request, summaryOf);

/** Lo que Materiales aporta a su tarjeta de Inicio: las mismas cifras, sin actividad ni gráfico por ahora. */
export async function materialsHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  return { summary: { ...(await summaryOf(access)) }, activity: [], trend: null };
}

/** Ubicaciones activas donde el miembro registra ingresos; sin el permiso de ingreso, ninguna (ADR 0008). */
export function listReceiptLocations(pool: pg.Pool, request: QueryRequest): Promise<LocationList> {
  return runQuery(pool, request, async (access) => ({ items: (await hasPermission(access, RECEIPT)) ? await activeLocations(access) : [] }));
}

/** Las áreas con material en existencia, para el Inventario «Por ubicación». */
export function listAreas(pool: pg.Pool, request: QueryRequest): Promise<MaterialAreaList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listMaterialAreas.run({ workspaceId: access.workspace.id }, access.client);
    return { items: rows.map((row) => ({ id: row.id, name: row.name, materials: row.materials, lentMaterials: row.lent_materials })) };
  });
}
