import { freeSeries, nextCode, seriesFromName } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { containerCodesLike, findItemName, lastNumberedContainerCode } from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

/**
 * Códigos sugeridos para `count` frascos (ADR 0015): siguen la serie de los frascos del ítem
 * (`AC-BIO-001` → `AC-BIO-002`) o, si no tiene, empiezan una a partir del nombre (`ACE-001`). Es la
 * primera serie libre en todo el espacio; el ingreso la vuelve a comprobar al guardar.
 */
export async function suggestContainerCodes(
  ctx: InventoryContext,
  input: { itemId?: string | undefined; name?: string | undefined; count: number },
): Promise<string[]> {
  let first: string | null = null;
  let name = input.name;
  if (input.itemId !== undefined) {
    const [item] = await findItemName.run({ workspaceId: ctx.workspaceId, itemId: input.itemId, kind: ctx.kind }, ctx.client);
    if (!item) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    name = item.name;
    const [last] = await lastNumberedContainerCode.run(
      { workspaceId: ctx.workspaceId, itemId: input.itemId, kind: ctx.kind },
      ctx.client,
    );
    if (last) first = nextCode(last.code);
  }
  first ??= seriesFromName(name ?? '');
  const prefix = first.replace(/\d+$/, '');
  const taken = await containerCodesLike.run({ workspaceId: ctx.workspaceId, prefix }, ctx.client);
  return freeSeries(first, input.count, taken.map((row) => row.code));
}
