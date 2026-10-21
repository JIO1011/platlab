import type { Operation, OperationFacets, OperationGroupBy, OperationTotals, Position } from '@platlab/contracts';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import {
  countOperationsByDay,
  findContainerItem,
  listOperations,
  listPositions,
  operationFacets,
  operationTotals,
  stockAt,
  stockedItemsByArea,
  stockedItemsByDepartment,
} from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Posición vista desde la capacidad: lo propio del tipo de ítem (controlado, ficha de seguridad) lo añade el módulo. */
export type StockPosition = Omit<Position, 'product'> & {
  product: Omit<Position['product'], 'controlled' | 'sdsKind' | 'sdsUrl' | 'sdsFileUrl'>;
};

/** Saldos del espacio, de producto a lote y ubicación (01 §7). */
export async function listPositionPage(
  ctx: InventoryContext,
  filter: { itemId?: string | undefined; locationId?: string | undefined; cursor?: string | undefined; limit: number },
): Promise<Page<StockPosition>> {
  const after = decodeCursor(filter.cursor, 5);
  const rows = await listPositions.run(
    {
      workspaceId: ctx.workspaceId,
      kind: ctx.kind,
      itemId: filter.itemId ?? null,
      locationId: filter.locationId ?? null,
      afterItem: after?.[0] ?? null,
      afterLot: after?.[1] ?? null,
      afterSeq: after ? Number(after[2]) : null,
      afterLocation: after?.[3] ?? null,
      afterId: after?.[4] ?? null,
      limit: filter.limit + 1,
    },
    ctx.client,
  );
  const visible = rows.slice(0, filter.limit);
  const last = visible.at(-1);
  return {
    items: visible.map((row) => ({
      id: row.id,
      product: { id: row.item_id, code: row.item_code, name: row.item_name },
      lot: {
        id: row.lot_id,
        code: row.lot_code,
        expiresOn: row.expires_on,
        brand: row.brand,
        department: row.department_id && row.department_name ? { id: row.department_id, name: row.department_name } : null,
      },
      container:
        row.container_id && row.container_code && row.container_initial_quantity && row.container_received_at
          ? {
              id: row.container_id,
              code: row.container_code,
              initialQuantity: row.container_initial_quantity,
              receivedAt: row.container_received_at.toISOString(),
              receivedBy: row.container_has_receipt ? { displayName: row.container_received_by_name } : null,
              tare: row.container_tare,
              density: row.container_density,
            }
          : null,
      disposition: row.disposition as Position['disposition'],
      location: { id: row.location_id, code: row.location_code, name: row.location_name, path: row.location_path },
      balance: row.balance,
      reserved: row.reserved,
      unit: row.base_unit,
    })),
    nextCursor:
      rows.length > filter.limit && last
        ? encodeCursor([last.sort_item, last.sort_lot, String(last.sort_seq), last.sort_location, last.id])
        : null,
  };
}

/**
 * Filtros del libro (ADR 0014), comunes a la lista, los conteos por opción y los totales. Cada lista
 * admite cualquiera de sus valores; sin lista, no filtra. El periodo es `days` o `from`/`to` (días
 * civiles en `timeZone`, ambos incluidos).
 */
export interface OperationFilter {
  types?: Operation['type'][] | undefined;
  itemIds?: string[] | undefined;
  /** Quien pidió la salida si hubo solicitud; si no, quien registró la operación. */
  responsibleIds?: string[] | undefined;
  destinations?: string[] | undefined;
  reasons?: string[] | undefined;
  filterLocationIds?: string[] | undefined;
  positionId?: string | undefined;
  /** Últimos N días civiles en `timeZone`, hoy incluido. */
  days?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  timeZone: string;
}

function filterParams(ctx: InventoryContext, filter: OperationFilter) {
  return {
    workspaceId: ctx.workspaceId,
    kind: ctx.kind,
    types: filter.types ?? null,
    itemIds: filter.itemIds ?? null,
    responsibleIds: filter.responsibleIds ?? null,
    destinations: filter.destinations ?? null,
    reasons: filter.reasons ?? null,
    filterLocationIds: filter.filterLocationIds ?? null,
    positionId: filter.positionId ?? null,
    days: filter.days ?? null,
    fromDate: filter.from ?? null,
    toDate: filter.to ?? null,
    timeZone: filter.timeZone,
  };
}

/** Historial del espacio, del más reciente al más antiguo, con su responsable. */
export async function listOperationPage(
  ctx: InventoryContext,
  filter: OperationFilter & { cursor?: string | undefined; limit: number },
): Promise<Page<Operation>> {
  const before = decodeCursor(filter.cursor, 3);
  const rows = await listOperations.run(
    {
      ...filterParams(ctx, filter),
      beforeAt: before?.[0] ?? null,
      beforeId: before?.[1] ?? null,
      beforeEntryId: before?.[2] ?? null,
      limit: filter.limit + 1,
    },
    ctx.client,
  );
  const visible = rows.slice(0, filter.limit);
  const last = visible.at(-1);
  return {
    items: visible.map((row) => ({
      id: row.id,
      entryId: row.entry_id,
      type: row.type as Operation['type'],
      effectiveAt: row.effective_at.toISOString(),
      actor: { principalId: row.actor_principal_id, displayName: row.actor_name },
      requestedBy: row.requested_by_principal_id ? { displayName: row.requester_name } : null,
      reason: row.reason,
      destination: row.destination,
      reference: row.reference,
      positionId: row.position_id,
      product: { id: row.item_id, code: row.item_code, name: row.item_name },
      lot: { code: row.lot_code },
      container: row.container_code ? { code: row.container_code } : null,
      location: { code: row.location_code, name: row.location_name, path: row.location_path },
      quantity: row.quantity,
      balanceAfter: row.balance_after,
      unit: row.base_unit,
    })),
    nextCursor:
      rows.length > filter.limit && last ? encodeCursor([last.cursor_at, last.id, last.entry_id]) : null,
  };
}

/** Reactivos por grupo de opciones; con más, el grupo dice `more` y se busca dentro (ADR 0014). */
const PRODUCT_OPTIONS = 300;

/**
 * Asientos por opción de cada filtro (ADR 0014): `total` con todos los filtros y cada grupo con todos
 * menos el suyo. Una sola consulta: total y grupos salen de la misma instantánea.
 */
export async function operationFacetsOf(
  ctx: InventoryContext,
  filter: OperationFilter & { productQuery?: string | undefined },
): Promise<OperationFacets> {
  const rows = await operationFacets.run(
    { ...filterParams(ctx, filter), productQuery: filter.productQuery ?? null, productLimit: PRODUCT_OPTIONS },
    ctx.client,
  );
  const facets: OperationFacets = {
    total: 0,
    types: [],
    products: { options: [], more: false },
    responsibles: [],
    destinations: [],
    reasons: [],
    locations: [],
  };
  let unselectedProducts = 0;
  // Las filas llegan por grupo, por conteo descendente y luego por nombre.
  for (const row of rows) {
    const count = row.count;
    if (row.facet === 'total') facets.total = count;
    else if (row.facet === 'type' && row.value) facets.types.push({ value: row.value as Operation['type'], count });
    else if (row.facet === 'product' && row.id && row.code && row.name) {
      if (!row.selected && ++unselectedProducts > PRODUCT_OPTIONS) facets.products.more = true;
      else facets.products.options.push({ id: row.id, code: row.code, name: row.name, count });
    } else if (row.facet === 'responsible' && row.id) {
      facets.responsibles.push({ principalId: row.id, displayName: row.name, count });
    } else if (row.facet === 'destination' && row.value) facets.destinations.push({ value: row.value, count });
    else if (row.facet === 'reason' && row.value) facets.reasons.push({ value: row.value, count });
    else if (row.facet === 'location' && row.id && row.code && row.name) {
      facets.locations.push({ id: row.id, code: row.code, name: row.name, count });
    }
  }
  return facets;
}

/** Grupos de los totales; con más, la respuesta dice `truncated` (ADR 0014). */
const MAX_TOTAL_GROUPS = 1000;

/**
 * Totales del libro filtrado (ADR 0014), por grupo y, dentro, por ítem en su unidad base: nunca se
 * suman unidades distintas. Las cantidades llegan de SQL como cadenas decimales exactas.
 */
export async function operationTotalsOf(
  ctx: InventoryContext,
  filter: OperationFilter & { groupBy: OperationGroupBy },
): Promise<OperationTotals> {
  const rows = await operationTotals.run(
    { ...filterParams(ctx, filter), groupBy: filter.groupBy, maxGroups: MAX_TOTAL_GROUPS },
    ctx.client,
  );
  const groups: OperationTotals['groups'] = [];
  let rank = 0;
  for (const row of rows) {
    if (row.group_rank !== rank) {
      rank = row.group_rank;
      groups.push({ key: row.group_id ?? row.group_text, label: row.label, count: row.group_count, rows: [] });
    }
    groups.at(-1)?.rows.push({
      product: { id: row.item_id, code: row.item_code, name: row.item_name },
      unit: row.base_unit,
      count: row.count,
      receipts: row.receipts,
      issues: row.issues,
      adjustments: row.adjustments,
      net: row.net,
      transfers: row.transfers,
    });
  }
  return { groupBy: filter.groupBy, groups, truncated: (rows[0]?.groups_total ?? 0) > MAX_TOTAL_GROUPS };
}

/** Operaciones de un tipo por día, con ceros incluidos, para el gráfico de un resumen (ADR 0011). */
export async function countOperationsPerDay(
  ctx: InventoryContext,
  filter: { type: Operation['type']; timeZone: string; days: number },
): Promise<Array<{ date: string; value: number }>> {
  const rows = await countOperationsByDay.run(
    {
      workspaceId: ctx.workspaceId,
      kind: ctx.kind,
      type: filter.type,
      timeZone: filter.timeZone,
      days: filter.days,
    },
    ctx.client,
  );
  return rows.map((row) => ({ date: row.day, value: row.count }));
}

/** Ítem de un frasco del espacio y del tipo del módulo; null si no existe para él. */
export async function containerItem(ctx: InventoryContext, containerId: string): Promise<string | null> {
  const [row] = await findContainerItem.run({ workspaceId: ctx.workspaceId, containerId, kind: ctx.kind }, ctx.client);
  return row?.item_id ?? null;
}

/** Cifras de Áreas (ADR 0024): ítems distintos del tipo con existencias, por área y por departamento. */
export async function stockedItemCounts(
  ctx: InventoryContext,
): Promise<{ byArea: Record<string, number>; byDepartment: Record<string, number> }> {
  const [areas, departments] = await Promise.all([
    stockedItemsByArea.run({ workspaceId: ctx.workspaceId, kind: ctx.kind }, ctx.client),
    stockedItemsByDepartment.run({ workspaceId: ctx.workspaceId, kind: ctx.kind }, ctx.client),
  ]);
  return {
    byArea: Object.fromEntries(areas.map((row) => [row.area_id, row.count])),
    byDepartment: Object.fromEntries(departments.map((row) => [row.department_id, row.count])),
  };
}

/** ¿Hay existencias del tipo en alguna de estas ubicaciones? (archivo de un área, ADR 0024). */
export async function hasStockAt(ctx: InventoryContext, locationIds: string[]): Promise<boolean> {
  const [row] = await stockAt.run({ workspaceId: ctx.workspaceId, kind: ctx.kind, locationIds }, ctx.client);
  return row?.stocked ?? false;
}
