import type pg from 'pg';
import type { z } from 'zod';
import type {
  adjustmentRequest,
  createLotRequest,
  createProductRequest,
  issueRequest,
  Lot,
  MovementResponse,
  Product,
  receiptRequest,
} from '@platlab/contracts';
import {
  applyMovement,
  createItem,
  createLot as createInventoryLot,
  lockExistingPosition,
  lockReceiptPosition,
  type InventoryContext,
} from '../../../capabilities/inventory/index.js';
import { withIdempotency } from '../../../platform/idempotency/idempotency.js';
import {
  recordAudit,
  requirePermission,
  requirePermissionAt,
  requireWorkspacePermission,
  withModuleAccess,
  type WorkspaceAccess,
} from '../../core/index.js';
import { insertProductDetail } from '../infrastructure/products.queries.js';

/** Petición ya autenticada: el actor y el espacio salen del contexto verificado, nunca del cuerpo. */
export interface CommandRequest {
  subject: string;
  workspaceId: string;
  idempotencyKey: string | undefined;
}

export const inventoryContext = (access: WorkspaceAccess): InventoryContext => ({
  client: access.client,
  workspaceId: access.workspace.id,
  principalId: access.principalId,
  correlationId: access.correlationId,
  kind: 'reagent',
});

/**
 * Una transacción por comando (primer incremento): admisión de Reactivos para operación nueva,
 * permiso, clave idempotente, negocio y auditoría; se confirma o revierte todo junto. El permiso se
 * comprueba antes de la clave, así un reintento también revalida el acceso; el ámbito de la
 * ubicación se comprueba dentro, cuando se conoce la posición.
 */
function runCommand<T>(
  pool: pg.Pool,
  request: CommandRequest,
  operation: string,
  input: unknown,
  authorize: (access: WorkspaceAccess) => Promise<void>,
  work: (access: WorkspaceAccess) => Promise<T>,
): Promise<T> {
  return withModuleAccess(
    pool,
    { subject: request.subject, workspaceId: request.workspaceId, moduleCode: 'reagents', actionClass: 'new_operation' },
    async (access) => {
      await authorize(access);
      return withIdempotency(
        access.client,
        {
          workspaceId: access.workspace.id,
          principalId: access.principalId,
          operation,
          key: request.idempotencyKey,
          input,
        },
        () => work(access),
      );
    },
  );
}

/** Crea el ítem y su detalle químico mínimo en una transacción (Administrador, todo el espacio). */
export function createProduct(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof createProductRequest>,
): Promise<Product> {
  return runCommand(
    pool,
    request,
    'reagents.product.create',
    input,
    (access) => requireWorkspacePermission(access, 'reagents.catalog.manage'),
    async (access) => {
      const item = await createItem(inventoryContext(access), {
        code: input.code,
        name: input.name,
        baseUnit: input.baseUnit,
      });
      const [detail] = await insertProductDetail.run(
        {
          workspaceId: access.workspace.id,
          itemId: item.id,
          casNumber: input.casNumber ?? null,
          physicalState: input.physicalState ?? null,
        },
        access.client,
      );
      const product: Product = {
        id: item.id,
        code: item.code,
        name: item.name,
        baseUnit: item.baseUnit,
        casNumber: detail?.cas_number ?? null,
        physicalState: (detail?.physical_state ?? null) as Product['physicalState'],
      };
      await recordAudit(access, {
        action: 'reagents.product.create',
        entityType: 'inventory.item',
        entityId: item.id,
        changes: { ...product },
      });
      return product;
    },
  );
}

/** Crea un lote del producto; caducidad y lote del proveedor pueden quedar desconocidos. */
export function createLot(
  pool: pg.Pool,
  request: CommandRequest,
  productId: string,
  input: z.infer<typeof createLotRequest>,
): Promise<Lot> {
  return runCommand(
    pool,
    request,
    'reagents.lot.create',
    { productId, ...input },
    (access) => requireWorkspacePermission(access, 'reagents.catalog.manage'),
    async (access) => {
      const lot = await createInventoryLot(inventoryContext(access), productId, {
        code: input.code,
        supplierName: input.supplierName ?? null,
        supplierLot: input.supplierLot ?? null,
        expiresOn: input.expiresOn ?? null,
      });
      const result: Lot = {
        id: lot.id,
        productId: lot.itemId,
        code: lot.code,
        supplierName: lot.supplierName,
        supplierLot: lot.supplierLot,
        expiresOn: lot.expiresOn,
      };
      await recordAudit(access, {
        action: 'reagents.lot.create',
        entityType: 'inventory.lot',
        entityId: lot.id,
        changes: { ...result },
      });
      return result;
    },
  );
}

async function auditMovement(access: WorkspaceAccess, permission: string, result: MovementResponse, reason?: string) {
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

/** Ingreso: lote, ubicación, cantidad, unidad y referencia (Operador o Administrador). */
export function registerReceipt(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof receiptRequest>,
): Promise<MovementResponse> {
  const permission = 'reagents.receipt.create';
  return runCommand(pool, request, permission, input, (access) => requirePermission(access, permission), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockReceiptPosition(ctx, input, (locationId) =>
      requirePermissionAt(access, permission, locationId),
    );
    const result = await applyMovement(ctx, position, {
      type: 'receipt',
      quantity: input.quantity,
      unit: input.unit,
      reference: input.reference ?? null,
    });
    await auditMovement(access, permission, result);
    return result;
  });
}

/** Salida: posición, cantidad, unidad, motivo y destino; descuenta bajo el bloqueo de la posición. */
export function registerIssue(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof issueRequest>,
): Promise<MovementResponse> {
  const permission = 'reagents.issue.create';
  return runCommand(pool, request, permission, input, (access) => requirePermission(access, permission), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    await requirePermissionAt(access, permission, position.locationId);
    const result = await applyMovement(ctx, position, {
      type: 'issue',
      quantity: input.quantity,
      unit: input.unit,
      reason: input.reason,
      destination: input.destination,
    });
    await auditMovement(access, permission, result, input.reason);
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
  return runCommand(pool, request, permission, input, (access) => requirePermission(access, permission), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    await requirePermissionAt(access, permission, position.locationId);
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
