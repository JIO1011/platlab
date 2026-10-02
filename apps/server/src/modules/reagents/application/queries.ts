import type pg from 'pg';
import type { z } from 'zod';
import type {
  LocationList,
  LotList,
  OperationList,
  operationListQuery,
  PositionList,
  positionListQuery,
  ProductList,
  productListQuery,
  Product,
} from '@platlab/contracts';
import { countOperationsPerDay, listOperationPage, listPositionPage } from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import {
  permissionScope,
  requirePermission,
  withModuleAccess,
  type HomeContribution,
  type WorkspaceAccess,
} from '../../core/index.js';
import {
  homeSummary,
  listLocationsIn,
  listProductLots,
  listProducts as listProductsQuery,
} from '../infrastructure/products.queries.js';
import { inventoryContext } from './commands.js';

const READ = 'reagents.catalog.read';
/** Ventana del gráfico de salidas del resumen (ADR 0011). */
const TREND_DAYS = 30;

interface QueryRequest {
  subject: string;
  workspaceId: string;
}

/** Consultas de Reactivos: admisión de consulta y lectura del catálogo en algún ámbito. */
function runQuery<T>(pool: pg.Pool, request: QueryRequest, work: (access: WorkspaceAccess) => Promise<T>) {
  return withModuleAccess(
    pool,
    { ...request, moduleCode: 'reagents', actionClass: 'read_export' },
    async (access) => {
      await requirePermission(access, READ);
      return work(access);
    },
  );
}

function decodeProductCursor(cursor: string | undefined): [string, string] | null {
  if (cursor === undefined) return null;
  try {
    const values: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(values) && values.length === 2 && values.every((v) => typeof v === 'string')) {
      return [values[0] as string, values[1] as string];
    }
  } catch {
    // Se responde abajo como datos inválidos.
  }
  throw new AppError('VALIDATION_FAILED', 'Cursor inválido');
}

/** El catálogo del espacio no depende de la ubicación; las existencias sí se filtran por ámbito. */
export function listProducts(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof productListQuery>,
): Promise<ProductList> {
  return runQuery(pool, request, async (access) => {
    const after = decodeProductCursor(query.cursor);
    const rows = await listProductsQuery.run(
      {
        workspaceId: access.workspace.id,
        locationIds: await permissionScope(access, READ),
        afterCode: after?.[0] ?? null,
        afterId: after?.[1] ?? null,
        limit: query.limit + 1,
      },
      access.client,
    );
    const visible = rows.slice(0, query.limit);
    const last = visible.at(-1);
    return {
      items: visible.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        baseUnit: row.base_unit,
        casNumber: row.cas_number,
        physicalState: row.physical_state as Product['physicalState'],
        balance: row.balance,
      })),
      nextCursor:
        rows.length > query.limit && last
          ? Buffer.from(JSON.stringify([last.sort_code, last.id])).toString('base64url')
          : null,
    };
  });
}

export function listPositions(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof positionListQuery>,
): Promise<PositionList> {
  return runQuery(pool, request, async (access) =>
    listPositionPage(inventoryContext(access), {
      locationIds: await permissionScope(access, READ),
      itemId: query.productId,
      cursor: query.cursor,
      limit: query.limit,
    }),
  );
}

export function listOperations(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof operationListQuery>,
): Promise<OperationList> {
  return runQuery(pool, request, async (access) =>
    listOperationPage(inventoryContext(access), {
      locationIds: await permissionScope(access, READ),
      itemId: query.productId,
      locationId: query.locationId,
      positionId: query.positionId,
      type: query.type,
      days: query.days,
      timeZone: access.workspace.timeZone,
      cursor: query.cursor,
      limit: query.limit,
    }),
  );
}

/**
 * Tarjeta de Inicio (01 §7): reactivos y ubicaciones con existencias, y los últimos movimientos,
 * todo dentro de las ubicaciones que el miembro puede consultar.
 */
export async function reagentsHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  const locationIds = await permissionScope(access, READ);
  const [row] = await homeSummary.run({ workspaceId: access.workspace.id, locationIds }, access.client);
  const ctx = inventoryContext(access);
  const recent = await listOperationPage(ctx, { locationIds, timeZone: access.workspace.timeZone, limit: 5 });
  const issues = await countOperationsPerDay(ctx, {
    type: 'issue',
    locationIds,
    timeZone: access.workspace.timeZone,
    days: TREND_DAYS,
  });
  return {
    summary: {
      productsWithStock: Number(row?.products_with_stock ?? 0),
      positionsWithStock: Number(row?.positions_with_stock ?? 0),
    },
    activity: recent.items.map((operation) => ({
      id: operation.id,
      type: operation.type,
      title: operation.product.name,
      detail: `${operation.lot.code} · ${operation.location.code}`,
      quantity: operation.quantity,
      unit: operation.unit,
      occurredAt: operation.effectiveAt,
      actor: operation.actor.displayName,
    })),
    // Sin ninguna salida en el periodo no hay gráfico: un gráfico vacío no informa (ADR 0011).
    trend: issues.some((point) => point.value > 0)
      ? { label: `Salidas por día, últimos ${TREND_DAYS} días`, points: issues }
      : null,
  };
}

/** Resumen de la app de Reactivos (ADR 0011): lo mismo que su tarjeta de Inicio. */
export function getSummary(pool: pg.Pool, request: QueryRequest): Promise<HomeContribution> {
  return runQuery(pool, request, reagentsHomeSummary);
}

/** Lotes de un reactivo; uno de otro espacio o de otro tipo no tiene lotes visibles. */
export function listLots(pool: pg.Pool, request: QueryRequest, productId: string): Promise<LotList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listProductLots.run({ workspaceId: access.workspace.id, itemId: productId }, access.client);
    return {
      items: rows.map((row) => ({
        id: row.id,
        productId: row.item_id,
        code: row.code,
        supplierName: row.supplier_name,
        supplierLot: row.supplier_lot,
        expiresOn: row.expires_on,
        condition: row.condition,
      })),
    };
  });
}

/** Ubicaciones donde el miembro puede registrar ingresos: la interfaz no ofrece las demás. */
export function listReceiptLocations(pool: pg.Pool, request: QueryRequest): Promise<LocationList> {
  return runQuery(pool, request, async (access) => {
    const scope = await permissionScope(access, 'reagents.receipt.create');
    const rows = await listLocationsIn.run({ workspaceId: access.workspace.id, locationIds: scope }, access.client);
    return { items: rows.map(({ id, code, name, kind }) => ({ id, code, name, kind })) };
  });
}
