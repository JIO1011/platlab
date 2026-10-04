import type pg from 'pg';
import type { z } from 'zod';
import type {
  adjustmentRequest,
  createDestinationRequest,
  createLotRequest,
  createProductRequest,
  createReasonRequest,
  issueRequest,
  ListEntry,
  Lot,
  MovementResponse,
  Product,
  receiptRequest,
  ReceiptResponse,
} from '@platlab/contracts';
import {
  addDestination,
  addReason,
  applyMovement,
  createItem,
  createLot as createInventoryLot,
  lockExistingPosition,
  receiveContainers,
  retireDestination,
  retireReason,
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

/**
 * Ingreso por frascos (ADR 0012): uno o más frascos iguales de un lote existente o de uno nuevo,
 * que se crea en la misma transacción (01 §6.1). Lo registran el Operador y el Administrador.
 */
export function registerReceipt(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof receiptRequest>,
): Promise<ReceiptResponse> {
  const permission = 'reagents.receipt.create';
  return runCommand(pool, request, permission, input, (access) => requirePermission(access, permission), async (access) => {
    const lot =
      input.lotId !== undefined
        ? { id: input.lotId }
        : {
            itemId: input.productId ?? '',
            create: {
              code: input.newLot?.code ?? '',
              supplierName: input.newLot?.supplierName ?? null,
              supplierLot: input.newLot?.supplierLot ?? null,
              expiresOn: input.newLot?.expiresOn ?? null,
            },
          };
    const result = await receiveContainers(
      inventoryContext(access),
      {
        lot,
        locationId: input.locationId,
        count: input.containers,
        quantity: input.quantity,
        unit: input.unit,
        reference: input.reference ?? null,
      },
      (locationId) => requirePermissionAt(access, permission, locationId),
    );
    await recordAudit(access, {
      action: permission,
      entityType: 'inventory.operation',
      entityId: result.operationId,
      reason: null,
      changes: {
        lotId: result.lot.id,
        unit: result.unit,
        containers: result.containers.map(({ containerId, positionId, quantity }) => ({ containerId, positionId, quantity })),
      },
    });
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

// ---------------------------------------------------------------------------
// Motivos y destinos (ADR 0012): los administra el Administrador; se archivan, no se borran
// ---------------------------------------------------------------------------

const LISTS = 'reagents.catalog.manage';

export function createReason(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof createReasonRequest>,
): Promise<ListEntry> {
  return runCommand(pool, request, 'reagents.reason.create', input, (access) => requireWorkspacePermission(access, LISTS), async (access) => {
    const entry = await addReason(inventoryContext(access), input.kind, input.name);
    await recordAudit(access, {
      action: 'reagents.reason.create',
      entityType: 'inventory.reason',
      entityId: entry.id,
      changes: { kind: input.kind, name: entry.name },
    });
    return entry;
  });
}

export function archiveReason(pool: pg.Pool, request: CommandRequest, id: string): Promise<{ id: string }> {
  return runCommand(pool, request, 'reagents.reason.archive', { id }, (access) => requireWorkspacePermission(access, LISTS), async (access) => {
    await retireReason(inventoryContext(access), id);
    await recordAudit(access, { action: 'reagents.reason.archive', entityType: 'inventory.reason', entityId: id, changes: {} });
    return { id };
  });
}

export function createDestination(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof createDestinationRequest>,
): Promise<ListEntry> {
  return runCommand(pool, request, 'reagents.destination.create', input, (access) => requireWorkspacePermission(access, LISTS), async (access) => {
    const entry = await addDestination(inventoryContext(access), input.name);
    await recordAudit(access, {
      action: 'reagents.destination.create',
      entityType: 'inventory.destination',
      entityId: entry.id,
      changes: { name: entry.name },
    });
    return entry;
  });
}

export function archiveDestination(pool: pg.Pool, request: CommandRequest, id: string): Promise<{ id: string }> {
  return runCommand(pool, request, 'reagents.destination.archive', { id }, (access) => requireWorkspacePermission(access, LISTS), async (access) => {
    await retireDestination(inventoryContext(access), id);
    await recordAudit(access, {
      action: 'reagents.destination.archive',
      entityType: 'inventory.destination',
      entityId: id,
      changes: {},
    });
    return { id };
  });
}
