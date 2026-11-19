import type pg from 'pg';
import type { z } from 'zod';
import type {
  materialListQuery,
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
import { listMaterials, type IListMaterialsResult } from '../infrastructure/products.queries.js';
import { unitEditable } from './catalog.js';
import { inventoryContext, runQuery, type QueryRequest } from './command.js';

/** Consultas de Materiales: catálogo con sus existencias y las posiciones por ubicación. */

const toStockedMaterial = (row: IListMaterialsResult): StockedMaterial => ({
  id: row.id,
  code: row.code,
  name: row.name,
  class: row.class as MaterialClass,
  baseUnit: row.base_unit,
  minimum: row.minimum,
  balance: row.balance,
  locationsWithStock: row.locations_with_stock,
  belowMinimum: row.below_minimum,
});

const catalogPage = (access: Parameters<typeof inventoryContext>[0], params: { productId: string | null; q: string | null; after: string[] | null; limit: number }) =>
  listMaterials.run(
    {
      workspaceId: access.workspace.id,
      productId: params.productId,
      q: params.q,
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
    const [row] = await catalogPage(access, { productId, q: null, after: null, limit: 1 });
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
        unit: position.unit,
      })),
      nextCursor: page.nextCursor,
    };
  });
}
