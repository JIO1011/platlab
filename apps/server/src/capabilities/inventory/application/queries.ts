import type { Operation, Position } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { countOperationsByDay, listOperations, listPositions } from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

/** Cursor opaco para paginar por clave: el cliente no elige orden ni filtros arbitrarios. */
function encodeCursor(values: string[]): string {
  return Buffer.from(JSON.stringify(values)).toString('base64url');
}

function decodeCursor(cursor: string | undefined, size: number): string[] | null {
  if (cursor === undefined) return null;
  try {
    const values: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(values) && values.length === size && values.every((v) => typeof v === 'string')) {
      return values as string[];
    }
  } catch {
    // Se responde abajo como datos inválidos.
  }
  throw new AppError('VALIDATION_FAILED', 'Cursor inválido');
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Saldos de las ubicaciones autorizadas, de producto a lote y ubicación (01 §7). */
export async function listPositionPage(
  ctx: InventoryContext,
  filter: { locationIds: string[]; itemId?: string | undefined; cursor?: string | undefined; limit: number },
): Promise<Page<Position>> {
  const after = decodeCursor(filter.cursor, 5);
  const rows = await listPositions.run(
    {
      workspaceId: ctx.workspaceId,
      kind: ctx.kind,
      locationIds: filter.locationIds,
      itemId: filter.itemId ?? null,
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
        condition: row.lot_condition as Position['lot']['condition'],
        supplierName: row.supplier_name,
        supplierLot: row.supplier_lot,
      },
      container:
        row.container_id && row.container_code && row.container_initial_quantity && row.container_received_at
          ? {
              id: row.container_id,
              code: row.container_code,
              initialQuantity: row.container_initial_quantity,
              receivedAt: row.container_received_at.toISOString(),
            }
          : null,
      disposition: row.disposition as Position['disposition'],
      location: { id: row.location_id, code: row.location_code, name: row.location_name },
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

/** Historial de las ubicaciones autorizadas, del más reciente al más antiguo, con su responsable. */
export async function listOperationPage(
  ctx: InventoryContext,
  filter: {
    locationIds: string[];
    itemId?: string | undefined;
    locationId?: string | undefined;
    positionId?: string | undefined;
    type?: Operation['type'] | undefined;
    /** Últimos N días civiles en `timeZone`, hoy incluido. */
    days?: number | undefined;
    timeZone: string;
    cursor?: string | undefined;
    limit: number;
  },
): Promise<Page<Operation>> {
  const before = decodeCursor(filter.cursor, 3);
  const rows = await listOperations.run(
    {
      workspaceId: ctx.workspaceId,
      kind: ctx.kind,
      locationIds: filter.locationIds,
      itemId: filter.itemId ?? null,
      locationId: filter.locationId ?? null,
      positionId: filter.positionId ?? null,
      type: filter.type ?? null,
      days: filter.days ?? null,
      timeZone: filter.timeZone,
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
      location: { code: row.location_code },
      quantity: row.quantity,
      balanceAfter: row.balance_after,
      unit: row.base_unit,
    })),
    nextCursor:
      rows.length > filter.limit && last ? encodeCursor([last.cursor_at, last.id, last.entry_id]) : null,
  };
}

/** Operaciones de un tipo por día, con ceros incluidos, para el gráfico de un resumen (ADR 0011). */
export async function countOperationsPerDay(
  ctx: InventoryContext,
  filter: { type: Operation['type']; locationIds: string[]; timeZone: string; days: number },
): Promise<Array<{ date: string; value: number }>> {
  const rows = await countOperationsByDay.run(
    {
      workspaceId: ctx.workspaceId,
      kind: ctx.kind,
      type: filter.type,
      locationIds: filter.locationIds,
      timeZone: filter.timeZone,
      days: filter.days,
    },
    ctx.client,
  );
  return rows.map((row) => ({ date: row.day, value: row.count }));
}
