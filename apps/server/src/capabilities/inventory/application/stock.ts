import { AppError } from '../../../platform/errors.js';
import {
  ensureStockPosition,
  findItemLot,
  findLocation,
  lockItem as lockItemQuery,
  lockStockPosition,
} from '../infrastructure/inventory.queries.js';
import { openLot } from './catalog.js';
import type { InventoryContext } from './context.js';
import { applyMovement, type MovementResult } from './movements.js';

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

/**
 * Ingreso de un material sin envases (ADR 0025): suma `quantity` a su posición en la ubicación, que se
 * crea con el primer ingreso. Un material tiene un solo lote, creado también con el primero. Bloquea en
 * el orden fijo de 02 §6: ubicación → ítem → lote → posición.
 */
export async function receiveStock(
  ctx: InventoryContext,
  input: { itemId: string; locationId: string; quantity: string; unit: string; reference: string | null },
): Promise<MovementResult> {
  const workspaceId = ctx.workspaceId;
  // Ubicación primero, como el ingreso de frascos: un mismo orden de bloqueo para todos los ingresos.
  const [place] = await findLocation.run({ workspaceId, locationId: input.locationId }, ctx.client);
  if (!place) throw notFound();
  const [item] = await lockItemQuery.run({ workspaceId, itemId: input.itemId, kind: ctx.kind }, ctx.client);
  if (!item) throw notFound();

  const [existing] = await findItemLot.run({ workspaceId, itemId: item.id }, ctx.client);
  const lotId = existing?.id ?? (await openLot(ctx, item.id, { brand: null, departmentId: null, expiresOn: null })).id;

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
