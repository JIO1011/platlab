import type pg from 'pg';
import type { z } from 'zod';
import {
  productRuleViolation,
  type newProduct,
  type Product,
  type updateProductRequest,
} from '@platlab/contracts';
import { createItem, lockItem, setMinimum, updateItemFields } from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import { definedFields } from '../../../platform/objects.js';
import { recordAudit, type WorkspaceAccess } from '../../core/index.js';
import {
  findProductDetail,
  insertProductDetail,
  updateProductDetail,
  type IFindProductDetailResult,
} from '../infrastructure/products.queries.js';
import { CATALOG, inventoryContext, requires, runCommand, type CommandRequest } from './command.js';

/** Catálogo (ADR 0015): alta con código automático, ficha editable, mínimo y ubicaciones de Core. */

/** Pictogramas sin repetir y en su orden oficial, para comparar y mostrar siempre igual. */
const sortedHazards = (hazards: readonly string[]) => [...new Set(hazards)].sort() as Product['hazards'];

export const toProduct = (
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
  sdsFileUrl: detail.sds_file_url,
  density: detail.density,
});

/** Crea el ítem con código automático y su ficha química, y lo audita; quien llama ya autorizó. */
export async function insertProduct(access: WorkspaceAccess, input: z.infer<typeof newProduct>): Promise<Product> {
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
    requires(CATALOG),
    (access) => insertProduct(access, input),
  );
}

export async function productDetailOf(access: WorkspaceAccess, itemId: string): Promise<IFindProductDetailResult> {
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
    requires(CATALOG),
    async (access) => {
      const ctx = inventoryContext(access);
      const item = await lockItem(ctx, productId, { rename: input.name !== undefined });
      const before = toProduct(item, await productDetailOf(access, productId));
      const after: Product = { ...before, ...definedFields(input), hazards: sortedHazards(input.hazards ?? before.hazards) };
      const violation = productRuleViolation(after, { cas: input.casNumber !== undefined || input.physicalState !== undefined });
      if (violation) throw new AppError('VALIDATION_FAILED', violation);

      // El PDF sigue vigente solo con ficha digital y sin enlace: un enlace nuevo o «física»/«no tiene»
      // lo reemplazan (ADR 0017); el archivo queda en el historial.
      const keepSheet = after.sdsFileUrl !== null && after.sdsKind === 'digital' && !after.sdsUrl;
      after.sdsFileUrl = keepSheet ? after.sdsFileUrl : null;

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
          keepSheet,
        },
        access.client,
      );
      if (!updated) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
      const fields: Array<keyof Product> = [...(Object.keys(input) as Array<keyof typeof input>), 'sdsFileUrl'];
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
    requires(CATALOG),
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
