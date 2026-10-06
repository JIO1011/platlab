import { AppError } from '../../../platform/errors.js';
import {
  applyEntry,
  insertLotConditionChange,
  insertOperation,
  lockLot,
  lockLotPositions,
  updateLotCondition,
} from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

type LotCondition = 'enabled' | 'quarantine' | 'blocked' | 'discarded';

export interface LotConditionResult {
  lotId: string;
  condition: LotCondition;
  changedAt: string;
  operationId: string | null;
  containers: number;
}

/**
 * Bloquea el lote (lote antes que posición, 02 §6) y comprueba que puede cambiar: existe, es del
 * tipo del módulo y no está descartado, porque descartar es definitivo (ADR 0012, 05-10-2026).
 */
async function lockChangeableLot(ctx: InventoryContext, lotId: string) {
  const [lot] = await lockLot.run({ workspaceId: ctx.workspaceId, lotId, kind: ctx.kind }, ctx.client);
  if (!lot) throw notFound();
  if (lot.condition === 'discarded') throw new AppError('VALIDATION_FAILED', 'El lote está descartado y ya no cambia');
  return lot;
}

async function recordChange(
  ctx: InventoryContext,
  lotId: string,
  from: string,
  to: LotCondition,
  reason: string,
  operationId: string | null,
): Promise<Date> {
  const [change] = await insertLotConditionChange.run(
    {
      workspaceId: ctx.workspaceId,
      lotId,
      fromCondition: from,
      toCondition: to,
      reason,
      principalId: ctx.principalId,
      operationId,
    },
    ctx.client,
  );
  if (!change) throw new Error('El cambio de estado no devolvió fila');
  await updateLotCondition.run({ workspaceId: ctx.workspaceId, lotId, condition: to }, ctx.client);
  return change.created_at;
}

/**
 * Habilita, pone en cuarentena o bloquea un lote, con motivo. Las solicitudes pendientes no se tocan:
 * en cuarentena o bloqueado no se aprueban, pero se pueden rechazar (ADR 0012).
 */
export async function changeLotCondition(
  ctx: InventoryContext,
  lotId: string,
  input: { condition: Exclude<LotCondition, 'discarded'>; reason: string },
): Promise<LotConditionResult> {
  const lot = await lockChangeableLot(ctx, lotId);
  if (lot.condition === input.condition) {
    throw new AppError('VALIDATION_FAILED', 'El lote ya está en ese estado');
  }
  const changedAt = await recordChange(ctx, lot.id, lot.condition, input.condition, input.reason, null);
  return { lotId: lot.id, condition: input.condition, changedAt: changedAt.toISOString(), operationId: null, containers: 0 };
}

/**
 * Descarta un lote (ADR 0012, 05-10-2026): una operación de baja lleva a cero todos sus frascos y el
 * lote queda descartado para siempre. Con salidas pendientes no procede: primero se rechazan, para
 * que nada se cancele en silencio. `authorize` comprueba el permiso en la ubicación de cada frasco.
 */
export async function discardLot(
  ctx: InventoryContext,
  lotId: string,
  reason: string,
  authorize: (locationId: string) => Promise<void>,
): Promise<LotConditionResult> {
  const lot = await lockChangeableLot(ctx, lotId);
  const positions = await lockLotPositions.run({ workspaceId: ctx.workspaceId, lotId: lot.id }, ctx.client);
  for (const position of positions) await authorize(position.location_id);
  if (positions.some((position) => position.reserved !== '0')) {
    throw new AppError(
      'VALIDATION_FAILED',
      'El lote tiene salidas pendientes. Recházalas antes de descartarlo.',
    );
  }

  const stocked = positions.filter((position) => position.balance !== '0');
  let operationId: string | null = null;
  if (stocked.length > 0) {
    const [operation] = await insertOperation.run(
      {
        workspaceId: ctx.workspaceId,
        type: 'disposal',
        principalId: ctx.principalId,
        reason,
        destination: null,
        reference: null,
        correlationId: ctx.correlationId,
        requestedBy: null,
      },
      ctx.client,
    );
    if (!operation) throw new Error('La operación no devolvió fila');
    operationId = operation.id;
    for (const position of stocked) {
      const [entry] = await applyEntry.run(
        {
          workspaceId: ctx.workspaceId,
          operationId: operation.id,
          positionId: position.id,
          sign: '-1',
          quantity: position.balance,
          unit: lot.base_unit,
        },
        ctx.client,
      );
      if (!entry) throw new Error('La baja no pudo llevar el frasco a cero');
    }
  }

  const changedAt = await recordChange(ctx, lot.id, lot.condition, 'discarded', reason, operationId);
  return { lotId: lot.id, condition: 'discarded', changedAt: changedAt.toISOString(), operationId, containers: stocked.length };
}
