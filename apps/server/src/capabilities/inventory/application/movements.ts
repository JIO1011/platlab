import { AppError } from '../../../platform/errors.js';
import {
  applyEntry,
  findLocation,
  findLot,
  insertContainerPosition,
  insertContainers,
  insertOperation,
  lockPosition,
  reserveContainerSeqs,
} from '../infrastructure/inventory.queries.js';
import { createLot, type NewLot } from './catalog.js';
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

/** Código visible de un frasco: «código del lote-NN» (ADR 0012). */
const containerCode = (lotCode: string, seq: number) => `${lotCode}-${String(seq).padStart(2, '0')}`;

interface ReceivedContainer {
  containerId: string;
  code: string;
  positionId: string;
  quantity: string;
  balance: string;
}

export interface ReceiptResult {
  operationId: string;
  type: 'receipt';
  lot: { id: string; code: string };
  unit: string;
  effectiveAt: string;
  containers: ReceivedContainer[];
}

interface ReceiptInput {
  /** Un lote existente del ítem, o uno nuevo que se crea en la misma transacción (01 §6.1). */
  lot: { id: string } | { itemId: string; create: NewLot };
  locationId: string;
  /** Frascos iguales del mismo lote; cada uno entra con `quantity`. */
  count: number;
  quantity: string;
  unit: string;
  reference: string | null;
}

/**
 * Ingreso por frascos (ADR 0012): una operación con un asiento por frasco. Valida lote y ubicación
 * en el espacio y para el tipo del módulo; después de `authorize` (el módulo comprueba su permiso
 * en la ubicación) reserva los números de frasco en el lote, que queda bloqueado, y crea cada
 * frasco con su posición llena.
 */
export async function receiveContainers(
  ctx: InventoryContext,
  input: ReceiptInput,
  authorize: (locationId: string) => Promise<void>,
): Promise<ReceiptResult> {
  const [location] = await findLocation.run(
    { workspaceId: ctx.workspaceId, locationId: input.locationId },
    ctx.client,
  );
  if (!location) throw notFound();
  await authorize(location.id);

  const lotId = 'id' in input.lot ? input.lot.id : (await createLot(ctx, input.lot.itemId, input.lot.create)).id;
  const [lot] = await findLot.run({ workspaceId: ctx.workspaceId, lotId, kind: ctx.kind }, ctx.client);
  if (!lot) throw notFound();
  requireBaseUnit(input.unit, lot.base_unit);

  const [reserved] = await reserveContainerSeqs.run(
    { workspaceId: ctx.workspaceId, lotId: lot.id, count: input.count },
    ctx.client,
  );
  if (!reserved) throw notFound();
  const containers = await insertContainers.run(
    {
      workspaceId: ctx.workspaceId,
      itemId: lot.item_id,
      lotId: lot.id,
      quantity: input.quantity,
      firstSeq: reserved.last - input.count + 1,
      lastSeq: reserved.last,
    },
    ctx.client,
  );

  const [operation] = await insertOperation.run(
    {
      workspaceId: ctx.workspaceId,
      type: 'receipt',
      principalId: ctx.principalId,
      reason: null,
      destination: null,
      reference: input.reference,
      correlationId: ctx.correlationId,
      requestedBy: null,
    },
    ctx.client,
  );
  if (!operation) throw new Error('La operación no devolvió fila');

  const received: ReceivedContainer[] = [];
  for (const container of containers) {
    const [position] = await insertContainerPosition.run(
      {
        workspaceId: ctx.workspaceId,
        itemId: lot.item_id,
        lotId: lot.id,
        containerId: container.id,
        locationId: location.id,
      },
      ctx.client,
    );
    if (!position) throw new Error('La posición del frasco no devolvió fila');
    const [entry] = await applyEntry.run(
      {
        workspaceId: ctx.workspaceId,
        operationId: operation.id,
        positionId: position.id,
        sign: '1',
        quantity: input.quantity,
        unit: input.unit,
      },
      ctx.client,
    );
    if (!entry) throw new Error('El asiento del ingreso no devolvió fila');
    received.push({
      containerId: container.id,
      code: containerCode(lot.code, container.seq),
      positionId: position.id,
      quantity: entry.quantity,
      balance: entry.balance_after,
    });
  }

  return {
    operationId: operation.id,
    type: 'receipt',
    lot: { id: lot.id, code: lot.code },
    unit: lot.base_unit,
    effectiveAt: operation.effective_at.toISOString(),
    containers: received,
  };
}

/** Bloquea una posición existente del tipo del módulo antes de leer o descontar su saldo. */
export async function lockExistingPosition(ctx: InventoryContext, positionId: string): Promise<LockedPosition> {
  const [row] = await lockPosition.run({ workspaceId: ctx.workspaceId, positionId, kind: ctx.kind }, ctx.client);
  if (!row) throw notFound();
  return {
    id: row.id,
    locationId: row.location_id,
    baseUnit: row.base_unit,
    movable: row.disposition === 'usable',
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
    throw new AppError('VALIDATION_FAILED', 'El frasco no está disponible para salidas');
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
      requestedBy: null,
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
