import type pg from 'pg';
import type { z } from 'zod';
import {
  productRuleViolation,
  type adjustmentRequest,
  type countRequest,
  type CountResponse,
  type createEntryRequest,
  type createLocationRequest,
  type createReasonRequest,
  type issueRequest,
  type IssueResponse,
  type ListEntry,
  type Location,
  type MovementResponse,
  type newProduct,
  type Product,
  type receiptRequest,
  type ReceiptResponse,
  type setTareRequest,
  type TareResponse,
  type transferRequest,
  type TransferResponse,
  type updateProductRequest,
  type weightAdjustmentRequest,
} from '@platlab/contracts';
import {
  addEntry,
  addReason,
  adjustByWeight,
  applyMovement,
  approveIssueRequest,
  countLocation,
  createItem,
  lockExistingPosition,
  lockItem,
  receiveContainers,
  releaseIssueRequest,
  requestIssue,
  retireEntry,
  retireReason,
  setMinimum,
  setTare,
  transferContainer,
  updateItemFields,
  type InventoryContext,
  type NamedList,
} from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import { withIdempotency } from '../../../platform/idempotency/idempotency.js';
import {
  createLocation,
  hasPermissionAt,
  recordAudit,
  requirePermission,
  requirePermissionAt,
  requireWorkspacePermission,
  withModuleAccess,
  type WorkspaceAccess,
} from '../../core/index.js';
import {
  findProductDetail,
  insertProductDetail,
  updateProductDetail,
  type IFindProductDetailResult,
} from '../infrastructure/products.queries.js';

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

/** Catálogo: alta y edición de reactivos, listas y ubicaciones (Administrador y Propietario). */
const CATALOG = 'reagents.catalog.manage';

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
  // Decidir una solicitud es resolver un pendiente (ADR 0009): sigue admitido en consulta o cierre.
  actionClass: 'new_operation' | 'resolve_pending' = 'new_operation',
): Promise<T> {
  return withModuleAccess(
    pool,
    { subject: request.subject, workspaceId: request.workspaceId, moduleCode: 'reagents', actionClass },
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

// ---------------------------------------------------------------------------
// Catálogo (ADR 0015): alta con código automático y ficha editable
// ---------------------------------------------------------------------------

/** Pictogramas sin repetir y en su orden oficial, para comparar y mostrar siempre igual. */
const sortedHazards = (hazards: readonly string[]) => [...new Set(hazards)].sort() as Product['hazards'];

const toProduct = (
  item: { id: string; code: string; name: string; baseUnit: string; minimum: string | null },
  detail: IFindProductDetailResult,
): Product => ({
  id: item.id,
  code: item.code,
  name: item.name,
  baseUnit: item.baseUnit,
  casNumber: detail.cas_number,
  physicalState: detail.physical_state as Product['physicalState'],
  minimum: item.minimum,
  hazards: detail.hazards as Product['hazards'],
  controlled: detail.controlled,
  sdsKind: detail.sds_kind as Product['sdsKind'],
  sdsUrl: detail.sds_url,
  density: detail.density,
});

/** Crea el ítem con código automático y su ficha química, y lo audita; quien llama ya autorizó. */
async function insertProduct(access: WorkspaceAccess, input: z.infer<typeof newProduct>): Promise<Product> {
  const item = await createItem(inventoryContext(access), { name: input.name, baseUnit: input.baseUnit });
  const [detail] = await insertProductDetail.run(
    {
      workspaceId: access.workspace.id,
      itemId: item.id,
      casNumber: input.casNumber ?? null,
      physicalState: input.physicalState,
      hazards: sortedHazards(input.hazards),
      controlled: input.controlled,
      sdsKind: input.sdsKind ?? null,
      sdsUrl: input.sdsUrl ?? null,
      density: input.density ?? null,
    },
    access.client,
  );
  if (!detail) throw new Error('La ficha del reactivo no devolvió fila');
  const product = toProduct(item, detail);
  await recordAudit(access, {
    action: 'reagents.product.create',
    entityType: 'inventory.item',
    entityId: item.id,
    changes: { ...product },
  });
  return product;
}

/** Alta de un reactivo en el catálogo (Administrador, todo el espacio). */
export function createProduct(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof newProduct>): Promise<Product> {
  return runCommand(
    pool,
    request,
    'reagents.product.create',
    input,
    (access) => requireWorkspacePermission(access, CATALOG),
    (access) => insertProduct(access, input),
  );
}

/** Solo los campos enviados: en una edición parcial, lo ausente conserva su valor. */
const definedFields = <T extends object>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };

async function productDetailOf(access: WorkspaceAccess, itemId: string): Promise<IFindProductDetailResult> {
  const [detail] = await findProductDetail.run({ workspaceId: access.workspace.id, itemId }, access.client);
  if (!detail) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return detail;
}

/**
 * Edita la ficha (ADR 0015) con el ítem bloqueado: cambia solo lo enviado, valida las reglas sobre la
 * ficha combinada (el CAS, si el cambio toca CAS o estado) y audita lo que cambió, antes y después.
 */
export function updateProduct(
  pool: pg.Pool,
  request: CommandRequest,
  productId: string,
  input: z.infer<typeof updateProductRequest>,
): Promise<Product> {
  return runCommand(
    pool,
    request,
    'reagents.product.update',
    { productId, ...input },
    (access) => requireWorkspacePermission(access, CATALOG),
    async (access) => {
      const ctx = inventoryContext(access);
      const item = await lockItem(ctx, productId, { rename: input.name !== undefined });
      const before = toProduct(item, await productDetailOf(access, productId));
      const after: Product = { ...before, ...definedFields(input), hazards: sortedHazards(input.hazards ?? before.hazards) };
      const violation = productRuleViolation(after, { cas: input.casNumber !== undefined || input.physicalState !== undefined });
      if (violation) throw new AppError('VALIDATION_FAILED', violation);

      await updateItemFields(ctx, item, { name: after.name, baseUnit: after.baseUnit });
      const [updated] = await updateProductDetail.run(
        {
          workspaceId: access.workspace.id,
          itemId: productId,
          casNumber: after.casNumber,
          physicalState: after.physicalState,
          hazards: after.hazards,
          controlled: after.controlled,
          sdsKind: after.sdsKind,
          sdsUrl: after.sdsUrl,
          density: after.density,
        },
        access.client,
      );
      if (!updated) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
      const fields = Object.keys(input) as Array<keyof typeof input>;
      const changes = Object.fromEntries(
        fields
          .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
          .map((field) => [field, { from: before[field], to: after[field] }]),
      );
      await recordAudit(access, { action: 'reagents.product.update', entityType: 'inventory.item', entityId: productId, changes });
      return after;
    },
  );
}

/** Fija o quita el mínimo de un reactivo, para todo el espacio (ADR 0012, 05-10-2026). */
export function setProductMinimum(
  pool: pg.Pool,
  request: CommandRequest,
  productId: string,
  minimum: string | null,
): Promise<{ productId: string; minimum: string | null }> {
  return runCommand(
    pool,
    request,
    'reagents.product.minimum',
    { productId, minimum },
    (access) => requireWorkspacePermission(access, CATALOG),
    async (access) => {
      const stored = await setMinimum(inventoryContext(access), productId, minimum);
      await recordAudit(access, {
        action: 'reagents.product.minimum',
        entityType: 'inventory.item',
        entityId: productId,
        changes: { minimum: stored },
      });
      return { productId, minimum: stored };
    },
  );
}

/**
 * Crea una ubicación de Core desde Reactivos (ADR 0015): Core no tiene permisos propios, así que la
 * crea quien administra el catálogo, en todo el espacio. Un nombre repetido devuelve la existente.
 */
export function createWorkspaceLocation(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof createLocationRequest>,
): Promise<Location> {
  return runCommand(
    pool,
    request,
    'reagents.location.create',
    input,
    (access) => requireWorkspacePermission(access, CATALOG),
    async (access) => {
      const { created, ...location } = await createLocation(access, input);
      await recordAudit(access, {
        action: 'reagents.location.create',
        entityType: 'core.location',
        entityId: location.id,
        changes: { ...location, created },
      });
      return location;
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
    if (input.newProduct) await requireWorkspacePermission(access, CATALOG);
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
      (locationId) => requirePermissionAt(access, permission, locationId),
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

/** Salida: posición, cantidad, unidad, motivo y destino; descuenta bajo el bloqueo de la posición. */
const APPROVE = 'reagents.issue.approve';

/**
 * Salida (ADR 0012): quien puede aprobar en la ubicación del frasco la registra al instante; el
 * Operador deja una solicitud pendiente que aparta la cantidad. Lo decide el servidor, nunca el
 * navegador: el mismo envío da una salida o una solicitud según el permiso de quien lo hace.
 */
export function registerIssue(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof issueRequest>,
): Promise<IssueResponse> {
  const permission = 'reagents.issue.create';
  return runCommand(pool, request, permission, input, (access) => requirePermission(access, permission), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    await requirePermissionAt(access, permission, position.locationId);
    if (await hasPermissionAt(access, APPROVE, position.locationId)) {
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
    (access) => requirePermission(access, APPROVE),
    async (access) => {
      const result = await approveIssueRequest(inventoryContext(access), requestId, (locationId) =>
        requirePermissionAt(access, APPROVE, locationId),
      );
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
    (access) => requirePermission(access, APPROVE),
    async (access) => {
      const result = await releaseIssueRequest(inventoryContext(access), requestId, { kind: 'reject', reason }, (locationId) =>
        requirePermissionAt(access, APPROVE, locationId),
      );
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
    (access) => requirePermission(access, 'reagents.issue.create'),
    async (access) => {
      const result = await releaseIssueRequest(inventoryContext(access), requestId, { kind: 'cancel' }, async () => {});
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

/** Traslado de un frasco entero a otra ubicación, en un paso (Operador y Administrador, ADR 0012). */
export function registerTransfer(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof transferRequest>,
): Promise<TransferResponse> {
  const permission = 'reagents.transfer.create';
  return runCommand(pool, request, permission, input, (access) => requirePermission(access, permission), async (access) => {
    const result = await transferContainer(
      inventoryContext(access),
      { positionId: input.positionId, locationId: input.locationId, reference: input.reference ?? null },
      (locationId) => requirePermissionAt(access, permission, locationId),
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
  return runCommand(pool, request, 'reagents.count.create', input, (access) => requirePermission(access, permission), async (access) => {
    const result = await countLocation(inventoryContext(access), input, (locationId) =>
      requirePermissionAt(access, permission, locationId),
    );
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
  return runCommand(pool, request, 'reagents.adjustment.weight', input, (access) => requirePermission(access, permission), async (access) => {
    const ctx = inventoryContext(access);
    const position = await lockExistingPosition(ctx, input.positionId);
    await requirePermissionAt(access, permission, position.locationId);
    const result = await adjustByWeight(ctx, position, input.grossWeight);
    await auditMovement(access, permission, result, 'Pesada');
    return result;
  });
}

/**
 * Fija la tara de un frasco (ADR 0015): la fija quien ajusta en su ubicación. Reemplaza la anterior y
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
    (access) => requirePermission(access, permission),
    async (access) => {
      const result = await setTare(
        inventoryContext(access),
        {
          containerId,
          grossWeight: input.grossWeight,
          density: input.density ?? null,
          fallbackDensity: (itemId) => productDensity(access, itemId),
        },
        (locationId) => requirePermissionAt(access, permission, locationId),
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

// ---------------------------------------------------------------------------
// Motivos, destinos (ADR 0012) y áreas (ADR 0015): las administra el Administrador; se archivan
// ---------------------------------------------------------------------------

export function createReason(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof createReasonRequest>,
): Promise<ListEntry> {
  return runCommand(pool, request, 'reagents.reason.create', input, (access) => requireWorkspacePermission(access, CATALOG), async (access) => {
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
  return runCommand(pool, request, 'reagents.reason.archive', { id }, (access) => requireWorkspacePermission(access, CATALOG), async (access) => {
    await retireReason(inventoryContext(access), id);
    await recordAudit(access, { action: 'reagents.reason.archive', entityType: 'inventory.reason', entityId: id, changes: {} });
    return { id };
  });
}

/** Alta de un destino o un área; un nombre activo repetido devuelve el existente. */
export function createEntry(
  pool: pg.Pool,
  request: CommandRequest,
  list: NamedList,
  input: z.infer<typeof createEntryRequest>,
): Promise<ListEntry> {
  const action = `reagents.${list}.create`;
  return runCommand(pool, request, action, input, (access) => requireWorkspacePermission(access, CATALOG), async (access) => {
    const entry = await addEntry(inventoryContext(access), list, input.name);
    await recordAudit(access, { action, entityType: `inventory.${list}`, entityId: entry.id, changes: { name: entry.name } });
    return entry;
  });
}

export function archiveEntry(pool: pg.Pool, request: CommandRequest, list: NamedList, id: string): Promise<{ id: string }> {
  const action = `reagents.${list}.archive`;
  return runCommand(pool, request, action, { id }, (access) => requireWorkspacePermission(access, CATALOG), async (access) => {
    await retireEntry(inventoryContext(access), list, id);
    await recordAudit(access, { action, entityType: `inventory.${list}`, entityId: id, changes: {} });
    return { id };
  });
}
