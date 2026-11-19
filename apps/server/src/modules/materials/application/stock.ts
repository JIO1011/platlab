import type pg from 'pg';
import type { z } from 'zod';
import type {
  IssuePurpose,
  materialAdjustmentRequest,
  materialIssueRequest,
  materialReceiptRequest,
} from '@platlab/contracts';
import { applyMovement, lockExistingPosition, receiveStock, type MaterialLotInput } from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, type WorkspaceAccess } from '../../core/index.js';
import { insertIssueDetail } from '../infrastructure/issues.queries.js';
import { findProductDetail } from '../infrastructure/products.queries.js';
import { ADJUSTMENT, inventoryContext, ISSUE, RECEIPT, requireActiveMember, requires, runCommand, type CommandRequest } from './command.js';

/** Existencias de Materiales (ADR 0025): ingreso, salida y ajuste; cada uno, una operación del libro. */

interface Movement {
  operationId: string;
  positionId: string;
  appliedQuantity: string;
  unit: string;
  balance: string;
}

const auditMovement = (access: WorkspaceAccess, permission: string, result: Movement, reason?: string, extra: Record<string, unknown> = {}) =>
  recordAudit(access, {
    action: permission,
    entityType: 'inventory.operation',
    entityId: result.operationId,
    reason: reason ?? null,
    changes: { positionId: result.positionId, quantity: result.appliedQuantity, unit: result.unit, balance: result.balance, ...extra },
  });

/**
 * El lote del ingreso según el material (MA-01f): si vence, la fecha es obligatoria y el lote del proveedor opcional;
 * si no vence, no lleva ninguno de los dos y va a su lote único.
 */
function receiptLot(tracksExpiry: boolean, input: z.infer<typeof materialReceiptRequest>): MaterialLotInput {
  if (tracksExpiry) {
    if (!input.expiresOn) throw new AppError('VALIDATION_FAILED', 'Este insumo vence: indica la fecha de vencimiento');
    return { supplierLot: input.lot ?? null, expiresOn: input.expiresOn };
  }
  if (input.expiresOn || input.lot) throw new AppError('VALIDATION_FAILED', 'Este material no vence: no lleva fecha ni lote');
  return { supplierLot: null, expiresOn: null };
}

/** Ingreso a una ubicación activa, en la unidad base del material (Operador y Administrador). */
export function registerReceipt(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof materialReceiptRequest>) {
  return runCommand(pool, request, RECEIPT, input, requires(RECEIPT), async (access) => {
    const [detail] = await findProductDetail.run({ workspaceId: access.workspace.id, itemId: input.productId }, access.client);
    if (!detail) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    const lot = receiptLot(detail.tracks_expiry, input);
    const result = await receiveStock(inventoryContext(access), {
      itemId: input.productId,
      locationId: input.locationId,
      quantity: input.quantity,
      unit: input.unit,
      reference: input.reference ?? null,
      lot,
    });
    await auditMovement(access, RECEIPT, result, undefined, lot.expiresOn ? { lot: lot.supplierLot, expiresOn: lot.expiresOn } : {});
    return result;
  });
}

/** Cómo queda el tipo de la salida en el libro de la capacidad, que lo guarda como destino en texto. */
const purposeLabels: Record<IssuePurpose, string> = { practice: 'Práctica', clinic: 'Clínica', general: 'General' };

/**
 * Salida sin aprobación (Operador y Administrador), con su tipo, quién la pidió y un detalle (MA-01f). No baja de lo
 * disponible: lo prestado no se saca.
 */
export function registerIssue(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof materialIssueRequest>) {
  return runCommand(pool, request, ISSUE, input, requires(ISSUE), async (access) => {
    if (input.requesterId) await requireActiveMember(access, input.requesterId, 'El solicitante');
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    const result = await applyMovement(ctx, position, {
      type: 'issue',
      quantity: input.quantity,
      unit: input.unit,
      reason: input.detail,
      destination: purposeLabels[input.purpose],
    });
    const requesterId = input.requesterId ?? null;
    await insertIssueDetail.run(
      { workspaceId: access.workspace.id, operationId: result.operationId, purpose: input.purpose, requesterId },
      access.client,
    );
    await auditMovement(access, ISSUE, result, input.detail, { purpose: input.purpose, requesterId });
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
