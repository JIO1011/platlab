import {
  heldActivityQuantities,
  holdForActivity as holdForActivityQuery,
  lockHoldablePositions,
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

/** Libera lo apartado para un bloque con su motivo; lo ya liberado no cambia. */
export async function releaseActivityHolds(ctx: InventoryContext, allocationIds: readonly string[], reason: string): Promise<void> {
  if (allocationIds.length === 0) return;
  await releaseQuery.run({ workspaceId: ctx.workspaceId, allocationIds: [...allocationIds], principalId: ctx.principalId, reason }, ctx.client);
}

/** Lo que sigue apartado de cada reserva de bloque (las liberadas no aparecen). */
export async function heldForActivity(ctx: Pick<InventoryContext, 'client' | 'workspaceId'>, allocationIds: readonly string[]): Promise<Map<string, string>> {
  if (allocationIds.length === 0) return new Map();
  const rows = await heldActivityQuantities.run({ workspaceId: ctx.workspaceId, allocationIds: [...allocationIds] }, ctx.client);
  return new Map(rows.map((row) => [row.id, row.quantity]));
}
