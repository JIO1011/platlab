import { AppError } from '../../../platform/errors.js';
import { freeCodeFor, lockKey } from '../../../platform/db/codes.js';
import {
  insertItem,
  insertLot,
  itemCodesLike,
  itemHasMovements,
  itemNameTaken,
  lockItem as lockItemQuery,
  reserveLotSeq,
  setItemMinimum,
  updateItem,
} from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

export interface ItemRecord {
  id: string;
  code: string;
  name: string;
  baseUnit: string;
  /** Mínimo para todo el espacio, en la unidad base (ADR 0012); null si no tiene. */
  minimum: string | null;
}

/** Bloqueo del catálogo del espacio: serializa las altas y los cambios de nombre de sus ítems. */
const catalogLock = (ctx: InventoryContext) => `inventory.items/${ctx.workspaceId}`;

/**
 * Un nombre no se repite entre los ítems activos del tipo (ADR 0015), sin tildes, mayúsculas ni
 * espacios de más: el existente se elige de la lista. Se llama con el bloqueo del catálogo tomado.
 */
async function requireFreeName(ctx: InventoryContext, name: string, exceptId: string | null): Promise<void> {
  const [taken] = await itemNameTaken.run({ workspaceId: ctx.workspaceId, kind: ctx.kind, name, exceptId }, ctx.client);
  if (taken) throw new AppError('NAME_TAKEN', `Ya existe «${taken.name}» en el catálogo: elígelo de la lista`);
}

/**
 * Crea un ítem del tipo del módulo con código automático a partir del nombre (ADR 0015): el bloqueo
 * del catálogo serializa las altas, así un nombre repetido se rechaza y dos nombres que dan el mismo
 * código reciben códigos distintos.
 */
export async function createItem(ctx: InventoryContext, input: { name: string; baseUnit: string }): Promise<ItemRecord> {
  const code = await freeCodeFor(ctx.client, {
    lockKey: catalogLock(ctx),
    name: input.name,
    fallback: 'ITEM',
    takenLike: async (base) =>
      (await itemCodesLike.run({ workspaceId: ctx.workspaceId, base }, ctx.client)).map((row) => row.code),
  });
  await requireFreeName(ctx, input.name, null);
  const [row] = await insertItem.run(
    { workspaceId: ctx.workspaceId, kind: ctx.kind, code, name: input.name, baseUnit: input.baseUnit },
    ctx.client,
  );
  if (!row) throw new Error('La inserción del ítem no devolvió fila');
  return { id: row.id, code: row.code, name: row.name, baseUnit: row.base_unit, minimum: row.minimum };
}

/** Fija o quita el mínimo de un ítem activo del tipo del módulo (ADR 0012, 05-10-2026). */
export async function setMinimum(ctx: InventoryContext, itemId: string, minimum: string | null): Promise<string | null> {
  const [row] = await setItemMinimum.run({ workspaceId: ctx.workspaceId, itemId, kind: ctx.kind, minimum }, ctx.client);
  if (!row) throw notFound();
  return row.minimum;
}

/** Si el ítem ya tiene asientos: su unidad no cambia más (ADR 0015). */
export async function hasMovements(ctx: InventoryContext, itemId: string): Promise<boolean> {
  const [row] = await itemHasMovements.run({ workspaceId: ctx.workspaceId, itemId }, ctx.client);
  return row?.has_movements ?? false;
}

/**
 * Ítem activo del tipo del módulo, bloqueado para editarlo; uno ajeno o archivado no existe. Con
 * `rename`, toma antes el bloqueo del catálogo (el mismo orden que un alta) para cambiar el nombre.
 */
export async function lockItem(ctx: InventoryContext, itemId: string, { rename = false } = {}): Promise<ItemRecord> {
  if (rename) await lockKey(ctx.client, catalogLock(ctx));
  const [row] = await lockItemQuery.run({ workspaceId: ctx.workspaceId, itemId, kind: ctx.kind }, ctx.client);
  if (!row) throw notFound();
  return { id: row.id, code: row.code, name: row.name, baseUnit: row.base_unit, minimum: row.minimum };
}

/**
 * Cambia nombre y unidad de un ítem ya bloqueado con `lockItem` y sube su versión. La unidad solo
 * cambia mientras no haya movimientos (ADR 0015); el código no cambia. Un nombre nuevo exige haberlo
 * bloqueado con `rename` y no puede ser el de otro ítem.
 */
export async function updateItemFields(
  ctx: InventoryContext,
  item: ItemRecord,
  fields: { name: string; baseUnit: string },
): Promise<void> {
  if (fields.baseUnit !== item.baseUnit && (await hasMovements(ctx, item.id))) {
    throw new AppError('VALIDATION_FAILED', 'La unidad no cambia: el reactivo ya tiene movimientos');
  }
  if (fields.name !== item.name) await requireFreeName(ctx, fields.name, item.id);
  const [row] = await updateItem.run(
    { workspaceId: ctx.workspaceId, itemId: item.id, kind: ctx.kind, name: fields.name, baseUnit: fields.baseUnit },
    ctx.client,
  );
  if (!row) throw notFound();
}

export interface LotDetails {
  brand: string | null;
  area: string | null;
  expiresOn: string | null;
}

export interface OpenedLot {
  id: string;
  code: string;
  item: { id: string; code: string; name: string; baseUnit: string };
}

/** Código del lote automático: L-001, L-002… (ADR 0015). */
const lotCode = (seq: number) => `L-${String(seq).padStart(3, '0')}`;

/**
 * Abre un lote nuevo del ítem con el siguiente código automático (ADR 0015). Reservar el número
 * bloquea el ítem hasta el final de la transacción; si un lote anterior ya tiene ese código, sigue
 * con el siguiente.
 */
export async function openLot(ctx: InventoryContext, itemId: string, details: LotDetails): Promise<OpenedLot> {
  for (;;) {
    const [item] = await reserveLotSeq.run({ workspaceId: ctx.workspaceId, itemId, kind: ctx.kind }, ctx.client);
    if (!item) throw notFound();
    const [lot] = await insertLot.run(
      { workspaceId: ctx.workspaceId, itemId, code: lotCode(item.lot_seq), ...details },
      ctx.client,
    );
    if (lot) {
      return { id: lot.id, code: lot.code, item: { id: itemId, code: item.code, name: item.name, baseUnit: item.base_unit } };
    }
  }
}
