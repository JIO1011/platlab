import type { IssueRequestItem } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import {
  countPendingAllocations,
  decideAllocation,
  findAllocation,
  fulfillEntry,
  insertAllocation,
  insertOperation,
  listAllocations,
  lockAllocation,
  releaseReserved,
  reserveQuantity,
} from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';
import { lockExistingPosition, type LockedPosition, type MovementResult } from './movements.js';

/**
 * Solicitudes de salida (ADR 0012, 03 §4): la del Operador aparta la cantidad del frasco hasta que
 * alguien con permiso la aprueba o la rechaza. Orden de bloqueo: posición → reserva.
 */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

export interface PendingRequest {
  requestId: string;
  positionId: string;
  quantity: string;
  unit: string;
  available: string;
  requestedAt: string;
}

/** Pide una salida sobre el frasco ya bloqueado: aparta la cantidad si lo disponible alcanza. */
export async function requestIssue(
  ctx: InventoryContext,
  position: LockedPosition,
  input: { quantity: string; unit: string; reason: string; destination: string },
): Promise<PendingRequest> {
  if (input.unit !== position.baseUnit) {
    throw new AppError('VALIDATION_FAILED', `Unidad incompatible: el producto se registra en ${position.baseUnit}`);
  }
  if (!position.movable) {
    throw new AppError('VALIDATION_FAILED', 'El lote o la posición no están disponibles para salidas');
  }
  const [reserved] = await reserveQuantity.run(
    { workspaceId: ctx.workspaceId, positionId: position.id, quantity: input.quantity },
    ctx.client,
  );
  if (!reserved) throw new AppError('INSUFFICIENT_STOCK', 'No hay disponible suficiente en el frasco');
  const [row] = await insertAllocation.run(
    {
      workspaceId: ctx.workspaceId,
      positionId: position.id,
      quantity: input.quantity,
      reason: input.reason,
      destination: input.destination,
      principalId: ctx.principalId,
    },
    ctx.client,
  );
  if (!row) throw new Error('La solicitud no devolvió fila');
  return {
    requestId: row.id,
    positionId: position.id,
    quantity: input.quantity,
    unit: position.baseUnit,
    available: reserved.available,
    requestedAt: row.created_at.toISOString(),
  };
}

/** Bloquea el frasco y luego la reserva, y comprueba que siga pendiente. */
async function lockPending(ctx: InventoryContext, requestId: string) {
  const [found] = await findAllocation.run(
    { workspaceId: ctx.workspaceId, allocationId: requestId, kind: ctx.kind },
    ctx.client,
  );
  if (!found) throw notFound();
  const position = await lockExistingPosition(ctx, found.position_id);
  const [allocation] = await lockAllocation.run({ workspaceId: ctx.workspaceId, allocationId: requestId }, ctx.client);
  if (!allocation) throw notFound();
  if (allocation.status !== 'held') {
    throw new AppError('REQUEST_RESOLVED', 'La solicitud ya fue resuelta');
  }
  return { position, allocation };
}

/**
 * Aprueba: la salida se confirma con el aprobador como actor y quien la pidió como solicitante;
 * lo reservado sale del saldo y de la reserva a la vez. Nadie aprueba su propia solicitud.
 */
export async function approveIssueRequest(
  ctx: InventoryContext,
  requestId: string,
  authorize: (locationId: string) => Promise<void>,
): Promise<MovementResult> {
  const { position, allocation } = await lockPending(ctx, requestId);
  await authorize(position.locationId);
  if (allocation.requested_by_principal_id === ctx.principalId) {
    throw new AppError('ACCESS_DENIED', 'Nadie aprueba su propia solicitud');
  }
  // El lote pudo pasar a cuarentena o bloqueo después de pedirse: aprobar es sacar, y no se saca.
  if (!position.movable) {
    throw new AppError(
      'VALIDATION_FAILED',
      'El lote o la posición ya no están disponibles para salidas: rechaza la solicitud para liberar lo apartado',
    );
  }
  const [operation] = await insertOperation.run(
    {
      workspaceId: ctx.workspaceId,
      type: 'issue',
      principalId: ctx.principalId,
      reason: allocation.reason,
      destination: allocation.destination,
      reference: null,
      correlationId: ctx.correlationId,
      requestedBy: allocation.requested_by_principal_id,
    },
    ctx.client,
  );
  if (!operation) throw new Error('La operación no devolvió fila');
  const [entry] = await fulfillEntry.run(
    {
      workspaceId: ctx.workspaceId,
      operationId: operation.id,
      positionId: position.id,
      quantity: allocation.quantity,
      unit: position.baseUnit,
    },
    ctx.client,
  );
  if (!entry) throw new Error('La reserva no cubría la salida aprobada');
  await decideAllocation.run(
    {
      workspaceId: ctx.workspaceId,
      allocationId: requestId,
      status: 'fulfilled',
      principalId: ctx.principalId,
      decisionReason: null,
      operationId: operation.id,
    },
    ctx.client,
  );
  return {
    operationId: operation.id,
    type: 'issue',
    positionId: position.id,
    appliedQuantity: entry.quantity,
    balance: entry.balance_after,
    unit: position.baseUnit,
    effectiveAt: operation.effective_at.toISOString(),
  };
}

/**
 * Rechaza (con motivo, quien aprueba) o cancela (quien la pidió, sin motivo): libera lo reservado.
 * `authorize` decide quién puede hacerlo en la ubicación del frasco.
 */
export async function releaseIssueRequest(
  ctx: InventoryContext,
  requestId: string,
  decision: { kind: 'reject'; reason: string } | { kind: 'cancel' },
  authorize: (locationId: string) => Promise<void>,
): Promise<{ requestId: string; positionId: string; status: 'released' }> {
  const { position, allocation } = await lockPending(ctx, requestId);
  if (decision.kind === 'cancel') {
    if (allocation.requested_by_principal_id !== ctx.principalId) {
      throw new AppError('ACCESS_DENIED', 'Solo quien la pidió puede cancelar la solicitud');
    }
  } else {
    await authorize(position.locationId);
  }
  const [released] = await releaseReserved.run(
    { workspaceId: ctx.workspaceId, positionId: position.id, quantity: allocation.quantity },
    ctx.client,
  );
  if (!released) throw new Error('La reserva no estaba apartada en el frasco');
  await decideAllocation.run(
    {
      workspaceId: ctx.workspaceId,
      allocationId: requestId,
      status: 'released',
      principalId: ctx.principalId,
      decisionReason: decision.kind === 'reject' ? decision.reason : null,
      operationId: null,
    },
    ctx.client,
  );
  return { requestId, positionId: position.id, status: 'released' };
}

function statusOf(row: { status: string; requested_by_principal_id: string; decided_by_principal_id: string | null }): IssueRequestItem['status'] {
  if (row.status === 'fulfilled') return 'approved';
  if (row.status === 'released') return row.decided_by_principal_id === row.requested_by_principal_id ? 'cancelled' : 'rejected';
  return 'pending';
}

/** Solicitudes en las ubicaciones dadas; `requestedBy` acota a las de una persona. */
export async function listIssueRequests(
  ctx: InventoryContext,
  filter: { locationIds: string[]; requestedBy: string | null; pendingOnly: boolean },
): Promise<IssueRequestItem[]> {
  const rows = await listAllocations.run(
    {
      workspaceId: ctx.workspaceId,
      kind: ctx.kind,
      locationIds: filter.locationIds,
      status: filter.pendingOnly ? 'held' : null,
      requestedBy: filter.requestedBy,
      limit: 100,
    },
    ctx.client,
  );
  return rows.map((row) => ({
    id: row.id,
    status: statusOf(row),
    quantity: row.quantity,
    unit: row.base_unit,
    reason: row.reason,
    destination: row.destination,
    decisionReason: row.decision_reason,
    requestedAt: row.created_at.toISOString(),
    decidedAt: row.decided_at?.toISOString() ?? null,
    positionId: row.position_id,
    product: { id: row.item_id, name: row.item_name },
    container: { code: row.container_code ?? row.lot_code },
    location: { code: row.location_code, name: row.location_name },
    requester: { principalId: row.requested_by_principal_id, displayName: row.requester_name },
    mine: row.requested_by_principal_id === ctx.principalId,
    decider: row.decider_name ? { displayName: row.decider_name } : null,
  }));
}

export async function pendingRequestCount(
  ctx: InventoryContext,
  filter: { locationIds: string[]; requestedBy: string | null },
): Promise<number> {
  const [row] = await countPendingAllocations.run(
    { workspaceId: ctx.workspaceId, kind: ctx.kind, locationIds: filter.locationIds, requestedBy: filter.requestedBy },
    ctx.client,
  );
  return row?.count ?? 0;
}
