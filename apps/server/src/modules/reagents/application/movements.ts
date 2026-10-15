import type pg from 'pg';
import type { z } from 'zod';
import type {
  adjustmentRequest,
  countRequest,
  CountResponse,
  MovementResponse,
  receiptRequest,
  ReceiptResponse,
  setTareRequest,
  TareResponse,
  transferRequest,
  TransferResponse,
  weightAdjustmentRequest,
} from '@platlab/contracts';
import {
  adjustByWeight,
  applyMovement,
  countLocation,
  lockExistingPosition,
  receiveContainers,
  setTare,
  transferContainer,
} from '../../../capabilities/inventory/index.js';
import { recordAudit, requirePermission, type WorkspaceAccess } from '../../core/index.js';
import { insertProduct, productDetailOf } from './catalog.js';
import { CATALOG, inventoryContext, requires, runCommand, type CommandRequest } from './command.js';

/** Movimientos de existencias: ingreso, traslado, conteo, ajustes y tara (ADR 0012, 0015). */

export async function auditMovement(access: WorkspaceAccess, permission: string, result: MovementResponse, reason?: string) {
  await recordAudit(access, {
    action: permission,
    entityType: 'inventory.operation',
    entityId: result.operationId,
    reason: reason ?? null,
    changes: {
      positionId: result.positionId,
      quantity: result.appliedQuantity,
      unit: result.unit,
      balance: result.balance,
    },
  });
}

/** Densidad del reactivo (g/mL) para pasar su volumen a gramos; null si no la tiene. */
const productDensity = async (access: WorkspaceAccess, productId: string) => (await productDetailOf(access, productId)).density;

/**
 * Ingreso en un paso (ADR 0015): un reactivo del catálogo o uno nuevo (solo con el permiso de
 * catálogo), un lote automático y un frasco por código, con su tara si llega el peso. Todo en una
 * transacción: un código repetido o un permiso que falta no deja nada creado.
 */
export function registerReceipt(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof receiptRequest>,
): Promise<ReceiptResponse> {
  const permission = 'reagents.receipt.create';
  const authorize = async (access: WorkspaceAccess) => {
    await requirePermission(access, permission);
    if (input.newProduct) await requirePermission(access, CATALOG);
  };
  return runCommand(pool, request, permission, input, authorize, async (access) => {
    const created = input.newProduct ? await insertProduct(access, input.newProduct) : null;
    const productId = created?.id ?? input.productId ?? '';
    const weight = input.weight
      ? {
          grossWeight: input.weight.grossWeight,
          density: input.weight.density ?? (created ? created.density : await productDensity(access, productId)),
        }
      : null;
    const result = await receiveContainers(
      inventoryContext(access),
      {
        itemId: productId,
        lot: { brand: input.brand ?? null, area: input.area ?? null, expiresOn: input.expiresOn ?? null },
        locationId: input.locationId,
        codes: input.codes,
        quantity: input.quantity,
        unit: input.unit,
        weight,
      },
    );
    await recordAudit(access, {
      action: permission,
      entityType: 'inventory.operation',
      entityId: result.operationId,
      reason: null,
      changes: {
        productId: result.product.id,
        lotId: result.lot.id,
        unit: result.unit,
        containers: result.containers.map(({ containerId, code, positionId, quantity, tare }) => ({
          containerId,
          code,
          positionId,
          quantity,
          tare,
        })),
      },
    });
    return result;
  });
}

/** Traslado de un frasco entero a otra ubicación, en un paso (Operador y Administrador, ADR 0012). */
export function registerTransfer(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof transferRequest>,
): Promise<TransferResponse> {
  const permission = 'reagents.transfer.create';
  return runCommand(pool, request, permission, input, requires(permission), async (access) => {
    const result = await transferContainer(
      inventoryContext(access),
      { positionId: input.positionId, locationId: input.locationId, reference: input.reference ?? null },
    );
    await recordAudit(access, {
      action: permission,
      entityType: 'inventory.operation',
      entityId: result.operationId,
      changes: { fromPositionId: result.fromPositionId, toPositionId: result.toPositionId, quantity: result.quantity, unit: result.unit },
    });
    return result;
  });
}

/** Conteo de una ubicación: un ajuste «Conteo» con los frascos que no cuadran (Administrador, ADR 0012). */
export function registerCount(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof countRequest>,
): Promise<CountResponse> {
  const permission = 'reagents.adjustment.create';
  return runCommand(pool, request, 'reagents.count.create', input, requires(permission), async (access) => {
    const result = await countLocation(inventoryContext(access), input);
    // El conteo queda auditado aunque todo cuadre: se sabe quién contó, dónde y cuándo.
    await recordAudit(access, {
      action: 'reagents.count.create',
      entityType: 'core.location',
      entityId: input.locationId,
      reason: 'Conteo',
      changes: { operationId: result.operationId, counted: result.counted, adjusted: result.adjusted },
    });
    return result;
  });
}

/** Ajuste con signo y motivo obligatorio (Administrador); corrige con otro movimiento, no edita. */
export function registerAdjustment(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof adjustmentRequest>,
): Promise<MovementResponse> {
  const permission = 'reagents.adjustment.create';
  return runCommand(pool, request, permission, input, requires(permission), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    const result = await applyMovement(ctx, position, {
      type: 'adjustment',
      quantity: input.quantity,
      unit: input.unit,
      reason: input.reason,
    });
    await auditMovement(access, permission, result, input.reason);
    return result;
  });
}

/**
 * Ajuste por peso (ADR 0015): con el peso del frasco en la balanza y su tara, la base calcula el saldo
 * y registra un ajuste «Pesada» bajo el bloqueo de la posición, como cualquier ajuste.
 */
export function registerWeightAdjustment(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof weightAdjustmentRequest>,
): Promise<MovementResponse> {
  const permission = 'reagents.adjustment.create';
  return runCommand(pool, request, 'reagents.adjustment.weight', input, requires(permission), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    const result = await adjustByWeight(ctx, position, input.grossWeight);
    await auditMovement(access, permission, result, 'Pesada');
    return result;
  });
}

/**
 * Fija la tara de un frasco (ADR 0015): la fija quien puede ajustar. Reemplaza la anterior y
 * la auditoría guarda ambas, con sus densidades.
 */
export function setContainerTare(
  pool: pg.Pool,
  request: CommandRequest,
  containerId: string,
  input: z.infer<typeof setTareRequest>,
): Promise<TareResponse> {
  const permission = 'reagents.adjustment.create';
  return runCommand(
    pool,
    request,
    'reagents.container.tare',
    { containerId, ...input },
    requires(permission),
    async (access) => {
      const result = await setTare(
        inventoryContext(access),
        {
          containerId,
          grossWeight: input.grossWeight,
          density: input.density ?? null,
          fallbackDensity: (itemId) => productDensity(access, itemId),
        },
      );
      await recordAudit(access, {
        action: 'reagents.container.tare',
        entityType: 'inventory.container',
        entityId: containerId,
        changes: {
          grossWeight: input.grossWeight,
          tare: { from: result.previous.tare, to: result.tare },
          density: { from: result.previous.density, to: result.density },
        },
      });
      return { containerId: result.containerId, tare: result.tare, density: result.density };
    },
  );
}
