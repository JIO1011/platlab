import { AppError } from '../../../platform/errors.js';
import { releaseReserved, reserveQuantity } from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';
import type { LockedPosition } from './movements.js';

/**
 * Custodia de un material prestado (ADR 0025, 03 §4): lo prestado sigue en el saldo de su posición, que es
 * existencia institucional, pero deja de estar disponible porque se aparta en `reserved`. La base garantiza
 * 0 ≤ reservado ≤ saldo, así que una salida o un ajuste nunca dejan el saldo bajo lo prestado.
 */

/** Presta `quantity` de la posición ya bloqueada: solo si lo disponible alcanza. */
export async function holdForLoan(ctx: InventoryContext, position: LockedPosition, quantity: string): Promise<void> {
  if (!position.movable) throw new AppError('VALIDATION_FAILED', 'La posición no está disponible para préstamos');
  const [held] = await reserveQuantity.run({ workspaceId: ctx.workspaceId, positionId: position.id, quantity }, ctx.client);
  if (!held) throw new AppError('INSUFFICIENT_STOCK', 'No hay disponible suficiente para prestar');
}

/** Devuelve `quantity` prestada a lo disponible de la posición ya bloqueada. */
export async function releaseLoanHold(ctx: InventoryContext, positionId: string, quantity: string): Promise<void> {
  const [released] = await releaseReserved.run({ workspaceId: ctx.workspaceId, positionId, quantity }, ctx.client);
  if (!released) throw new Error('Lo prestado no estaba apartado en la posición');
}
