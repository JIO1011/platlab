/** Types generated for queries found in "src/modules/reagents/infrastructure/products.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'InsertProductDetail' parameters type */
export interface IInsertProductDetailParams {
  casNumber?: string | null | void;
  itemId: string;
  physicalState?: string | null | void;
  workspaceId: string;
}

/** 'InsertProductDetail' return type */
export interface IInsertProductDetailResult {
  cas_number: string | null;
  physical_state: string | null;
}

/** 'InsertProductDetail' query type */
export interface IInsertProductDetailQuery {
  params: IInsertProductDetailParams;
  result: IInsertProductDetailResult;
}

const insertProductDetailIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"casNumber":true,"physicalState":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":102}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":112}]},{"name":"casNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":124}]},{"name":"physicalState","required":false,"transform":{"type":"scalar"},"locs":[{"a":127,"b":140}]}],"statement":"INSERT INTO reagents.products (workspace_id, item_id, cas_number, physical_state)\nVALUES (:workspaceId!, :itemId!, :casNumber, :physicalState)\nRETURNING cas_number, physical_state"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO reagents.products (workspace_id, item_id, cas_number, physical_state)
 * VALUES (:workspaceId!, :itemId!, :casNumber, :physicalState)
 * RETURNING cas_number, physical_state
 * ```
 */
export const insertProductDetail = new PreparedQuery<IInsertProductDetailParams,IInsertProductDetailResult>(insertProductDetailIR);


/** 'ListProducts' parameters type */
export interface IListProductsParams {
  afterCode?: string | null | void;
  afterId?: string | null | void;
  limit: NumberOrString;
  workspaceId: string;
}

/** 'ListProducts' return type */
export interface IListProductsResult {
  base_unit: string;
  cas_number: string | null;
  code: string;
  id: string;
  name: string;
  physical_state: string | null;
  sort_code: string;
}

/** 'ListProducts' query type */
export interface IListProductsQuery {
  params: IListProductsParams;
  result: IListProductsResult;
}

const listProductsIR: any = {"usedParamSet":{"workspaceId":true,"afterId":true,"afterCode":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":251,"b":263}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":325,"b":332},{"a":394,"b":401}]},{"name":"afterCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":376,"b":385}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":446,"b":452}]}],"statement":"SELECT\n  i.id,\n  i.code,\n  i.name,\n  i.base_unit,\n  r.cas_number,\n  r.physical_state,\n  lower(i.code) AS \"sort_code!\"\nFROM inventory.items AS i\nJOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'reagent'\n  AND i.archived_at IS NULL\n  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))\nORDER BY lower(i.code), i.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   i.id,
 *   i.code,
 *   i.name,
 *   i.base_unit,
 *   r.cas_number,
 *   r.physical_state,
 *   lower(i.code) AS "sort_code!"
 * FROM inventory.items AS i
 * JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
 * WHERE i.workspace_id = :workspaceId!
 *   AND i.kind = 'reagent'
 *   AND i.archived_at IS NULL
 *   AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
 * ORDER BY lower(i.code), i.id
 * LIMIT :limit!
 * ```
 */
export const listProducts = new PreparedQuery<IListProductsParams,IListProductsResult>(listProductsIR);


/** 'HomeSummary' parameters type */
export interface IHomeSummaryParams {
  locationIds: stringArray;
  workspaceId: string;
}

/** 'HomeSummary' return type */
export interface IHomeSummaryResult {
  positions_with_stock: string;
  products: string;
}

/** 'HomeSummary' query type */
export interface IHomeSummaryQuery {
  params: IHomeSummaryParams;
  result: IHomeSummaryResult;
}

const homeSummaryIR: any = {"usedParamSet":{"workspaceId":true,"locationIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":268,"b":280},{"a":493,"b":505}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":591,"b":603}]}],"statement":"-- Contadores de la tarjeta de Inicio, solo en las ubicaciones que el miembro puede consultar.\nSELECT\n  (SELECT count(*)\n     FROM inventory.items AS i\n     JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id\n    WHERE i.workspace_id = :workspaceId! AND i.archived_at IS NULL) AS \"products!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n     JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n    WHERE p.workspace_id = :workspaceId!\n      AND i.kind = 'reagent'\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[])) AS \"positions_with_stock!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Contadores de la tarjeta de Inicio, solo en las ubicaciones que el miembro puede consultar.
 * SELECT
 *   (SELECT count(*)
 *      FROM inventory.items AS i
 *      JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
 *     WHERE i.workspace_id = :workspaceId! AND i.archived_at IS NULL) AS "products!",
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *      JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *     WHERE p.workspace_id = :workspaceId!
 *       AND i.kind = 'reagent'
 *       AND p.balance > 0
 *       AND p.location_id = ANY (:locationIds!::uuid[])) AS "positions_with_stock!"
 * ```
 */
export const homeSummary = new PreparedQuery<IHomeSummaryParams,IHomeSummaryResult>(homeSummaryIR);


