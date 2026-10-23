/** Types generated for queries found in "src/modules/reagents/infrastructure/requestables.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

/** 'RequestableReagents' parameters type */
export interface IRequestableReagentsParams {
  itemIds?: stringArray | null | void;
  q?: string | null | void;
  timeZone: string;
  workspaceId: string;
}

/** 'RequestableReagents' return type */
export interface IRequestableReagentsResult {
  available: string;
  code: string;
  id: string;
  name: string;
  unit: string;
}

/** 'RequestableReagents' query type */
export interface IRequestableReagentsQuery {
  params: IRequestableReagentsParams;
  result: IRequestableReagentsResult;
}

const requestableReagentsIR: any = {"usedParamSet":{"timeZone":true,"workspaceId":true,"itemIds":true,"q":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":625,"b":634}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":808,"b":820}]},{"name":"itemIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":864,"b":871},{"a":910,"b":917}]},{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":1046,"b":1047},{"a":1117,"b":1118}]}],"statement":"-- Reactivos activos con lo usable hoy: posiciones «usable» de lotes sin vencer en el día civil del espacio. Con\n-- :itemIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los que contienen :q.\nSELECT\n  i.id,\n  i.code,\n  i.name,\n  i.base_unit AS unit,\n  trim_scale(coalesce((\n    SELECT sum(p.balance)\n    FROM inventory.positions AS p\n    JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.disposition = 'usable'\n      AND (l.expires_on IS NULL OR l.expires_on >= (now() AT TIME ZONE :timeZone!)::date)\n  ), 0))::text AS \"available!\"\nFROM inventory.items AS i\nJOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'reagent'\n  AND (CASE WHEN :itemIds::uuid[] IS NOT NULL THEN i.id = ANY (:itemIds::uuid[])\n            ELSE i.archived_at IS NULL\n              AND (inventory.fold_text(i.name) LIKE '%' || inventory.fold_text(:q::text) || '%'\n                   OR lower(i.code) LIKE '%' || lower(:q::text) || '%') END)\nORDER BY inventory.fold_text(i.name), i.id\nLIMIT 200"};

/**
 * Query generated from SQL:
 * ```
 * -- Reactivos activos con lo usable hoy: posiciones «usable» de lotes sin vencer en el día civil del espacio. Con
 * -- :itemIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los que contienen :q.
 * SELECT
 *   i.id,
 *   i.code,
 *   i.name,
 *   i.base_unit AS unit,
 *   trim_scale(coalesce((
 *     SELECT sum(p.balance)
 *     FROM inventory.positions AS p
 *     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 *     WHERE p.workspace_id = i.workspace_id
 *       AND p.item_id = i.id
 *       AND p.disposition = 'usable'
 *       AND (l.expires_on IS NULL OR l.expires_on >= (now() AT TIME ZONE :timeZone!)::date)
 *   ), 0))::text AS "available!"
 * FROM inventory.items AS i
 * JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
 * WHERE i.workspace_id = :workspaceId!
 *   AND i.kind = 'reagent'
 *   AND (CASE WHEN :itemIds::uuid[] IS NOT NULL THEN i.id = ANY (:itemIds::uuid[])
 *             ELSE i.archived_at IS NULL
 *               AND (inventory.fold_text(i.name) LIKE '%' || inventory.fold_text(:q::text) || '%'
 *                    OR lower(i.code) LIKE '%' || lower(:q::text) || '%') END)
 * ORDER BY inventory.fold_text(i.name), i.id
 * LIMIT 200
 * ```
 */
export const requestableReagents = new PreparedQuery<IRequestableReagentsParams,IRequestableReagentsResult>(requestableReagentsIR);


