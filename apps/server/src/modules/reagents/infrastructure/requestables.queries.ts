/** Types generated for queries found in "src/modules/reagents/infrastructure/requestables.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

/** 'RequestableReagents' parameters type */
export interface IRequestableReagentsParams {
  itemIds?: stringArray | null | void;
  q?: string | null | void;
  workspaceId: string;
}

/** 'RequestableReagents' return type */
export interface IRequestableReagentsResult {
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

const requestableReagentsIR: any = {"usedParamSet":{"workspaceId":true,"itemIds":true,"q":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":319,"b":331}]},{"name":"itemIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":375,"b":382},{"a":421,"b":428}]},{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":557,"b":558},{"a":628,"b":629}]}],"statement":"-- Reactivos activos. Con :itemIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los que\n-- contienen :q.\nSELECT i.id, i.code, i.name, i.base_unit AS unit\nFROM inventory.items AS i\nJOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'reagent'\n  AND (CASE WHEN :itemIds::uuid[] IS NOT NULL THEN i.id = ANY (:itemIds::uuid[])\n            ELSE i.archived_at IS NULL\n              AND (inventory.fold_text(i.name) LIKE '%' || inventory.fold_text(:q::text) || '%'\n                   OR lower(i.code) LIKE '%' || lower(:q::text) || '%') END)\nORDER BY inventory.fold_text(i.name), i.id\nLIMIT 200"};

/**
 * Query generated from SQL:
 * ```
 * -- Reactivos activos. Con :itemIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los que
 * -- contienen :q.
 * SELECT i.id, i.code, i.name, i.base_unit AS unit
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


