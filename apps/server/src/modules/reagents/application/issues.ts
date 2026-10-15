import type pg from 'pg';
import type { z } from 'zod';
import type { issueRequest, IssueResponse, MovementResponse } from '@platlab/contracts';
import {
  applyMovement,
  approveIssueRequest,
  lockExistingPosition,
  releaseIssueRequest,
  requestIssue,
} from '../../../capabilities/inventory/index.js';
import { hasPermission, recordAudit } from '../../core/index.js';
import { inventoryContext, requires, runCommand, type CommandRequest } from './command.js';
import { auditMovement } from './movements.js';

/** Aprobar salidas: del Administrador, y el Propietario lo hereda (ADR 0012). */
const APPROVE = 'reagents.issue.approve';

/**
 * Salida (ADR 0012): quien puede aprobar la registra al instante; el Operador deja una solicitud
 * pendiente que aparta la cantidad. Lo decide el servidor, nunca el navegador: el mismo envío da una
 * salida o una solicitud según el permiso de quien lo hace.
 */
export function registerIssue(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof issueRequest>,
): Promise<IssueResponse> {
  const permission = 'reagents.issue.create';
  return runCommand(pool, request, permission, input, requires(permission), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    if (await hasPermission(access, APPROVE)) {
      const result = await applyMovement(ctx, position, {
        type: 'issue',
        quantity: input.quantity,
        unit: input.unit,
        reason: input.reason,
        destination: input.destination,
      });
      await auditMovement(access, permission, result, input.reason);
      return { status: 'done' as const, ...result };
    }
    const pending = await requestIssue(ctx, position, {
      quantity: input.quantity,
      unit: input.unit,
      reason: input.reason,
      destination: input.destination,
    });
    await recordAudit(access, {
      action: 'reagents.issue.request',
      entityType: 'inventory.allocation',
      entityId: pending.requestId,
      reason: input.reason,
      changes: { positionId: pending.positionId, quantity: pending.quantity, unit: pending.unit, destination: input.destination },
    });
    return { status: 'pending' as const, ...pending };
  });
}

/** Aprueba una solicitud pendiente: la salida se confirma; nadie aprueba la suya (ADR 0012). */
export function approveRequest(pool: pg.Pool, request: CommandRequest, requestId: string): Promise<MovementResponse> {
  return runCommand(
    pool,
    request,
    'reagents.issue.approve',
    { requestId },
    requires(APPROVE),
    async (access) => {
      const result = await approveIssueRequest(inventoryContext(access), requestId);
      await recordAudit(access, {
        action: APPROVE,
        entityType: 'inventory.allocation',
        entityId: requestId,
        changes: { operationId: result.operationId, positionId: result.positionId, quantity: result.appliedQuantity, balance: result.balance },
      });
      return result;
    },
    'resolve_pending',
  );
}

/** Rechaza una solicitud con motivo: libera lo reservado. */
export function rejectRequest(pool: pg.Pool, request: CommandRequest, requestId: string, reason: string) {
  return runCommand(
    pool,
    request,
    'reagents.issue.reject',
    { requestId, reason },
    requires(APPROVE),
    async (access) => {
      const result = await releaseIssueRequest(inventoryContext(access), requestId, { kind: 'reject', reason });
      await recordAudit(access, {
        action: 'reagents.issue.reject',
        entityType: 'inventory.allocation',
        entityId: requestId,
        reason,
        changes: { positionId: result.positionId },
      });
      return result;
    },
    'resolve_pending',
  );
}

/** Quien pidió la salida la cancela mientras siga pendiente: libera lo reservado. */
export function cancelRequest(pool: pg.Pool, request: CommandRequest, requestId: string) {
  return runCommand(
    pool,
    request,
    'reagents.issue.cancel',
    { requestId },
    requires('reagents.issue.create'),
    async (access) => {
      const result = await releaseIssueRequest(inventoryContext(access), requestId, { kind: 'cancel' });
      await recordAudit(access, {
        action: 'reagents.issue.cancel',
        entityType: 'inventory.allocation',
        entityId: requestId,
        changes: { positionId: result.positionId },
      });
      return result;
    },
    'resolve_pending',
  );
}
