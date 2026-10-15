import type pg from 'pg';
import type { z } from 'zod';
import { EXPIRING_DAYS } from '@platlab/contracts';
import type {
  containerCodeSuggestionQuery,
  LocationList,
  OperationFacets,
  operationFacetsQuery,
  OperationList,
  operationListQuery,
  OperationTotals,
  operationTotalsQuery,
  PositionList,
  positionListQuery,
  ProductDetail,
  ProductList,
  productListQuery,
  Product,
  IssueRequestItem,
  ListEntry,
  ReasonKind,
  StockedProduct,
} from '@platlab/contracts';
import {
  brandsOf,
  containerItem,
  countOperationsPerDay,
  entriesOf,
  hasMovements,
  listIssueRequests,
  listOperationPage,
  listPositionPage,
  operationFacetsOf,
  operationTotalsOf,
  pendingRequestCount,
  reasonsOf,
  suggestContainerCodes,
  type NamedList,
  type OperationFilter,
} from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import {
  hasPermission,
  requirePermission,
  withModuleAccess,
  type HomeContribution,
  type WorkspaceAccess,
} from '../../core/index.js';
import {
  homeSummary,
  listActiveLocations,
  listProductSafety,
  listProducts as listProductsQuery,
  type IListProductsResult,
} from '../infrastructure/products.queries.js';
import { inventoryContext } from './command.js';

const READ = 'reagents.catalog.read';
const RECEIPT = 'reagents.receipt.create';
/** Totales y exportación de Movimientos: reportes del Administrador (ADR 0014, 01 §5). */
const REPORT = 'reagents.report.read';
/** Ventana del gráfico de salidas del resumen (ADR 0011). */
const TREND_DAYS = 30;

interface QueryRequest {
  subject: string;
  workspaceId: string;
}

/** Consultas de Reactivos: admisión de consulta y lectura del catálogo. */
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
  minimum: row.minimum,
  hazards: row.hazards as Product['hazards'],
  controlled: row.controlled,
  sdsKind: row.sds_kind as Product['sdsKind'],
  sdsUrl: row.sds_url,
  sdsFileUrl: row.sds_file_url,
  density: row.density,
  balance: row.balance,
  containersWithStock: row.containers_with_stock,
  expiredContainers: row.expired_containers,
  expiringContainers: row.expiring_containers,
  belowMinimum: row.below_minimum,
});

/**
 * Ficha de un reactivo (ADR 0012): su total y sus frascos con saldo en el espacio, y si su unidad aún
 * puede cambiar (ADR 0015).
 */
export function getProduct(pool: pg.Pool, request: QueryRequest, productId: string): Promise<ProductDetail> {
  return runQuery(pool, request, async (access) => {
    const [row] = await listProductsQuery.run(
      {
        workspaceId: access.workspace.id,
        productId,
        q: null,
        afterCode: null,
        afterId: null,
        limit: 1,
        timeZone: access.workspace.timeZone,
        expiringDays: EXPIRING_DAYS,
      },
      access.client,
    );
    if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    return { ...toStockedProduct(row), unitEditable: !(await hasMovements(inventoryContext(access), productId)) };
  });
}

/**
 * Quién ve qué solicitudes (ADR 0012): quien puede aprobar, todas las del espacio; el Operador, solo
 * las suyas. Sin ninguno de los dos permisos, ninguna: null.
 */
async function requestScope(access: WorkspaceAccess) {
  if (await hasPermission(access, 'reagents.issue.approve')) return { canApprove: true, requestedBy: null };
  if (await hasPermission(access, 'reagents.issue.create')) return { canApprove: false, requestedBy: access.principalId };
  return null;
}

export function listRequests(
  pool: pg.Pool,
  request: QueryRequest,
  pendingOnly: boolean,
): Promise<{ canApprove: boolean; items: IssueRequestItem[] }> {
  return runQuery(pool, request, async (access) => {
    const scope = await requestScope(access);
    if (!scope) return { canApprove: false, items: [] };
    const items = await listIssueRequests(inventoryContext(access), { requestedBy: scope.requestedBy, pendingOnly });
    return { canApprove: scope.canApprove, items };
  });
}

/** Motivos de salida o de ajuste: los usa quien registra; los administra el Administrador. */
export function listReasons(pool: pg.Pool, request: QueryRequest, kind: ReasonKind): Promise<{ items: ListEntry[] }> {
  return runQuery(pool, request, async (access) => ({ items: await reasonsOf(inventoryContext(access), kind) }));
}

/** Destinos o áreas del espacio (ADR 0012, 0015). */
export function listEntries(pool: pg.Pool, request: QueryRequest, list: NamedList): Promise<{ items: ListEntry[] }> {
  return runQuery(pool, request, async (access) => ({ items: await entriesOf(inventoryContext(access), list) }));
}

/** Marcas ya usadas, para sugerirlas al registrar un ingreso (ADR 0015). */
export function listBrands(pool: pg.Pool, request: QueryRequest): Promise<{ items: string[] }> {
  return runQuery(pool, request, async (access) => {
    await requirePermission(access, RECEIPT);
    return { items: await brandsOf(inventoryContext(access)) };
  });
}

/** Códigos libres para los frascos de un ingreso (ADR 0015): los comprueba de nuevo al guardar. */
export function suggestCodes(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof containerCodeSuggestionQuery>,
): Promise<{ codes: string[] }> {
  return runQuery(pool, request, async (access) => {
    await requirePermission(access, RECEIPT);
    return {
      codes: await suggestContainerCodes(inventoryContext(access), { itemId: query.productId, name: query.name, count: query.count }),
    };
  });
}

/** El catálogo del espacio con sus existencias en todas las ubicaciones. */
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
        productId: null,
        q: query.q ?? null,
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
  return runQuery(pool, request, async (access) => {
    const page = await listPositionPage(inventoryContext(access), {
      itemId: query.productId,
      locationId: query.locationId,
      cursor: query.cursor,
      limit: query.limit,
    });
    // «Controlado» y la ficha de seguridad son de la ficha química (ADR 0015, 0016): los añade el módulo,
    // no la capacidad.
    const itemIds = [...new Set(page.items.map((position) => position.product.id))];
    const safety = new Map(
      (await listProductSafety.run({ workspaceId: access.workspace.id, itemIds }, access.client)).map((row) => [
        row.item_id,
        row,
      ]),
    );
    return {
      ...page,
      items: page.items.map((position) => {
        const detail = safety.get(position.product.id);
        return {
          ...position,
          product: {
            ...position.product,
            controlled: detail?.controlled ?? false,
            sdsKind: (detail?.sds_kind ?? null) as Product['sdsKind'],
            sdsUrl: detail?.sds_url ?? null,
            sdsFileUrl: detail?.sds_file_url ?? null,
          },
        };
      }),
    };
  });
}

/** Filtros de Movimientos (ADR 0014) del espacio. */
const operationFilter = (
  access: WorkspaceAccess,
  query: z.infer<typeof operationFacetsQuery | typeof operationListQuery | typeof operationTotalsQuery>,
): OperationFilter => ({
  types: query.type,
  itemIds: query.productId,
  responsibleIds: query.responsibleId,
  destinations: query.destination,
  reasons: query.reason,
  filterLocationIds: query.locationId,
  positionId: query.positionId,
  days: query.days,
  from: query.from,
  to: query.to,
  timeZone: access.workspace.timeZone,
});

export function listOperations(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof operationListQuery>,
): Promise<OperationList> {
  return runQuery(pool, request, async (access) =>
    listOperationPage(inventoryContext(access), {
      ...operationFilter(access, query),
      cursor: query.cursor,
      limit: query.limit,
    }),
  );
}

/** Conteo por opción de cada filtro de Movimientos (ADR 0014): lo ve quien ve el detalle. */
export function listOperationFacets(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof operationFacetsQuery>,
): Promise<OperationFacets> {
  return runQuery(pool, request, async (access) =>
    operationFacetsOf(inventoryContext(access), {
      ...operationFilter(access, query),
      productQuery: query.productQuery,
    }),
  );
}

/** Totales de Movimientos (ADR 0014): un reporte; exige consultar y además tener el reporte. */
export function listOperationTotals(
  pool: pg.Pool,
  request: QueryRequest,
  query: z.infer<typeof operationTotalsQuery>,
): Promise<OperationTotals> {
  return runQuery(pool, request, async (access) => {
    await requirePermission(access, REPORT);
    return operationTotalsOf(inventoryContext(access), {
      ...operationFilter(access, query),
      groupBy: query.groupBy,
    });
  });
}

/**
 * Tarjeta de Inicio (01 §7) y Resumen: reactivos y frascos con existencias, vencidos y por vencer,
 * solicitudes pendientes y los últimos movimientos del espacio. Quien la llama ya exigió la lectura
 * (runQuery o la tarjeta de Inicio con el permiso del manifiesto).
 */
export async function reagentsHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  const [row] = await homeSummary.run(
    { workspaceId: access.workspace.id, timeZone: access.workspace.timeZone, expiringDays: EXPIRING_DAYS },
    access.client,
  );
  const ctx = inventoryContext(access);
  // Seis: los que llenan la columna de actividad del Resumen en una ventana (ADR 0012, 05-10-2026).
  const recent = await listOperationPage(ctx, { timeZone: access.workspace.timeZone, limit: 6 });
  const issues = await countOperationsPerDay(ctx, {
    type: 'issue',
    timeZone: access.workspace.timeZone,
    days: TREND_DAYS,
  });
  const scope = await requestScope(access);
  const pendingRequests = scope ? await pendingRequestCount(ctx, { requestedBy: scope.requestedBy }) : 0;
  return {
    summary: {
      productsWithStock: Number(row?.products_with_stock ?? 0),
      containersWithStock: Number(row?.containers_with_stock ?? 0),
      expiredContainers: Number(row?.expired_containers ?? 0),
      expiringContainers: Number(row?.expiring_containers ?? 0),
      belowMinimum: Number(row?.below_minimum ?? 0),
      productsWithMinimum: Number(row?.products_with_minimum ?? 0),
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

/** Ubicaciones activas del espacio si el miembro tiene el permiso; sin él, ninguna (ADR 0008). */
function locationsWith(pool: pg.Pool, request: QueryRequest, permission: string): Promise<LocationList> {
  return runQuery(pool, request, async (access) => {
    if (!(await hasPermission(access, permission))) return { items: [] };
    const rows = await listActiveLocations.run({ workspaceId: access.workspace.id }, access.client);
    return { items: rows.map(({ id, code, name, kind, parent_id }) => ({ id, code, name, kind, parentId: parent_id })) };
  });
}

/** Donde el miembro registra ingresos; con `parentId`, la web arma los niveles (ADR 0015). */
export const listReceiptLocations = (pool: pg.Pool, request: QueryRequest) => locationsWith(pool, request, RECEIPT);

/** Adonde el miembro puede trasladar un frasco (ADR 0012, entrega 4). */
export const listTransferLocations = (pool: pg.Pool, request: QueryRequest) =>
  locationsWith(pool, request, 'reagents.transfer.create');

/** Lo que el miembro puede contar: donde puede ajustar existencias (ADR 0012, entrega 4). */
export const listCountLocations = (pool: pg.Pool, request: QueryRequest) =>
  locationsWith(pool, request, 'reagents.adjustment.create');

/** Reactivo de un frasco: el enlace corto de su etiqueta QR lleva a su ficha (ADR 0012, entrega 4). */
export function getContainer(pool: pg.Pool, request: QueryRequest, containerId: string): Promise<{ containerId: string; productId: string }> {
  return runQuery(pool, request, async (access) => {
    const productId = await containerItem(inventoryContext(access), containerId);
    if (!productId) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    return { containerId, productId };
  });
}
