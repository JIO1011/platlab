import { AppError } from '../../../platform/errors.js';
import {
  activityHoldOptions as activityHoldOptionsQuery,
  activityHoldPositions,
  heldActivityQuantities,
  holdableByArea as holdableByAreaQuery,
  holdForActivity as holdForActivityQuery,
  holdPositionForActivity,
  lockHoldablePositions,
  lockPositionsInOrder,
  releaseActivityHolds as releaseQuery,
} from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

/**
 * Lo apartado para un bloque de Laboratorios (ADR 0023, L-01d), en la misma transacción admitida del módulo que lo
 * pide: no es una salida pendiente y no entra en la bandeja de salidas. Aparta de los frascos que vencen antes y
 * siguen vigentes el día de la práctica; lo que no alcanza no se aparta y quien llama lo muestra como faltante.
 */
export async function holdForActivity(
  ctx: InventoryContext,
  input: { itemId: string; quantity: string; validOn: string; reason: string; destination: string },
): Promise<Array<{ allocationId: string; quantity: string }>> {
  const positions = await lockHoldablePositions.run(
    { workspaceId: ctx.workspaceId, itemId: input.itemId, kind: ctx.kind, validOn: input.validOn },
    ctx.client,
  );
  if (positions.length === 0) return [];
  const rows = await holdForActivityQuery.run(
    {
      workspaceId: ctx.workspaceId,
      positionIds: positions.map((position) => position.id),
      quantity: input.quantity,
      reason: input.reason,
      destination: input.destination,
      principalId: ctx.principalId,
    },
    ctx.client,
  );
  return rows.map((row) => ({ allocationId: row.id, quantity: row.quantity }));
}

/**
 * Libera lo apartado para un bloque con su motivo; lo ya liberado no cambia. Bloquea antes sus frascos en el orden fijo
 * de su id, como apartar, para que liberar y apartar a la vez no se esperen en orden cruzado.
 */
export async function releaseActivityHolds(ctx: InventoryContext, allocationIds: readonly string[], reason: string): Promise<void> {
  if (allocationIds.length === 0) return;
  const positions = await activityHoldPositions.run({ workspaceId: ctx.workspaceId, allocationIds: [...allocationIds] }, ctx.client);
  if (positions.length === 0) return;
  await lockPositionsInOrder.run({ workspaceId: ctx.workspaceId, positionIds: positions.map((row) => row.position_id) }, ctx.client);
  await releaseQuery.run({ workspaceId: ctx.workspaceId, allocationIds: [...allocationIds], principalId: ctx.principalId, reason }, ctx.client);
}

/** Lo que sigue apartado de cada reserva de bloque (las liberadas no aparecen). */
export async function heldForActivity(ctx: Pick<InventoryContext, 'client' | 'workspaceId'>, allocationIds: readonly string[]): Promise<Map<string, string>> {
  if (allocationIds.length === 0) return new Map();
  const rows = await heldActivityQuantities.run({ workspaceId: ctx.workspaceId, allocationIds: [...allocationIds] }, ctx.client);
  return new Map(rows.map((row) => [row.id, row.quantity]));
}

/**
 * Lo que se podría apartar de cada ítem el día `validOn`, por área y sin bloquear ni reservar: la revisión antes de
 * enviar una solicitud (ADR 0023, «Flujo de la Propuesta»). Cada fila es un ítem en un área (nula fuera de toda área).
 */
export async function holdableByArea(
  ctx: Pick<InventoryContext, 'client' | 'workspaceId' | 'kind'>,
  itemIds: readonly string[],
  validOn: string,
): Promise<Array<{ itemId: string; areaName: string | null; available: string }>> {
  if (itemIds.length === 0) return [];
  const rows = await holdableByAreaQuery.run({ workspaceId: ctx.workspaceId, itemIds: [...itemIds], kind: ctx.kind, validOn }, ctx.client);
  return rows.map((row) => ({ itemId: row.item_id, areaName: row.area_name, available: row.available }));
}

/** Un frasco del que un bloque puede apartar: lo disponible incluye lo que ese bloque ya apartó de él. */
export interface ActivityHoldOption {
  positionId: string;
  containerCode: string | null;
  lotCode: string;
  expiresOn: string | null;
  locationName: string;
  available: string;
  held: string;
}

/**
 * Los frascos de los que un bloque puede apartar el ítem el día `validOn` (ADR 0023, «Cierre de Laboratorios»), los
 * que vencen antes primero, con lo que ya apartó en `allocationIds`. Sin bloquear: quien elige lo confirma después.
 */
export async function activityHoldOptions(
  ctx: Pick<InventoryContext, 'client' | 'workspaceId' | 'kind'>,
  input: { itemId: string; validOn: string; allocationIds: readonly string[] },
): Promise<ActivityHoldOption[]> {
  const rows = await activityHoldOptionsQuery.run(
    { workspaceId: ctx.workspaceId, itemId: input.itemId, kind: ctx.kind, validOn: input.validOn, allocationIds: [...input.allocationIds] },
    ctx.client,
  );
  return rows.map((row) => ({
    positionId: row.id,
    containerCode: row.container_code,
    lotCode: row.lot_code,
    expiresOn: row.expires_on,
    locationName: row.location_name,
    available: row.available,
    held: row.held,
  }));
}

/**
 * Cambia lo apartado de un ítem para un bloque por lo elegido, frasco a frasco (ADR 0023, «Cierre de Laboratorios»):
 * bloquea en orden fijo los frascos de antes y los elegidos, libera lo anterior y aparta cada cantidad, todo en la
 * transacción de quien llama. Un frasco que ya no es apartable ese día o no tiene esa cantidad rechaza el cambio entero.
 */
export async function reholdForActivity(
  ctx: InventoryContext,
  input: {
    itemId: string;
    validOn: string;
    allocationIds: readonly string[];
    picks: ReadonlyArray<{ positionId: string; quantity: string }>;
    reason: string;
    destination: string;
    releaseReason: string;
  },
): Promise<Array<{ allocationId: string; quantity: string }>> {
  const previous = input.allocationIds.length === 0 ? [] : await activityHoldPositions.run({ workspaceId: ctx.workspaceId, allocationIds: [...input.allocationIds] }, ctx.client);
  const positionIds = [...new Set([...previous.map((row) => row.position_id), ...input.picks.map((pick) => pick.positionId)])];
  if (positionIds.length > 0) await lockPositionsInOrder.run({ workspaceId: ctx.workspaceId, positionIds }, ctx.client);
  await releaseActivityHolds(ctx, input.allocationIds, input.releaseReason);
  const held: Array<{ allocationId: string; quantity: string }> = [];
  for (const pick of input.picks) {
    const [row] = await holdPositionForActivity.run(
      {
        workspaceId: ctx.workspaceId,
        positionId: pick.positionId,
        itemId: input.itemId,
        kind: ctx.kind,
        validOn: input.validOn,
        quantity: pick.quantity,
        reason: input.reason,
        destination: input.destination,
        principalId: ctx.principalId,
      },
      ctx.client,
    );
    if (!row) throw new AppError('VALIDATION_FAILED', 'Un frasco elegido ya no tiene esa cantidad disponible ese día: vuelve a cargar la lista');
    held.push({ allocationId: row.id, quantity: row.quantity });
  }
  return held;
}
