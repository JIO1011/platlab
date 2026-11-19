import type pg from 'pg';
import type { MaterialMovement, MaterialMovementFilters, MaterialMovementList, materialMovementQuery } from '@platlab/contracts';
import type { z } from 'zod';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import type { WorkspaceAccess } from '../../core/index.js';
import { listMaterialMovements, type IListMaterialMovementsResult } from '../infrastructure/movements.queries.js';
import { runQuery, type QueryRequest } from './command.js';

/** El libro de Materiales (MA-01d): un renglón de la base como lo da la API. */
export const toMovement = (row: IListMaterialMovementsResult): MaterialMovement => ({
  id: row.id,
  kind: row.kind as MaterialMovement['kind'],
  at: row.at.toISOString(),
  product: { id: row.product_id, code: row.product_code, name: row.product_name, class: row.product_class as MaterialMovement['product']['class'] },
  place: row.place,
  lot: row.lot,
  quantity: row.quantity,
  unit: row.unit,
  reference: row.reference,
  person: row.person ?? null,
  actor: row.actor ?? null,
  purpose: row.purpose as MaterialMovement['purpose'],
  outcome: row.outcome as MaterialMovement['outcome'],
  detail: row.detail,
});

/** Una página del libro con los filtros, después de `after` ([at, id] del último renglón). La usan la lista y el Excel. */
export const movementRows = (access: WorkspaceAccess, filters: MaterialMovementFilters, after: string[] | null, limit: number) =>
  listMaterialMovements.run(
    {
      workspaceId: access.workspace.id,
      timeZone: access.workspace.timeZone,
      productId: filters.productId ?? null,
      kind: filters.kind ?? null,
      purpose: filters.purpose ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null,
      q: filters.q ?? null,
      beforeAt: after?.[0] ?? null,
      beforeId: after?.[1] ?? null,
      limit,
    },
    access.client,
  );

/** El libro de Materiales (MA-01d), del más nuevo al más viejo, con sus filtros. */
export function listMovementPage(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof materialMovementQuery>): Promise<MaterialMovementList> {
  return runQuery(pool, request, async (access) => {
    const { cursor, limit, ...filters } = query;
    const found = await movementRows(access, filters, decodeCursor(cursor, 2), limit + 1);
    const visible = found.slice(0, limit);
    const last = visible.at(-1);
    return {
      items: visible.map(toMovement),
      nextCursor: found.length > limit && last ? encodeCursor([last.cursor_at, last.id]) : null,
    };
  });
}
