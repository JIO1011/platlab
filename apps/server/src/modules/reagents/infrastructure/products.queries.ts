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
  locationIds: stringArray;
  workspaceId: string;
}

/** 'ListProducts' return type */
export interface IListProductsResult {
  balance: string;
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

const listProductsIR: any = {"usedParamSet":{"locationIds":true,"workspaceId":true,"afterId":true,"afterCode":true,"limit":true},"params":[{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":374,"b":386}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":578,"b":590}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":652,"b":659},{"a":721,"b":728}]},{"name":"afterCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":703,"b":712}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":773,"b":779}]}],"statement":"-- Con el total que el miembro puede consultar: suma exacta en numeric de sus ubicaciones autorizadas.\nSELECT\n  i.id,\n  i.code,\n  i.name,\n  i.base_unit,\n  r.cas_number,\n  r.physical_state,\n  (SELECT trim_scale(coalesce(sum(p.balance), 0))\n     FROM inventory.positions AS p\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.location_id = ANY (:locationIds!::uuid[])) AS \"balance!\",\n  lower(i.code) AS \"sort_code!\"\nFROM inventory.items AS i\nJOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'reagent'\n  AND i.archived_at IS NULL\n  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))\nORDER BY lower(i.code), i.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Con el total que el miembro puede consultar: suma exacta en numeric de sus ubicaciones autorizadas.
 * SELECT
 *   i.id,
 *   i.code,
 *   i.name,
 *   i.base_unit,
 *   r.cas_number,
 *   r.physical_state,
 *   (SELECT trim_scale(coalesce(sum(p.balance), 0))
 *      FROM inventory.positions AS p
 *     WHERE p.workspace_id = i.workspace_id
 *       AND p.item_id = i.id
 *       AND p.location_id = ANY (:locationIds!::uuid[])) AS "balance!",
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
  products_with_stock: string;
}

/** 'HomeSummary' query type */
export interface IHomeSummaryQuery {
  params: IHomeSummaryParams;
  result: IHomeSummaryResult;
}

const homeSummaryIR: any = {"usedParamSet":{"workspaceId":true,"locationIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":297,"b":309},{"a":614,"b":626}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":395,"b":407},{"a":712,"b":724}]}],"statement":"-- Contadores de la tarjeta de Inicio: inventario que el miembro puede consultar, no filas del catálogo.\nSELECT\n  (SELECT count(DISTINCT p.item_id)\n     FROM inventory.positions AS p\n     JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n    WHERE p.workspace_id = :workspaceId!\n      AND i.kind = 'reagent'\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[])) AS \"products_with_stock!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n     JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n    WHERE p.workspace_id = :workspaceId!\n      AND i.kind = 'reagent'\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[])) AS \"positions_with_stock!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Contadores de la tarjeta de Inicio: inventario que el miembro puede consultar, no filas del catálogo.
 * SELECT
 *   (SELECT count(DISTINCT p.item_id)
 *      FROM inventory.positions AS p
 *      JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *     WHERE p.workspace_id = :workspaceId!
 *       AND i.kind = 'reagent'
 *       AND p.balance > 0
 *       AND p.location_id = ANY (:locationIds!::uuid[])) AS "products_with_stock!",
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


/** 'ListProductLots' parameters type */
export interface IListProductLotsParams {
  itemId: string;
  workspaceId: string;
}

/** 'ListProductLots' return type */
export interface IListProductLotsResult {
  code: string;
  condition: string;
  expires_on: string | null;
  id: string;
  item_id: string;
  supplier_lot: string | null;
  supplier_name: string | null;
}

/** 'ListProductLots' query type */
export interface IListProductLotsQuery {
  params: IListProductLotsParams;
  result: IListProductLotsResult;
}

const listProductLotsIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":298,"b":310}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":330,"b":337}]}],"statement":"-- Lotes de un reactivo del espacio, para elegirlos al registrar un ingreso.\nSELECT l.id, l.item_id, l.code, l.supplier_name, l.supplier_lot, l.expires_on, l.condition\nFROM inventory.lots AS l\nJOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id\nWHERE l.workspace_id = :workspaceId!\n  AND l.item_id = :itemId!\n  AND i.kind = 'reagent'\n  AND i.archived_at IS NULL\nORDER BY l.expires_on NULLS LAST, lower(l.code), l.id\nLIMIT 200"};

/**
 * Query generated from SQL:
 * ```
 * -- Lotes de un reactivo del espacio, para elegirlos al registrar un ingreso.
 * SELECT l.id, l.item_id, l.code, l.supplier_name, l.supplier_lot, l.expires_on, l.condition
 * FROM inventory.lots AS l
 * JOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id
 * WHERE l.workspace_id = :workspaceId!
 *   AND l.item_id = :itemId!
 *   AND i.kind = 'reagent'
 *   AND i.archived_at IS NULL
 * ORDER BY l.expires_on NULLS LAST, lower(l.code), l.id
 * LIMIT 200
 * ```
 */
export const listProductLots = new PreparedQuery<IListProductLotsParams,IListProductLotsResult>(listProductLotsIR);


/** 'ListLocationsIn' parameters type */
export interface IListLocationsInParams {
  locationIds: stringArray;
  workspaceId: string;
}

/** 'ListLocationsIn' return type */
export interface IListLocationsInResult {
  code: string;
  id: string;
  kind: string;
  name: string;
}

/** 'ListLocationsIn' query type */
export interface IListLocationsInQuery {
  params: IListLocationsInParams;
  result: IListLocationsInResult;
}

const listLocationsInIR: any = {"usedParamSet":{"workspaceId":true,"locationIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":69,"b":81}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":99,"b":111}]}],"statement":"SELECT id, code, name, kind\nFROM core.locations\nWHERE workspace_id = :workspaceId!\n  AND id = ANY (:locationIds!::uuid[])\n  AND archived_at IS NULL\nORDER BY lower(code), id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, code, name, kind
 * FROM core.locations
 * WHERE workspace_id = :workspaceId!
 *   AND id = ANY (:locationIds!::uuid[])
 *   AND archived_at IS NULL
 * ORDER BY lower(code), id
 * ```
 */
export const listLocationsIn = new PreparedQuery<IListLocationsInParams,IListLocationsInResult>(listLocationsInIR);


