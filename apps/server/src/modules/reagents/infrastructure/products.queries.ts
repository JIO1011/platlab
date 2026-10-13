/** Types generated for queries found in "src/modules/reagents/infrastructure/products.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'InsertProductDetail' parameters type */
export interface IInsertProductDetailParams {
  casNumber?: string | null | void;
  controlled: boolean;
  density?: string | null | void;
  hazards: stringArray;
  itemId: string;
  physicalState: string;
  sdsKind?: string | null | void;
  sdsUrl?: string | null | void;
  workspaceId: string;
}

/** 'InsertProductDetail' return type */
export interface IInsertProductDetailResult {
  cas_number: string | null;
  controlled: boolean;
  density: string | null;
  hazards: stringArray;
  physical_state: string | null;
  sds_kind: string | null;
  sds_url: string | null;
}

/** 'InsertProductDetail' query type */
export interface IInsertProductDetailQuery {
  params: IInsertProductDetailParams;
  result: IInsertProductDetailResult;
}

const insertProductDetailIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"casNumber":true,"physicalState":true,"hazards":true,"controlled":true,"sdsKind":true,"sdsUrl":true,"density":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":155}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":165}]},{"name":"casNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":177}]},{"name":"physicalState","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":194}]},{"name":"hazards","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":205}]},{"name":"controlled","required":true,"transform":{"type":"scalar"},"locs":[{"a":216,"b":227}]},{"name":"sdsKind","required":false,"transform":{"type":"scalar"},"locs":[{"a":230,"b":237}]},{"name":"sdsUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":240,"b":246}]},{"name":"density","required":false,"transform":{"type":"scalar"},"locs":[{"a":249,"b":256}]}],"statement":"INSERT INTO reagents.products\n  (workspace_id, item_id, cas_number, physical_state, hazards, controlled, sds_kind, sds_url, density)\nVALUES\n  (:workspaceId!, :itemId!, :casNumber, :physicalState!, :hazards!::text[], :controlled!, :sdsKind, :sdsUrl, :density::numeric)\nRETURNING cas_number, physical_state, hazards, controlled, sds_kind, sds_url, trim_scale(density) AS density"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO reagents.products
 *   (workspace_id, item_id, cas_number, physical_state, hazards, controlled, sds_kind, sds_url, density)
 * VALUES
 *   (:workspaceId!, :itemId!, :casNumber, :physicalState!, :hazards!::text[], :controlled!, :sdsKind, :sdsUrl, :density::numeric)
 * RETURNING cas_number, physical_state, hazards, controlled, sds_kind, sds_url, trim_scale(density) AS density
 * ```
 */
export const insertProductDetail = new PreparedQuery<IInsertProductDetailParams,IInsertProductDetailResult>(insertProductDetailIR);


/** 'FindProductDetail' parameters type */
export interface IFindProductDetailParams {
  itemId: string;
  workspaceId: string;
}

/** 'FindProductDetail' return type */
export interface IFindProductDetailResult {
  cas_number: string | null;
  controlled: boolean;
  density: string | null;
  hazards: stringArray;
  physical_state: string | null;
  sds_kind: string | null;
  sds_url: string | null;
}

/** 'FindProductDetail' query type */
export interface IFindProductDetailQuery {
  params: IFindProductDetailParams;
  result: IFindProductDetailResult;
}

const findProductDetailIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":209,"b":221}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":237,"b":244}]}],"statement":"-- La ficha química de un reactivo del espacio (ADR 0015).\nSELECT cas_number, physical_state, hazards, controlled, sds_kind, sds_url, trim_scale(density) AS density\nFROM reagents.products\nWHERE workspace_id = :workspaceId! AND item_id = :itemId!"};

/**
 * Query generated from SQL:
 * ```
 * -- La ficha química de un reactivo del espacio (ADR 0015).
 * SELECT cas_number, physical_state, hazards, controlled, sds_kind, sds_url, trim_scale(density) AS density
 * FROM reagents.products
 * WHERE workspace_id = :workspaceId! AND item_id = :itemId!
 * ```
 */
export const findProductDetail = new PreparedQuery<IFindProductDetailParams,IFindProductDetailResult>(findProductDetailIR);


/** 'UpdateProductDetail' parameters type */
export interface IUpdateProductDetailParams {
  casNumber?: string | null | void;
  controlled: boolean;
  density?: string | null | void;
  hazards: stringArray;
  itemId: string;
  physicalState?: string | null | void;
  sdsKind?: string | null | void;
  sdsUrl?: string | null | void;
  workspaceId: string;
}

/** 'UpdateProductDetail' return type */
export interface IUpdateProductDetailResult {
  item_id: string;
}

/** 'UpdateProductDetail' query type */
export interface IUpdateProductDetailQuery {
  params: IUpdateProductDetailParams;
  result: IUpdateProductDetailResult;
}

const updateProductDetailIR: any = {"usedParamSet":{"casNumber":true,"physicalState":true,"hazards":true,"controlled":true,"sdsKind":true,"sdsUrl":true,"density":true,"workspaceId":true,"itemId":true},"params":[{"name":"casNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":119,"b":128}]},{"name":"physicalState","required":false,"transform":{"type":"scalar"},"locs":[{"a":148,"b":161}]},{"name":"hazards","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":182}]},{"name":"controlled","required":true,"transform":{"type":"scalar"},"locs":[{"a":206,"b":217}]},{"name":"sdsKind","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":242}]},{"name":"sdsUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":255,"b":261}]},{"name":"density","required":false,"transform":{"type":"scalar"},"locs":[{"a":274,"b":281}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":313,"b":325}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":341,"b":348}]}],"statement":"-- Escribe la ficha ya combinada; el comando la edita con el ítem bloqueado.\nUPDATE reagents.products\nSET cas_number = :casNumber, physical_state = :physicalState, hazards = :hazards!::text[], controlled = :controlled!,\n    sds_kind = :sdsKind, sds_url = :sdsUrl, density = :density::numeric\nWHERE workspace_id = :workspaceId! AND item_id = :itemId!\nRETURNING item_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Escribe la ficha ya combinada; el comando la edita con el ítem bloqueado.
 * UPDATE reagents.products
 * SET cas_number = :casNumber, physical_state = :physicalState, hazards = :hazards!::text[], controlled = :controlled!,
 *     sds_kind = :sdsKind, sds_url = :sdsUrl, density = :density::numeric
 * WHERE workspace_id = :workspaceId! AND item_id = :itemId!
 * RETURNING item_id
 * ```
 */
export const updateProductDetail = new PreparedQuery<IUpdateProductDetailParams,IUpdateProductDetailResult>(updateProductDetailIR);


/** 'ListControlled' parameters type */
export interface IListControlledParams {
  itemIds: stringArray;
  workspaceId: string;
}

/** 'ListControlled' return type */
export interface IListControlledResult {
  item_id: string;
}

/** 'ListControlled' query type */
export interface IListControlledQuery {
  params: IListControlledParams;
  result: IListControlledResult;
}

const listControlledIR: any = {"usedParamSet":{"workspaceId":true,"itemIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":129,"b":141}]},{"name":"itemIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":162,"b":170}]}],"statement":"-- Qué reactivos son controlados (ADR 0015), para marcar sus frascos.\nSELECT item_id\nFROM reagents.products\nWHERE workspace_id = :workspaceId! AND item_id = ANY (:itemIds!::uuid[]) AND controlled"};

/**
 * Query generated from SQL:
 * ```
 * -- Qué reactivos son controlados (ADR 0015), para marcar sus frascos.
 * SELECT item_id
 * FROM reagents.products
 * WHERE workspace_id = :workspaceId! AND item_id = ANY (:itemIds!::uuid[]) AND controlled
 * ```
 */
export const listControlled = new PreparedQuery<IListControlledParams,IListControlledResult>(listControlledIR);


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
  controlled: boolean;
  density: string | null;
  expired_containers: number;
  expiring_containers: number;
  hazards: stringArray;
  id: string;
  minimum: string | null;
  name: string;
  physical_state: string | null;
  sds_kind: string | null;
  sds_url: string | null;
  sort_code: string;
}

/** 'ListProducts' query type */
export interface IListProductsQuery {
  params: IListProductsParams;
  result: IListProductsResult;
}

const listProductsIR: any = {"usedParamSet":{"locationIds":true,"timeZone":true,"expiringDays":true,"workspaceId":true,"productId":true,"afterId":true,"afterCode":true,"limit":true},"params":[{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":722,"b":734},{"a":1148,"b":1160},{"a":1529,"b":1541},{"a":2094,"b":2106}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":1216,"b":1225},{"a":1603,"b":1612},{"a":1672,"b":1681}]},{"name":"expiringDays","required":true,"transform":{"type":"scalar"},"locs":[{"a":1692,"b":1705}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":2151,"b":2163}]},{"name":"productId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2225,"b":2234},{"a":2260,"b":2269}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2285,"b":2292},{"a":2354,"b":2361}]},{"name":"afterCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":2336,"b":2345}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2406,"b":2412}]}],"statement":"-- Con el total que el miembro puede consultar: suma exacta en numeric de sus ubicaciones autorizadas.\nSELECT\n  i.id,\n  i.code,\n  i.name,\n  i.base_unit,\n  r.cas_number,\n  r.physical_state,\n  r.hazards,\n  r.controlled,\n  r.sds_kind,\n  r.sds_url,\n  trim_scale(r.density) AS density,\n  trim_scale(i.minimum_quantity) AS minimum,\n  stock.balance AS \"balance!\",\n  -- Bajo mínimo (ADR 0012, 05-10-2026): existencia física, con los vencidos y lo apartado.\n  (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS \"below_minimum!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[]))::int AS \"containers_with_stock!\",\n  -- Avisos de caducidad (ADR 0012, 05-10-2026): frascos con saldo; «hoy» es la fecha civil del espacio.\n  (SELECT count(*)\n     FROM inventory.positions AS p\n     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[])\n      AND l.expires_on < (now() AT TIME ZONE :timeZone!)::date)::int AS \"expired_containers!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0\n      AND p.location_id = ANY (:locationIds!::uuid[])\n      AND l.expires_on BETWEEN (now() AT TIME ZONE :timeZone!)::date\n                           AND (now() AT TIME ZONE :timeZone!)::date + :expiringDays!::int)::int AS \"expiring_containers!\",\n  lower(i.code) AS \"sort_code!\"\nFROM inventory.items AS i\nJOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id\nCROSS JOIN LATERAL (\n  SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = i.workspace_id\n    AND p.item_id = i.id\n    AND p.location_id = ANY (:locationIds!::uuid[])\n) AS stock\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'reagent'\n  AND i.archived_at IS NULL\n  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)\n  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))\nORDER BY lower(i.code), i.id\nLIMIT :limit!"};

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
 *   r.hazards,
 *   r.controlled,
 *   r.sds_kind,
 *   r.sds_url,
 *   trim_scale(r.density) AS density,
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
  parent_id: string | null;
}

/** 'ListLocationsIn' query type */
export interface IListLocationsInQuery {
  params: IListLocationsInParams;
  result: IListLocationsInResult;
}

const listLocationsInIR: any = {"usedParamSet":{"workspaceId":true,"locationIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":92}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":122}]}],"statement":"SELECT id, code, name, kind, parent_id\nFROM core.locations\nWHERE workspace_id = :workspaceId!\n  AND id = ANY (:locationIds!::uuid[])\n  AND archived_at IS NULL\nORDER BY lower(code), id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, code, name, kind, parent_id
 * FROM core.locations
 * WHERE workspace_id = :workspaceId!
 *   AND id = ANY (:locationIds!::uuid[])
 *   AND archived_at IS NULL
 * ORDER BY lower(code), id
 * ```
 */
export const listLocationsIn = new PreparedQuery<IListLocationsInParams,IListLocationsInResult>(listLocationsInIR);


