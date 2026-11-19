import { AppError } from '../../../platform/errors.js';
import {
  ensureStockPosition,
  findMaterialLot,
  findLocation,
  lockItem as lockItemQuery,
  lockStockPosition,
} from '../infrastructure/inventory.queries.js';
import { openLot } from './catalog.js';
import type { InventoryContext } from './context.js';
import { applyMovement, type MovementResult } from './movements.js';

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

/** El lote de un ingreso de material (ADR 0025, MA-01f): con fecha y lote del proveedor si el insumo vence; sin ellos, el lote único. */
export interface MaterialLotInput {
  supplierLot: string | null;
  expiresOn: string | null;
}

/**
 * Busca el lote del ingreso y, si no existe, lo abre. El mismo lote del proveedor con otra fecha es un error de captura,
 * no un lote nuevo. Va con el ítem ya bloqueado, así que dos ingresos del mismo lote no abren dos.
 */
async function materialLot(ctx: InventoryContext, itemId: string, lot: MaterialLotInput): Promise<string> {
  const [existing] = await findMaterialLot.run({ workspaceId: ctx.workspaceId, itemId, ...lot }, ctx.client);
  if (!existing) return (await openLot(ctx, itemId, { brand: null, departmentId: null, ...lot })).id;
  // Sin lote del proveedor la búsqueda ya exige la misma fecha: solo un lote con código puede no coincidir.
  if (existing.expires_on !== lot.expiresOn) {
    throw new AppError('VALIDATION_FAILED', `El lote ${lot.supplierLot} ya está registrado con vencimiento ${existing.expires_on ?? 'sin fecha'}`);
  }
  return existing.id;
}

/**
 * Ingreso de un material sin envases (ADR 0025): suma `quantity` a su posición en la ubicación y el lote, que se crean
 * con el primer ingreso. Sin fecha ni lote del proveedor, el material tiene un solo lote. Bloquea en el orden fijo
 * de 02 §6: ubicación → ítem → lote → posición.
 */
export async function receiveStock(
  ctx: InventoryContext,
  input: { itemId: string; locationId: string; quantity: string; unit: string; reference: string | null; lot: MaterialLotInput },
): Promise<MovementResult> {
  const workspaceId = ctx.workspaceId;
  // Ubicación primero, como el ingreso de frascos: un mismo orden de bloqueo para todos los ingresos.
  const [place] = await findLocation.run({ workspaceId, locationId: input.locationId }, ctx.client);
  if (!place) throw notFound();
  const [item] = await lockItemQuery.run({ workspaceId, itemId: input.itemId, kind: ctx.kind }, ctx.client);
  if (!item) throw notFound();
  const lotId = await materialLot(ctx, item.id, input.lot);

  const key = { workspaceId, itemId: item.id, lotId, locationId: place.id };
  await ensureStockPosition.run(key, ctx.client);
  const [position] = await lockStockPosition.run(key, ctx.client);
  if (!position) throw new Error('La posición del material no devolvió fila');
  return applyMovement(
    ctx,
    { id: position.id, baseUnit: item.base_unit, movable: true },
    { type: 'receipt', quantity: input.quantity, unit: input.unit, reference: input.reference },
  );
}
