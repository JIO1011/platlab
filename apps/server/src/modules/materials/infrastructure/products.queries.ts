/** Types generated for queries found in "src/modules/materials/infrastructure/products.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'InsertProductDetail' parameters type */
export interface IInsertProductDetailParams {
  class: string;
  itemId: string;
  workspaceId: string;
}

/** 'InsertProductDetail' return type */
export interface IInsertProductDetailResult {
  class: string;
}

/** 'InsertProductDetail' query type */
export interface IInsertProductDetailQuery {
  params: IInsertProductDetailParams;
  result: IInsertProductDetailResult;
}

const insertProductDetailIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"class":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":82}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":85,"b":92}]},{"name":"class","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":101}]}],"statement":"INSERT INTO materials.products (workspace_id, item_id, class)\nVALUES (:workspaceId!, :itemId!, :class!)\nRETURNING class"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO materials.products (workspace_id, item_id, class)
 * VALUES (:workspaceId!, :itemId!, :class!)
 * RETURNING class
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
  class: string;
}

/** 'FindProductDetail' query type */
export interface IFindProductDetailQuery {
  params: IFindProductDetailParams;
  result: IFindProductDetailResult;
}

const findProductDetailIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":70}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":93}]}],"statement":"SELECT class\nFROM materials.products\nWHERE workspace_id = :workspaceId! AND item_id = :itemId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT class
 * FROM materials.products
 * WHERE workspace_id = :workspaceId! AND item_id = :itemId!
 * ```
 */
export const findProductDetail = new PreparedQuery<IFindProductDetailParams,IFindProductDetailResult>(findProductDetailIR);


/** 'ListMaterials' parameters type */
export interface IListMaterialsParams {
  afterCode?: string | null | void;
  afterId?: string | null | void;
  areaId?: string | null | void;
  class?: string | null | void;
  limit: NumberOrString;
  productId?: string | null | void;
  q?: string | null | void;
  stock?: string | null | void;
  workspaceId: string;
}

/** 'ListMaterials' return type */
export interface IListMaterialsResult {
  available: string;
  balance: string;
  base_unit: string;
  below_minimum: boolean;
  class: string;
  code: string;
  id: string;
  location_names: stringArray;
  locations_with_stock: number;
  minimum: string | null;
  name: string;
  sort_code: string;
}

/** 'ListMaterials' query type */
export interface IListMaterialsQuery {
  params: IListMaterialsParams;
  result: IListMaterialsResult;
}

const listMaterialsIR: any = {"usedParamSet":{"q":true,"workspaceId":true,"productId":true,"class":true,"stock":true,"areaId":true,"afterId":true,"afterCode":true,"limit":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":369}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1933,"b":1945}]},{"name":"productId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2008,"b":2017},{"a":2043,"b":2052}]},{"name":"class","required":false,"transform":{"type":"scalar"},"locs":[{"a":2068,"b":2073},{"a":2102,"b":2107}]},{"name":"stock","required":false,"transform":{"type":"scalar"},"locs":[{"a":2222,"b":2227},{"a":2247,"b":2252}]},{"name":"areaId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2462,"b":2468},{"a":2772,"b":2778}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2928,"b":2935},{"a":2997,"b":3004}]},{"name":"afterCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":2979,"b":2988}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3049,"b":3055}]}],"statement":"-- Con el total del espacio: suma exacta en numeric de todas sus ubicaciones.\n-- Con :q, solo los materiales cuyo nombre o código lo contienen, plegados con inventory.fold_text. `\\`, `%` y `_`\n-- se escapan con `\\` (chr(92), porque PgTyped no admite `\\` en un literal) y cuentan como texto.\nWITH search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n)\nSELECT\n  i.id,\n  i.code,\n  i.name,\n  i.base_unit,\n  m.class,\n  trim_scale(i.minimum_quantity) AS minimum,\n  stock.balance AS \"balance!\",\n  -- Lo disponible hoy: el saldo menos lo apartado, que incluye lo prestado (ADR 0025).\n  stock.available AS \"available!\",\n  -- Bajo mínimo: la existencia física total es menor que su mínimo (ADR 0012).\n  (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS \"below_minimum!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n    WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0)::int AS \"locations_with_stock!\",\n  -- Dónde está, de más a menos existencia: la tarjeta muestra los primeros nombres (sin ruta).\n  (SELECT coalesce(array_agg(l.name ORDER BY p.balance DESC, l.name), '{}')\n     FROM inventory.positions AS p\n     JOIN core.locations AS l ON l.workspace_id = p.workspace_id AND l.id = p.location_id\n    WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0) AS \"location_names!\",\n  lower(i.code) AS \"sort_code!\"\nFROM inventory.items AS i\nJOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id\nCROSS JOIN LATERAL (\n  SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance,\n         trim_scale(coalesce(sum(p.balance - p.reserved), 0)) AS available\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id\n) AS stock\nCROSS JOIN search\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'material'\n  AND i.archived_at IS NULL\n  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)\n  AND (:class::text IS NULL OR m.class = :class::text)\n  -- Con :stock = 'below-minimum', solo los que tienen mínimo y una existencia total menor que él.\n  AND (:stock::text IS NULL OR (:stock::text = 'below-minimum' AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity))\n  -- Con :areaId, solo los materiales con existencia en esa área (en cualquiera de sus ubicaciones).\n  AND (:areaId::uuid IS NULL OR EXISTS (\n         SELECT 1\n           FROM inventory.positions AS p\n           JOIN core.location_areas AS la ON la.workspace_id = p.workspace_id AND la.location_id = p.location_id\n          WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0 AND la.area_id = :areaId::uuid))\n  AND (search.pattern IS NULL\n       OR inventory.fold_text(i.name) LIKE search.pattern\n       OR lower(i.code) LIKE search.pattern)\n  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))\nORDER BY lower(i.code), i.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Con el total del espacio: suma exacta en numeric de todas sus ubicaciones.
 * -- Con :q, solo los materiales cuyo nombre o código lo contienen, plegados con inventory.fold_text. `\`, `%` y `_`
 * -- se escapan con `\` (chr(92), porque PgTyped no admite `\` en un literal) y cuentan como texto.
 * WITH search AS (
 *   SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * )
 * SELECT
 *   i.id,
 *   i.code,
 *   i.name,
 *   i.base_unit,
 *   m.class,
 *   trim_scale(i.minimum_quantity) AS minimum,
 *   stock.balance AS "balance!",
 *   -- Lo disponible hoy: el saldo menos lo apartado, que incluye lo prestado (ADR 0025).
 *   stock.available AS "available!",
 *   -- Bajo mínimo: la existencia física total es menor que su mínimo (ADR 0012).
 *   (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS "below_minimum!",
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *     WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0)::int AS "locations_with_stock!",
 *   -- Dónde está, de más a menos existencia: la tarjeta muestra los primeros nombres (sin ruta).
 *   (SELECT coalesce(array_agg(l.name ORDER BY p.balance DESC, l.name), '{}')
 *      FROM inventory.positions AS p
 *      JOIN core.locations AS l ON l.workspace_id = p.workspace_id AND l.id = p.location_id
 *     WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0) AS "location_names!",
 *   lower(i.code) AS "sort_code!"
 * FROM inventory.items AS i
 * JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id
 * CROSS JOIN LATERAL (
 *   SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance,
 *          trim_scale(coalesce(sum(p.balance - p.reserved), 0)) AS available
 *   FROM inventory.positions AS p
 *   WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
 * ) AS stock
 * CROSS JOIN search
 * WHERE i.workspace_id = :workspaceId!
 *   AND i.kind = 'material'
 *   AND i.archived_at IS NULL
 *   AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
 *   AND (:class::text IS NULL OR m.class = :class::text)
 *   -- Con :stock = 'below-minimum', solo los que tienen mínimo y una existencia total menor que él.
 *   AND (:stock::text IS NULL OR (:stock::text = 'below-minimum' AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity))
 *   -- Con :areaId, solo los materiales con existencia en esa área (en cualquiera de sus ubicaciones).
 *   AND (:areaId::uuid IS NULL OR EXISTS (
 *          SELECT 1
 *            FROM inventory.positions AS p
 *            JOIN core.location_areas AS la ON la.workspace_id = p.workspace_id AND la.location_id = p.location_id
 *           WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0 AND la.area_id = :areaId::uuid))
 *   AND (search.pattern IS NULL
 *        OR inventory.fold_text(i.name) LIKE search.pattern
 *        OR lower(i.code) LIKE search.pattern)
 *   AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
 * ORDER BY lower(i.code), i.id
 * LIMIT :limit!
 * ```
 */
export const listMaterials = new PreparedQuery<IListMaterialsParams,IListMaterialsResult>(listMaterialsIR);


/** 'ListMaterialAreas' parameters type */
export interface IListMaterialAreasParams {
  workspaceId: string;
}

/** 'ListMaterialAreas' return type */
export interface IListMaterialAreasResult {
  id: string;
  lent_materials: number;
  materials: number;
  name: string;
}

/** 'ListMaterialAreas' query type */
export interface IListMaterialAreasQuery {
  params: IListMaterialAreasParams;
  result: IListMaterialAreasResult;
}

const listMaterialAreasIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":646,"b":658}]}],"statement":"-- Las áreas con material en existencia: cuántos materiales hay en cada una y cuántos de ellos tienen algo prestado.\nSELECT\n  a.id,\n  a.name,\n  count(DISTINCT p.item_id)::int AS \"materials!\",\n  count(DISTINCT p.item_id) FILTER (WHERE p.reserved > 0)::int AS \"lent_materials!\"\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL\nJOIN core.location_areas AS la ON la.workspace_id = p.workspace_id AND la.location_id = p.location_id\nJOIN core.locations AS a ON a.workspace_id = la.workspace_id AND a.id = la.area_id\nWHERE p.workspace_id = :workspaceId! AND p.balance > 0\nGROUP BY a.id, a.name\nORDER BY lower(a.name), a.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Las áreas con material en existencia: cuántos materiales hay en cada una y cuántos de ellos tienen algo prestado.
 * SELECT
 *   a.id,
 *   a.name,
 *   count(DISTINCT p.item_id)::int AS "materials!",
 *   count(DISTINCT p.item_id) FILTER (WHERE p.reserved > 0)::int AS "lent_materials!"
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL
 * JOIN core.location_areas AS la ON la.workspace_id = p.workspace_id AND la.location_id = p.location_id
 * JOIN core.locations AS a ON a.workspace_id = la.workspace_id AND a.id = la.area_id
 * WHERE p.workspace_id = :workspaceId! AND p.balance > 0
 * GROUP BY a.id, a.name
 * ORDER BY lower(a.name), a.id
 * ```
 */
export const listMaterialAreas = new PreparedQuery<IListMaterialAreasParams,IListMaterialAreasResult>(listMaterialAreasIR);


