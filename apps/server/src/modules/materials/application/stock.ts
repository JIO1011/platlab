import type pg from 'pg';
import type { z } from 'zod';
import type {
  materialAdjustmentRequest,
  materialIssueRequest,
  materialReceiptRequest,
} from '@platlab/contracts';
import { applyMovement, lockExistingPosition, receiveStock } from '../../../capabilities/inventory/index.js';
import { recordAudit, type WorkspaceAccess } from '../../core/index.js';
import { ADJUSTMENT, inventoryContext, ISSUE, RECEIPT, requires, runCommand, type CommandRequest } from './command.js';

/** Existencias de Materiales (ADR 0025): ingreso, salida y ajuste; cada uno, una operación del libro. */

interface Movement {
  operationId: string;
  positionId: string;
  appliedQuantity: string;
  unit: string;
  balance: string;
}

const auditMovement = (access: WorkspaceAccess, permission: string, result: Movement, reason?: string) =>
  recordAudit(access, {
    action: permission,
    entityType: 'inventory.operation',
    entityId: result.operationId,
    reason: reason ?? null,
    changes: { positionId: result.positionId, quantity: result.appliedQuantity, unit: result.unit, balance: result.balance },
  });

/** Ingreso a una ubicación activa, en la unidad base del material (Operador y Administrador). */
export function registerReceipt(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof materialReceiptRequest>) {
  return runCommand(pool, request, RECEIPT, input, requires(RECEIPT), async (access) => {
    const result = await receiveStock(inventoryContext(access), {
      itemId: input.productId,
      locationId: input.locationId,
      quantity: input.quantity,
      unit: input.unit,
      reference: input.reference ?? null,
    });
    await auditMovement(access, RECEIPT, result);
    return result;
  });
}

/** Salida con motivo y destino; la registra quien la hace, sin aprobación (01 §5). */
export function registerIssue(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof materialIssueRequest>) {
  return runCommand(pool, request, ISSUE, input, requires(ISSUE), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    const result = await applyMovement(ctx, position, {
      type: 'issue',
      quantity: input.quantity,
      unit: input.unit,
      reason: input.reason,
      destination: input.destination,
    });
    await auditMovement(access, ISSUE, result, input.reason);
    return result;
  });
}

/** Ajuste con signo y motivo obligatorio (Administrador); corrige con otro movimiento, no edita. */
export function registerAdjustment(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof materialAdjustmentRequest>) {
  return runCommand(pool, request, ADJUSTMENT, input, requires(ADJUSTMENT), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    const result = await applyMovement(ctx, position, {
      type: 'adjustment',
      quantity: input.quantity,
      unit: input.unit,
      reason: input.reason,
    });
    await auditMovement(access, ADJUSTMENT, result, input.reason);
    return result;
  });
}
