import type pg from 'pg';
import type { z } from 'zod';
import {
  unitViolation,
  type Material,
  type MaterialClass,
  type newMaterial,
  type updateMaterialRequest,
} from '@platlab/contracts';
import { createItem, hasMovements, lockItem, setMinimum, updateItemFields } from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import { definedFields } from '../../../platform/objects.js';
import { recordAudit } from '../../core/index.js';
import { findProductDetail, insertProductDetail } from '../infrastructure/products.queries.js';
import { CATALOG, inventoryContext, requires, runCommand, type CommandRequest } from './command.js';

/** Catálogo de Materiales (ADR 0025): alta con código automático, ficha editable y mínimo. */

const toMaterial = (
  item: { id: string; code: string; name: string; baseUnit: string; minimum: string | null },
  materialClass: MaterialClass,
): Material => ({ ...item, class: materialClass });

/** Alta de un material: ítem con código automático y su clase (Administrador, todo el espacio). */
export function createMaterial(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof newMaterial>): Promise<Material> {
  return runCommand(pool, request, 'materials.product.create', input, requires(CATALOG), async (access) => {
    const item = await createItem(inventoryContext(access), { name: input.name, baseUnit: input.baseUnit });
    const [detail] = await insertProductDetail.run(
      { workspaceId: access.workspace.id, itemId: item.id, class: input.class },
      access.client,
    );
    if (!detail) throw new Error('La clase del material no devolvió fila');
    const material = toMaterial(item, detail.class as MaterialClass);
    await recordAudit(access, {
      action: 'materials.product.create',
      entityType: 'inventory.item',
      entityId: item.id,
      changes: { ...material },
    });
    return material;
  });
}

/**
 * Edita nombre y unidad con el ítem bloqueado: cambia solo lo enviado, valida la unidad contra la clase y
 * audita lo que cambió. La clase no cambia nunca; la unidad, solo sin movimientos.
 */
export function updateMaterial(
  pool: pg.Pool,
  request: CommandRequest,
  productId: string,
  input: z.infer<typeof updateMaterialRequest>,
): Promise<Material> {
  return runCommand(
    pool,
    request,
    'materials.product.update',
    { productId, ...input },
    requires(CATALOG),
    async (access) => {
      const ctx = inventoryContext(access);
      const item = await lockItem(ctx, productId, { rename: input.name !== undefined });
      const [detail] = await findProductDetail.run({ workspaceId: access.workspace.id, itemId: productId }, access.client);
      if (!detail) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
      const before = toMaterial(item, detail.class as MaterialClass);
      const after: Material = { ...before, ...definedFields(input) };
      const violation = unitViolation(after);
      if (violation) throw new AppError('VALIDATION_FAILED', violation);
      await updateItemFields(ctx, item, { name: after.name, baseUnit: after.baseUnit });
      const changes = Object.fromEntries(
        (Object.keys(input) as Array<keyof typeof input>)
          .filter((field) => before[field] !== after[field])
          .map((field) => [field, { from: before[field], to: after[field] }]),
      );
      await recordAudit(access, { action: 'materials.product.update', entityType: 'inventory.item', entityId: productId, changes });
      return after;
    },
  );
}

/** Fija o quita el mínimo de un material, para todo el espacio (ADR 0012). */
export function setMaterialMinimum(
  pool: pg.Pool,
  request: CommandRequest,
  productId: string,
  minimum: string | null,
): Promise<{ productId: string; minimum: string | null }> {
  return runCommand(pool, request, 'materials.product.minimum', { productId, minimum }, requires(CATALOG), async (access) => {
    const stored = await setMinimum(inventoryContext(access), productId, minimum);
    await recordAudit(access, {
      action: 'materials.product.minimum',
      entityType: 'inventory.item',
      entityId: productId,
      changes: { minimum: stored },
    });
    return { productId, minimum: stored };
  });
}

/** Si la unidad del material aún puede cambiar: sin movimientos (ADR 0015). */
export const unitEditable = async (access: Parameters<typeof inventoryContext>[0], productId: string) =>
  !(await hasMovements(inventoryContext(access), productId));
