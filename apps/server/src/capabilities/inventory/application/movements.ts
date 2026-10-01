import { AppError } from '../../../platform/errors.js';
import {
  applyEntry,
  ensurePosition,
  findLocation,
  findLot,
  insertOperation,
  lockPosition,
  lockPositionByKey,
} from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

type OperationType = 'receipt' | 'issue' | 'adjustment';

/** Posición bloqueada para un movimiento: su ubicación decide el ámbito del permiso. */
export interface LockedPosition {
  id: string;
  locationId: string;
  baseUnit: string;
  movable: boolean;
}

export interface MovementResult {
  operationId: string;
  type: OperationType;
  positionId: string;
  appliedQuantity: string;
  balance: string;
  unit: string;
  effectiveAt: string;
}

/** En R-00 se opera en la unidad base, sin conversiones (primer incremento). */
function requireBaseUnit(unit: string, baseUnit: string): void {
  if (unit !== baseUnit) {
    throw new AppError('VALIDATION_FAILED', `Unidad incompatible: el producto se registra en ${baseUnit}`);
  }
}

/**
 * Lote y ubicación de un ingreso, validados en el espacio y para el tipo del módulo. Después de
 * `authorize` (el módulo comprueba su permiso en la ubicación), crea la posición si falta y la
 * bloquea; dos ingresos simultáneos a la misma posición nueva no la duplican.
 */
export async function lockReceiptPosition(
  ctx: InventoryContext,
  input: { lotId: string; locationId: string; unit: string },
  authorize: (locationId: string) => Promise<void>,
): Promise<LockedPosition> {
  const [lot] = await findLot.run({ workspaceId: ctx.workspaceId, lotId: input.lotId, kind: ctx.kind }, ctx.client);
  if (!lot) throw notFound();
  const [location] = await findLocation.run(
    { workspaceId: ctx.workspaceId, locationId: input.locationId },
    ctx.client,
  );
  if (!location) throw notFound();
  requireBaseUnit(input.unit, lot.base_unit);
  if (lot.condition === 'discarded') {
    throw new AppError('VALIDATION_FAILED', 'El lote está descartado');
  }
  await authorize(location.id);
  const key = { workspaceId: ctx.workspaceId, itemId: lot.item_id, lotId: lot.id, locationId: location.id };
  await ensurePosition.run(key, ctx.client);
  const [position] = await lockPositionByKey.run(key, ctx.client);
  if (!position) throw new Error('La posición del ingreso no quedó disponible');
  return { id: position.id, locationId: location.id, baseUnit: lot.base_unit, movable: true };
}

/** Bloquea una posición existente del tipo del módulo antes de leer o descontar su saldo. */
export async function lockExistingPosition(ctx: InventoryContext, positionId: string): Promise<LockedPosition> {
  const [row] = await lockPosition.run({ workspaceId: ctx.workspaceId, positionId, kind: ctx.kind }, ctx.client);
  if (!row) throw notFound();
  return {
    id: row.id,
    locationId: row.location_id,
    baseUnit: row.base_unit,
    movable: row.condition === 'enabled' && row.disposition === 'usable',
  };
}

interface MovementInput {
  type: OperationType;
  /** Cadena decimal: positiva en ingresos y salidas; con signo en los ajustes. */
  quantity: string;
  unit: string;
  reason?: string | null;
  destination?: string | null;
  reference?: string | null;
}

/**
 * Registra la operación, su asiento y el nuevo saldo sobre la posición ya bloqueada (03 §7).
 * Una salida o un ajuste negativo que deja el saldo bajo cero no escribe nada: stock insuficiente.
 */
export async function applyMovement(
  ctx: InventoryContext,
  position: LockedPosition,
  input: MovementInput,
): Promise<MovementResult> {
  requireBaseUnit(input.unit, position.baseUnit);
  if (input.type === 'issue' && !position.movable) {
    throw new AppError('VALIDATION_FAILED', 'El lote o la posición no están disponibles para salidas');
  }
  const [operation] = await insertOperation.run(
    {
      workspaceId: ctx.workspaceId,
      type: input.type,
      principalId: ctx.principalId,
      reason: input.reason ?? null,
      destination: input.destination ?? null,
      reference: input.reference ?? null,
      correlationId: ctx.correlationId,
    },
    ctx.client,
  );
  if (!operation) throw new Error('La operación no devolvió fila');

  const [entry] = await applyEntry.run(
    {
      workspaceId: ctx.workspaceId,
      operationId: operation.id,
      positionId: position.id,
      sign: input.type === 'issue' ? '-1' : '1',
      quantity: input.quantity,
      unit: input.unit,
    },
    ctx.client,
  );
  if (!entry) throw new AppError('INSUFFICIENT_STOCK', 'Stock insuficiente en la posición');

  return {
    operationId: operation.id,
    type: input.type,
    positionId: position.id,
    appliedQuantity: entry.quantity,
    balance: entry.balance_after,
    unit: position.baseUnit,
    effectiveAt: operation.effective_at.toISOString(),
  };
}
