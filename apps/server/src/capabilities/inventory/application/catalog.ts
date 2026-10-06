import { AppError } from '../../../platform/errors.js';
import { findItem, insertItem, insertLot, setItemMinimum } from '../infrastructure/inventory.queries.js';
import { pgViolation, type InventoryContext } from './context.js';

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

export interface NewItem {
  code: string;
  name: string;
  baseUnit: string;
  /** Mínimo para todo el espacio, en la unidad base (ADR 0012); null si no tiene. */
  minimum: string | null;
}

export interface ItemRecord {
  id: string;
  code: string;
  name: string;
  baseUnit: string;
  minimum: string | null;
}

export async function createItem(ctx: InventoryContext, input: NewItem): Promise<ItemRecord> {
  try {
    const [row] = await insertItem.run(
      {
        workspaceId: ctx.workspaceId,
        kind: ctx.kind,
        code: input.code,
        name: input.name,
        baseUnit: input.baseUnit,
        minimum: input.minimum,
      },
      ctx.client,
    );
    if (!row) throw new Error('La inserción del ítem no devolvió fila');
    return { id: row.id, code: row.code, name: row.name, baseUnit: row.base_unit, minimum: row.minimum };
  } catch (error) {
    const violation = pgViolation(error);
    if (violation?.code === '23505' && violation.constraint === 'items_code') {
      throw new AppError('VALIDATION_FAILED', 'Ya existe un producto con ese código en el espacio');
    }
    if (violation?.code === '23503') throw new AppError('VALIDATION_FAILED', 'Unidad desconocida');
    throw error;
  }
}

/** Ítem activo del tipo del módulo; uno ajeno, de otro tipo o archivado no existe para él. */
async function getItem(ctx: InventoryContext, itemId: string): Promise<void> {
  const [row] = await findItem.run({ workspaceId: ctx.workspaceId, itemId, kind: ctx.kind }, ctx.client);
  if (!row) throw notFound();
}

/** Fija o quita el mínimo de un ítem activo del tipo del módulo (ADR 0012, 05-10-2026). */
export async function setMinimum(ctx: InventoryContext, itemId: string, minimum: string | null): Promise<string | null> {
  const [row] = await setItemMinimum.run({ workspaceId: ctx.workspaceId, itemId, kind: ctx.kind, minimum }, ctx.client);
  if (!row) throw notFound();
  return row.minimum;
}

export interface NewLot {
  code: string;
  supplierName: string | null;
  supplierLot: string | null;
  expiresOn: string | null;
}

export interface LotRecord extends NewLot {
  id: string;
  itemId: string;
}

/** Crea un lote del ítem: debe existir, ser del tipo del módulo y pertenecer al mismo espacio. */
export async function createLot(ctx: InventoryContext, itemId: string, input: NewLot): Promise<LotRecord> {
  await getItem(ctx, itemId);
  try {
    const [row] = await insertLot.run(
      {
        workspaceId: ctx.workspaceId,
        itemId,
        code: input.code,
        supplierName: input.supplierName,
        supplierLot: input.supplierLot,
        expiresOn: input.expiresOn,
      },
      ctx.client,
    );
    if (!row) throw new Error('La inserción del lote no devolvió fila');
    return {
      id: row.id,
      itemId: row.item_id,
      code: row.code,
      supplierName: row.supplier_name,
      supplierLot: row.supplier_lot,
      expiresOn: row.expires_on,
    };
  } catch (error) {
    const violation = pgViolation(error);
    if (violation?.code === '23505' && violation.constraint === 'lots_code') {
      throw new AppError('VALIDATION_FAILED', 'Ya existe un lote con ese código para este producto');
    }
    throw error;
  }
}
