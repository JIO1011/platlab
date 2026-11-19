/** Types generated for queries found in "src/modules/materials/infrastructure/products.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

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
  limit: NumberOrString;
  productId?: string | null | void;
  q?: string | null | void;
  workspaceId: string;
}

/** 'ListMaterials' return type */
export interface IListMaterialsResult {
  balance: string;
  base_unit: string;
  below_minimum: boolean;
  class: string;
  code: string;
  id: string;
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

const listMaterialsIR: any = {"usedParamSet":{"q":true,"workspaceId":true,"productId":true,"afterId":true,"afterCode":true,"limit":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":369}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1333,"b":1345}]},{"name":"productId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1408,"b":1417},{"a":1443,"b":1452}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1601,"b":1608},{"a":1670,"b":1677}]},{"name":"afterCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":1652,"b":1661}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1722,"b":1728}]}],"statement":"-- Con el total del espacio: suma exacta en numeric de todas sus ubicaciones.\n-- Con :q, solo los materiales cuyo nombre o código lo contienen, plegados con inventory.fold_text. `\\`, `%` y `_`\n-- se escapan con `\\` (chr(92), porque PgTyped no admite `\\` en un literal) y cuentan como texto.\nWITH search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n)\nSELECT\n  i.id,\n  i.code,\n  i.name,\n  i.base_unit,\n  m.class,\n  trim_scale(i.minimum_quantity) AS minimum,\n  stock.balance AS \"balance!\",\n  -- Bajo mínimo: la existencia física total es menor que su mínimo (ADR 0012).\n  (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS \"below_minimum!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n    WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0)::int AS \"locations_with_stock!\",\n  lower(i.code) AS \"sort_code!\"\nFROM inventory.items AS i\nJOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id\nCROSS JOIN LATERAL (\n  SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id\n) AS stock\nCROSS JOIN search\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'material'\n  AND i.archived_at IS NULL\n  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)\n  AND (search.pattern IS NULL\n       OR inventory.fold_text(i.name) LIKE search.pattern\n       OR lower(i.code) LIKE search.pattern)\n  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))\nORDER BY lower(i.code), i.id\nLIMIT :limit!"};

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
 *   -- Bajo mínimo: la existencia física total es menor que su mínimo (ADR 0012).
 *   (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS "below_minimum!",
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *     WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0)::int AS "locations_with_stock!",
 *   lower(i.code) AS "sort_code!"
 * FROM inventory.items AS i
 * JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id
 * CROSS JOIN LATERAL (
 *   SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance
 *   FROM inventory.positions AS p
 *   WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
 * ) AS stock
 * CROSS JOIN search
 * WHERE i.workspace_id = :workspaceId!
 *   AND i.kind = 'material'
 *   AND i.archived_at IS NULL
 *   AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
 *   AND (search.pattern IS NULL
 *        OR inventory.fold_text(i.name) LIKE search.pattern
 *        OR lower(i.code) LIKE search.pattern)
 *   AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
 * ORDER BY lower(i.code), i.id
 * LIMIT :limit!
 * ```
 */
export const listMaterials = new PreparedQuery<IListMaterialsParams,IListMaterialsResult>(listMaterialsIR);


