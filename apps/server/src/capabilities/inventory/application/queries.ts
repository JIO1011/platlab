import type { Operation, Position } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { listOperations, listPositions } from '../infrastructure/inventory.queries.js';
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
  const after = decodeCursor(filter.cursor, 4);
  const rows = await listPositions.run(
    {
      workspaceId: ctx.workspaceId,
      kind: ctx.kind,
      locationIds: filter.locationIds,
      itemId: filter.itemId ?? null,
      afterItem: after?.[0] ?? null,
      afterLot: after?.[1] ?? null,
      afterLocation: after?.[2] ?? null,
      afterId: after?.[3] ?? null,
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
      lot: { id: row.lot_id, code: row.lot_code, expiresOn: row.expires_on },
      location: { id: row.location_id, code: row.location_code, name: row.location_name },
      balance: row.balance,
      unit: row.base_unit,
    })),
    nextCursor:
      rows.length > filter.limit && last
        ? encodeCursor([last.sort_item, last.sort_lot, last.sort_location, last.id])
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
    cursor?: string | undefined;
    limit: number;
  },
): Promise<Page<Operation>> {
  const before = decodeCursor(filter.cursor, 2);
  const rows = await listOperations.run(
    {
      workspaceId: ctx.workspaceId,
      kind: ctx.kind,
      locationIds: filter.locationIds,
      itemId: filter.itemId ?? null,
      locationId: filter.locationId ?? null,
      positionId: filter.positionId ?? null,
      beforeAt: before?.[0] ?? null,
      beforeId: before?.[1] ?? null,
      limit: filter.limit + 1,
    },
    ctx.client,
  );
  const visible = rows.slice(0, filter.limit);
  const last = visible.at(-1);
  return {
    items: visible.map((row) => ({
      id: row.id,
      type: row.type as Operation['type'],
      effectiveAt: row.effective_at.toISOString(),
      actor: { principalId: row.actor_principal_id, displayName: row.actor_name },
      reason: row.reason,
      destination: row.destination,
      reference: row.reference,
      positionId: row.position_id,
      product: { code: row.item_code, name: row.item_name },
      lot: { code: row.lot_code },
      location: { code: row.location_code },
      quantity: row.quantity,
      balanceAfter: row.balance_after,
      unit: row.base_unit,
    })),
    nextCursor:
      rows.length > filter.limit && last ? encodeCursor([last.cursor_at, last.id]) : null,
  };
}
