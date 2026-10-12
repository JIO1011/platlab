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
  expiringDays: number;
  limit: NumberOrString;
  locationIds: stringArray;
  productId?: string | null | void;
  timeZone: string;
  workspaceId: string;
}

/** 'ListProducts' return type */
export interface IListProductsResult {
  balance: string;
  base_unit: string;
  below_minimum: boolean;
  cas_number: string | null;
  code: string;
  containers_with_stock: number;
  expired_containers: number;
  expiring_containers: number;
  id: string;
  minimum: string | null;
  name: string;
  physical_state: string | null;
  sort_code: string;
}

/** 'ListProducts' query type */
export interface IListProductsQuery {
  params: IListProductsParams;
  result: IListProductsResult;
}

const listProductsIR: any = {"usedParamSet":{"locationIds":true,"timeZone":true,"expiringDays":true,"workspaceId":true,"productId":true,"afterId":true,"afterCode":true,"limit":true},"params":[{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":630,"b":642},{"a":1056,"b":1068},{"a":1437,"b":1449},{"a":2002,"b":2014}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":1124,"b":1133},{"a":1511,"b":1520},{"a":1580,"b":1589}]},{"name":"expiringDays","required":true,"transform":{"type":"scalar"},"locs":[{"a":1600,"b":1613}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":2059,"b":2071}]},{"name":"productId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2133,"b":2142},{"a":2168,"b":2177}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2193,"b":2200},{"a":2262,"b":2269}]},{"name":"afterCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":2244,"b":2253}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2314,"b":2320}]}],"statement":"-- Con el total que el miembro puede consultar: suma exacta en numeric de sus ubicaciones autorizadas.\nSELECT\n  i.id,\n  i.code,\n  i.name,\n  i.base_unit,\n  r.cas_number,\n  r.physical_state,\n  trim_scale(i.minimum_quantity) AS minimum,\n  stock.balance AS \"balance!\",\n  -- Bajo mínimo (ADR 0012, 05-10-2026): existencia física, con los vencidos y lo apartado.\n  (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS \"below_minimum!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[]))::int AS \"containers_with_stock!\",\n  -- Avisos de caducidad (ADR 0012, 05-10-2026): frascos con saldo; «hoy» es la fecha civil del espacio.\n  (SELECT count(*)\n     FROM inventory.positions AS p\n     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[])\n      AND l.expires_on < (now() AT TIME ZONE :timeZone!)::date)::int AS \"expired_containers!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[])\n      AND l.expires_on BETWEEN (now() AT TIME ZONE :timeZone!)::date\n                           AND (now() AT TIME ZONE :timeZone!)::date + :expiringDays!::int)::int AS \"expiring_containers!\",\n  lower(i.code) AS \"sort_code!\"\nFROM inventory.items AS i\nJOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id\nCROSS JOIN LATERAL (\n  SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = i.workspace_id\n    AND p.item_id = i.id\n    AND p.location_id = ANY (:locationIds!::uuid[])\n) AS stock\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'reagent'\n  AND i.archived_at IS NULL\n  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)\n  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))\nORDER BY lower(i.code), i.id\nLIMIT :limit!"};

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
 *   trim_scale(i.minimum_quantity) AS minimum,
 *   stock.balance AS "balance!",
 *   -- Bajo mínimo (ADR 0012, 05-10-2026): existencia física, con los vencidos y lo apartado.
 *   (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS "below_minimum!",
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *     WHERE p.workspace_id = i.workspace_id
 *       AND p.item_id = i.id
 *       AND p.balance > 0
 *       AND p.location_id = ANY (:locationIds!::uuid[]))::int AS "containers_with_stock!",
 *   -- Avisos de caducidad (ADR 0012, 05-10-2026): frascos con saldo; «hoy» es la fecha civil del espacio.
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *      JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 *     WHERE p.workspace_id = i.workspace_id
 *       AND p.item_id = i.id
 *       AND p.balance > 0
 *       AND p.location_id = ANY (:locationIds!::uuid[])
 *       AND l.expires_on < (now() AT TIME ZONE :timeZone!)::date)::int AS "expired_containers!",
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *      JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 *     WHERE p.workspace_id = i.workspace_id
 *       AND p.item_id = i.id
 *       AND p.balance > 0
 *       AND p.location_id = ANY (:locationIds!::uuid[])
 *       AND l.expires_on BETWEEN (now() AT TIME ZONE :timeZone!)::date
 *                            AND (now() AT TIME ZONE :timeZone!)::date + :expiringDays!::int)::int AS "expiring_containers!",
 *   lower(i.code) AS "sort_code!"
 * FROM inventory.items AS i
 * JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
 * CROSS JOIN LATERAL (
 *   SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance
 *   FROM inventory.positions AS p
 *   WHERE p.workspace_id = i.workspace_id
 *     AND p.item_id = i.id
 *     AND p.location_id = ANY (:locationIds!::uuid[])
 * ) AS stock
 * WHERE i.workspace_id = :workspaceId!
 *   AND i.kind = 'reagent'
 *   AND i.archived_at IS NULL
 *   AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
 *   AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
 * ORDER BY lower(i.code), i.id
 * LIMIT :limit!
 * ```
 */
export const listProducts = new PreparedQuery<IListProductsParams,IListProductsResult>(listProductsIR);


/** 'HomeSummary' parameters type */
export interface IHomeSummaryParams {
  expiringDays: number;
  locationIds: stringArray;
  timeZone: string;
  workspaceId: string;
}

/** 'HomeSummary' return type */
export interface IHomeSummaryResult {
  below_minimum: string;
  containers_with_stock: string;
  expired_containers: string;
  expiring_containers: string;
  products_with_minimum: string;
  products_with_stock: string;
}

/** 'HomeSummary' query type */
export interface IHomeSummaryQuery {
  params: IHomeSummaryParams;
  result: IHomeSummaryResult;
}

const homeSummaryIR: any = {"usedParamSet":{"workspaceId":true,"locationIds":true,"timeZone":true,"expiringDays":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":672,"b":684},{"a":1195,"b":1207}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":764,"b":776},{"a":1107,"b":1119}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":830,"b":839}]},{"name":"expiringDays","required":true,"transform":{"type":"scalar"},"locs":[{"a":1650,"b":1663}]}],"statement":"-- Contadores del Resumen y de la tarjeta de Inicio: inventario que el miembro puede consultar, no\n-- filas del catálogo. Vencido y por vencer (ADR 0012, 05-10-2026): frascos con saldo, con «hoy» en\n-- la fecha civil del espacio; por vencer incluye hoy y los próximos :expiringDays días (02 §12).\n-- Bajo mínimo: reactivos activos con mínimo cuya existencia física es menor (ADR 0012, 05-10-2026).\nWITH stocked AS (\n  SELECT p.item_id, l.expires_on\n  FROM inventory.positions AS p\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n  JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n  WHERE p.workspace_id = :workspaceId!\n    AND i.kind = 'reagent'\n    AND p.balance > 0\n    AND p.location_id = ANY (:locationIds!::uuid[])\n), today AS (\n  SELECT (now() AT TIME ZONE :timeZone!)::date AS d\n), minimums AS (\n  SELECT i.minimum_quantity,\n         (SELECT coalesce(sum(p.balance), 0)\n            FROM inventory.positions AS p\n           WHERE p.workspace_id = i.workspace_id\n             AND p.item_id = i.id\n             AND p.location_id = ANY (:locationIds!::uuid[])) AS balance\n  FROM inventory.items AS i\n  WHERE i.workspace_id = :workspaceId!\n    AND i.kind = 'reagent'\n    AND i.archived_at IS NULL\n    AND i.minimum_quantity IS NOT NULL\n)\nSELECT\n  (SELECT count(DISTINCT item_id) FROM stocked) AS \"products_with_stock!\",\n  (SELECT count(*) FROM stocked) AS \"containers_with_stock!\",\n  (SELECT count(*) FROM stocked, today WHERE stocked.expires_on < today.d) AS \"expired_containers!\",\n  (SELECT count(*) FROM stocked, today\n    WHERE stocked.expires_on BETWEEN today.d AND today.d + :expiringDays!::int) AS \"expiring_containers!\",\n  (SELECT count(*) FROM minimums WHERE balance < minimum_quantity) AS \"below_minimum!\",\n  (SELECT count(*) FROM minimums) AS \"products_with_minimum!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Contadores del Resumen y de la tarjeta de Inicio: inventario que el miembro puede consultar, no
 * -- filas del catálogo. Vencido y por vencer (ADR 0012, 05-10-2026): frascos con saldo, con «hoy» en
 * -- la fecha civil del espacio; por vencer incluye hoy y los próximos :expiringDays días (02 §12).
 * -- Bajo mínimo: reactivos activos con mínimo cuya existencia física es menor (ADR 0012, 05-10-2026).
 * WITH stocked AS (
 *   SELECT p.item_id, l.expires_on
 *   FROM inventory.positions AS p
 *   JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 *   JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 *   WHERE p.workspace_id = :workspaceId!
 *     AND i.kind = 'reagent'
 *     AND p.balance > 0
 *     AND p.location_id = ANY (:locationIds!::uuid[])
 * ), today AS (
 *   SELECT (now() AT TIME ZONE :timeZone!)::date AS d
 * ), minimums AS (
 *   SELECT i.minimum_quantity,
 *          (SELECT coalesce(sum(p.balance), 0)
 *             FROM inventory.positions AS p
 *            WHERE p.workspace_id = i.workspace_id
 *              AND p.item_id = i.id
 *              AND p.location_id = ANY (:locationIds!::uuid[])) AS balance
 *   FROM inventory.items AS i
 *   WHERE i.workspace_id = :workspaceId!
 *     AND i.kind = 'reagent'
 *     AND i.archived_at IS NULL
 *     AND i.minimum_quantity IS NOT NULL
 * )
 * SELECT
 *   (SELECT count(DISTINCT item_id) FROM stocked) AS "products_with_stock!",
 *   (SELECT count(*) FROM stocked) AS "containers_with_stock!",
 *   (SELECT count(*) FROM stocked, today WHERE stocked.expires_on < today.d) AS "expired_containers!",
 *   (SELECT count(*) FROM stocked, today
 *     WHERE stocked.expires_on BETWEEN today.d AND today.d + :expiringDays!::int) AS "expiring_containers!",
 *   (SELECT count(*) FROM minimums WHERE balance < minimum_quantity) AS "below_minimum!",
 *   (SELECT count(*) FROM minimums) AS "products_with_minimum!"
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

const listProductLotsIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":285,"b":297}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":317,"b":324}]}],"statement":"-- Lotes de un reactivo del espacio, para elegirlos al registrar un ingreso.\nSELECT l.id, l.item_id, l.code, l.supplier_name, l.supplier_lot, l.expires_on\nFROM inventory.lots AS l\nJOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id\nWHERE l.workspace_id = :workspaceId!\n  AND l.item_id = :itemId!\n  AND i.kind = 'reagent'\n  AND i.archived_at IS NULL\nORDER BY l.expires_on NULLS LAST, lower(l.code), l.id\nLIMIT 200"};

/**
 * Query generated from SQL:
 * ```
 * -- Lotes de un reactivo del espacio, para elegirlos al registrar un ingreso.
 * SELECT l.id, l.item_id, l.code, l.supplier_name, l.supplier_lot, l.expires_on
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


