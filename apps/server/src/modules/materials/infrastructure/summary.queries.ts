/** Types generated for queries found in "src/modules/materials/infrastructure/summary.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'MaterialsSummary' parameters type */
export interface IMaterialsSummaryParams {
  timeZone: string;
  workspaceId: string;
}

/** 'MaterialsSummary' return type */
export interface IMaterialsSummaryResult {
  below_minimum: number;
  materials: number;
  open_loans: number;
  overdue_loans: number;
}

/** 'MaterialsSummary' query type */
export interface IMaterialsSummaryQuery {
  params: IMaterialsSummaryParams;
  result: IMaterialsSummaryResult;
}

const materialsSummaryIR: any = {"usedParamSet":{"workspaceId":true,"timeZone":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":389,"b":401},{"a":553,"b":565},{"a":939,"b":951},{"a":1071,"b":1083}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":1142,"b":1151}]}],"statement":"-- Las cifras del Resumen y de la tarjeta de Inicio: materiales activos, los que están bajo su mínimo, y los\n-- préstamos abiertos y atrasados (abiertos con la fecha prevista vencida en la fecha civil del espacio).\nSELECT\n  (SELECT count(*)\n     FROM inventory.items AS i\n     JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id\n    WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL)::int AS \"materials!\",\n  (SELECT count(*)\n     FROM inventory.items AS i\n    WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL\n      AND i.minimum_quantity IS NOT NULL\n      AND (SELECT coalesce(sum(p.balance), 0)\n             FROM inventory.positions AS p\n            WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id) < i.minimum_quantity)::int AS \"below_minimum!\",\n  (SELECT count(*) FROM materials.loans AS l\n    WHERE l.workspace_id = :workspaceId! AND l.status = 'open')::int AS \"open_loans!\",\n  (SELECT count(*) FROM materials.loans AS l\n    WHERE l.workspace_id = :workspaceId! AND l.status = 'open' AND l.due_on < (now() AT TIME ZONE :timeZone!)::date)::int AS \"overdue_loans!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Las cifras del Resumen y de la tarjeta de Inicio: materiales activos, los que están bajo su mínimo, y los
 * -- préstamos abiertos y atrasados (abiertos con la fecha prevista vencida en la fecha civil del espacio).
 * SELECT
 *   (SELECT count(*)
 *      FROM inventory.items AS i
 *      JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id
 *     WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL)::int AS "materials!",
 *   (SELECT count(*)
 *      FROM inventory.items AS i
 *     WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL
 *       AND i.minimum_quantity IS NOT NULL
 *       AND (SELECT coalesce(sum(p.balance), 0)
 *              FROM inventory.positions AS p
 *             WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id) < i.minimum_quantity)::int AS "below_minimum!",
 *   (SELECT count(*) FROM materials.loans AS l
 *     WHERE l.workspace_id = :workspaceId! AND l.status = 'open')::int AS "open_loans!",
 *   (SELECT count(*) FROM materials.loans AS l
 *     WHERE l.workspace_id = :workspaceId! AND l.status = 'open' AND l.due_on < (now() AT TIME ZONE :timeZone!)::date)::int AS "overdue_loans!"
 * ```
 */
export const materialsSummary = new PreparedQuery<IMaterialsSummaryParams,IMaterialsSummaryResult>(materialsSummaryIR);


