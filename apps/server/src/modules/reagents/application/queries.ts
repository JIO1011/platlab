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
  IssueRequestItem,
  ListEntry,
  ReasonKind,
  StockedProduct,
} from '@platlab/contracts';
import {
  countOperationsPerDay,
  destinationsOf,
  listIssueRequests,
  listOperationPage,
  listPositionPage,
  pendingRequestCount,
  reasonsOf,
} from '../../../capabilities/inventory/index.js';
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
  type IListProductsResult,
} from '../infrastructure/products.queries.js';
import { inventoryContext } from './commands.js';

const READ = 'reagents.catalog.read';
/** Ventana del gráfico de salidas del resumen (ADR 0011). */
const TREND_DAYS = 30;
/** «Por vencer»: caduca entre hoy y los próximos días (02 §12, ADR 0012 del 05-10-2026). */
const EXPIRING_DAYS = 30;

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

const toStockedProduct = (row: IListProductsResult): StockedProduct => ({
  id: row.id,
  code: row.code,
  name: row.name,
  baseUnit: row.base_unit,
  casNumber: row.cas_number,
  physicalState: row.physical_state as Product['physicalState'],
  balance: row.balance,
  containersWithStock: row.containers_with_stock,
  expiredContainers: row.expired_containers,
  expiringContainers: row.expiring_containers,
});

/** Ficha de un reactivo (ADR 0012): su total y sus frascos con saldo en el ámbito del miembro. */
export function getProduct(pool: pg.Pool, request: QueryRequest, productId: string): Promise<StockedProduct> {
  return runQuery(pool, request, async (access) => {
    const [row] = await listProductsQuery.run(
      {
        workspaceId: access.workspace.id,
        locationIds: await permissionScope(access, READ),
        productId,
        afterCode: null,
        afterId: null,
        limit: 1,
        timeZone: access.workspace.timeZone,
        expiringDays: EXPIRING_DAYS,
      },
      access.client,
    );
    if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    return toStockedProduct(row);
  });
}

/**
 * Quién ve qué solicitudes (ADR 0012): quien puede aprobar, la bandeja de las ubicaciones donde
 * aprueba; el Operador, solo las suyas, en las ubicaciones donde registra salidas.
 */
async function requestScope(access: WorkspaceAccess) {
  const approvable = await permissionScope(access, 'reagents.issue.approve');
  if (approvable.length > 0) return { canApprove: true, locationIds: approvable, requestedBy: null };
  return {
    canApprove: false,
    locationIds: await permissionScope(access, 'reagents.issue.create'),
    requestedBy: access.principalId,
  };
}

export function listRequests(
  pool: pg.Pool,
  request: QueryRequest,
  pendingOnly: boolean,
): Promise<{ canApprove: boolean; items: IssueRequestItem[] }> {
  return runQuery(pool, request, async (access) => {
    const scope = await requestScope(access);
    const items = await listIssueRequests(inventoryContext(access), {
      locationIds: scope.locationIds,
      requestedBy: scope.requestedBy,
      pendingOnly,
    });
    return { canApprove: scope.canApprove, items };
  });
}

/** Motivos de salida o de ajuste: los usa quien registra; los administra el Administrador. */
export function listReasons(pool: pg.Pool, request: QueryRequest, kind: ReasonKind): Promise<{ items: ListEntry[] }> {
  return runQuery(pool, request, async (access) => ({ items: await reasonsOf(inventoryContext(access), kind) }));
}

export function listDestinations(pool: pg.Pool, request: QueryRequest): Promise<{ items: ListEntry[] }> {
  return runQuery(pool, request, async (access) => ({ items: await destinationsOf(inventoryContext(access)) }));
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
        productId: null,
        afterCode: after?.[0] ?? null,
        afterId: after?.[1] ?? null,
        limit: query.limit + 1,
        timeZone: access.workspace.timeZone,
        expiringDays: EXPIRING_DAYS,
      },
      access.client,
    );
    const visible = rows.slice(0, query.limit);
    const last = visible.at(-1);
    return {
      items: visible.map(toStockedProduct),
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
 * Tarjeta de Inicio (01 §7) y Resumen: reactivos y frascos con existencias, vencidos y por vencer,
 * solicitudes pendientes y los últimos movimientos, todo en las ubicaciones que el miembro consulta.
 */
export async function reagentsHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  const locationIds = await permissionScope(access, READ);
  const [row] = await homeSummary.run(
    { workspaceId: access.workspace.id, locationIds, timeZone: access.workspace.timeZone, expiringDays: EXPIRING_DAYS },
    access.client,
  );
  const ctx = inventoryContext(access);
  // Seis: los que llenan la columna de actividad del Resumen en una ventana (ADR 0012, 05-10-2026).
  const recent = await listOperationPage(ctx, { locationIds, timeZone: access.workspace.timeZone, limit: 6 });
  const issues = await countOperationsPerDay(ctx, {
    type: 'issue',
    locationIds,
    timeZone: access.workspace.timeZone,
    days: TREND_DAYS,
  });
  const scope = await requestScope(access);
  const pendingRequests = await pendingRequestCount(ctx, { locationIds: scope.locationIds, requestedBy: scope.requestedBy });
  return {
    summary: {
      productsWithStock: Number(row?.products_with_stock ?? 0),
      containersWithStock: Number(row?.containers_with_stock ?? 0),
      expiredContainers: Number(row?.expired_containers ?? 0),
      expiringContainers: Number(row?.expiring_containers ?? 0),
      pendingRequests,
    },
    activity: recent.items.map((operation) => ({
      id: operation.entryId,
      type: operation.type,
      title: operation.product.name,
      detail: `${operation.container?.code ?? operation.lot.code} · ${operation.location.code}`,
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
