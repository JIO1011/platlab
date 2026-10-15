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
  sds_file_url: string | null;
  sds_kind: string | null;
  sds_sheet_id: string | null;
  sds_url: string | null;
}

/** 'InsertProductDetail' query type */
export interface IInsertProductDetailQuery {
  params: IInsertProductDetailParams;
  result: IInsertProductDetailResult;
}

const insertProductDetailIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true,"casNumber":true,"physicalState":true,"hazards":true,"controlled":true,"sdsKind":true,"sdsUrl":true,"density":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":155}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":165}]},{"name":"casNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":177}]},{"name":"physicalState","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":194}]},{"name":"hazards","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":205}]},{"name":"controlled","required":true,"transform":{"type":"scalar"},"locs":[{"a":216,"b":227}]},{"name":"sdsKind","required":false,"transform":{"type":"scalar"},"locs":[{"a":230,"b":237}]},{"name":"sdsUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":240,"b":246}]},{"name":"density","required":false,"transform":{"type":"scalar"},"locs":[{"a":249,"b":256}]}],"statement":"INSERT INTO reagents.products\n  (workspace_id, item_id, cas_number, physical_state, hazards, controlled, sds_kind, sds_url, density)\nVALUES\n  (:workspaceId!, :itemId!, :casNumber, :physicalState!, :hazards!::text[], :controlled!, :sdsKind, :sdsUrl, :density::numeric)\nRETURNING cas_number, physical_state, hazards, controlled, sds_kind, sds_url, sds_sheet_id,\n  NULL::text AS sds_file_url, trim_scale(density) AS density"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO reagents.products
 *   (workspace_id, item_id, cas_number, physical_state, hazards, controlled, sds_kind, sds_url, density)
 * VALUES
 *   (:workspaceId!, :itemId!, :casNumber, :physicalState!, :hazards!::text[], :controlled!, :sdsKind, :sdsUrl, :density::numeric)
 * RETURNING cas_number, physical_state, hazards, controlled, sds_kind, sds_url, sds_sheet_id,
 *   NULL::text AS sds_file_url, trim_scale(density) AS density
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
  sds_file_url: string | null;
  sds_kind: string | null;
  sds_sheet_id: string | null;
  sds_url: string | null;
}

/** 'FindProductDetail' query type */
export interface IFindProductDetailQuery {
  params: IFindProductDetailParams;
  result: IFindProductDetailResult;
}

const findProductDetailIR: any = {"usedParamSet":{"workspaceId":true,"itemId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":434,"b":446}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":464,"b":471}]}],"statement":"-- La ficha química de un reactivo del espacio (ADR 0015), con el PDF vigente de su ficha de seguridad (ADR 0017).\nSELECT r.cas_number, r.physical_state, r.hazards, r.controlled, r.sds_kind, r.sds_url, r.sds_sheet_id,\n       s.url AS \"sds_file_url?\", trim_scale(r.density) AS density\nFROM reagents.products AS r\nLEFT JOIN reagents.safety_sheets AS s ON s.workspace_id = r.workspace_id AND s.id = r.sds_sheet_id\nWHERE r.workspace_id = :workspaceId! AND r.item_id = :itemId!"};

/**
 * Query generated from SQL:
 * ```
 * -- La ficha química de un reactivo del espacio (ADR 0015), con el PDF vigente de su ficha de seguridad (ADR 0017).
 * SELECT r.cas_number, r.physical_state, r.hazards, r.controlled, r.sds_kind, r.sds_url, r.sds_sheet_id,
 *        s.url AS "sds_file_url?", trim_scale(r.density) AS density
 * FROM reagents.products AS r
 * LEFT JOIN reagents.safety_sheets AS s ON s.workspace_id = r.workspace_id AND s.id = r.sds_sheet_id
 * WHERE r.workspace_id = :workspaceId! AND r.item_id = :itemId!
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
  keepSheet: boolean;
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

const updateProductDetailIR: any = {"usedParamSet":{"casNumber":true,"physicalState":true,"hazards":true,"controlled":true,"sdsKind":true,"sdsUrl":true,"density":true,"keepSheet":true,"workspaceId":true,"itemId":true},"params":[{"name":"casNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":214,"b":223}]},{"name":"physicalState","required":false,"transform":{"type":"scalar"},"locs":[{"a":243,"b":256}]},{"name":"hazards","required":true,"transform":{"type":"scalar"},"locs":[{"a":269,"b":277}]},{"name":"controlled","required":true,"transform":{"type":"scalar"},"locs":[{"a":301,"b":312}]},{"name":"sdsKind","required":false,"transform":{"type":"scalar"},"locs":[{"a":330,"b":337}]},{"name":"sdsUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":350,"b":356}]},{"name":"density","required":false,"transform":{"type":"scalar"},"locs":[{"a":369,"b":376}]},{"name":"keepSheet","required":true,"transform":{"type":"scalar"},"locs":[{"a":417,"b":427}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":481,"b":493}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":509,"b":516}]}],"statement":"-- Escribe la ficha ya combinada; el comando la edita con el ítem bloqueado. Sin :keepSheet, el reactivo\n-- deja de apuntar a su PDF (ADR 0017), que sigue en el historial.\nUPDATE reagents.products\nSET cas_number = :casNumber, physical_state = :physicalState, hazards = :hazards!::text[], controlled = :controlled!,\n    sds_kind = :sdsKind, sds_url = :sdsUrl, density = :density::numeric,\n    sds_sheet_id = CASE WHEN :keepSheet!::boolean THEN sds_sheet_id END\nWHERE workspace_id = :workspaceId! AND item_id = :itemId!\nRETURNING item_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Escribe la ficha ya combinada; el comando la edita con el ítem bloqueado. Sin :keepSheet, el reactivo
 * -- deja de apuntar a su PDF (ADR 0017), que sigue en el historial.
 * UPDATE reagents.products
 * SET cas_number = :casNumber, physical_state = :physicalState, hazards = :hazards!::text[], controlled = :controlled!,
 *     sds_kind = :sdsKind, sds_url = :sdsUrl, density = :density::numeric,
 *     sds_sheet_id = CASE WHEN :keepSheet!::boolean THEN sds_sheet_id END
 * WHERE workspace_id = :workspaceId! AND item_id = :itemId!
 * RETURNING item_id
 * ```
 */
export const updateProductDetail = new PreparedQuery<IUpdateProductDetailParams,IUpdateProductDetailResult>(updateProductDetailIR);


/** 'InsertSafetySheet' parameters type */
export interface IInsertSafetySheetParams {
  byteSize: number;
  id: string;
  objectPath: string;
  productId: string;
  sha256: string;
  uploadedBy: string;
  url: string;
  workspaceId: string;
}

/** 'InsertSafetySheet' return type */
export interface IInsertSafetySheetResult {
  id: string;
}

/** 'InsertSafetySheet' query type */
export interface IInsertSafetySheetQuery {
  params: IInsertSafetySheetParams;
  result: IInsertSafetySheetResult;
}

const insertSafetySheetIR: any = {"usedParamSet":{"workspaceId":true,"id":true,"productId":true,"objectPath":true,"url":true,"byteSize":true,"sha256":true,"uploadedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":204,"b":216}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":219,"b":222}]},{"name":"productId","required":true,"transform":{"type":"scalar"},"locs":[{"a":225,"b":235}]},{"name":"objectPath","required":true,"transform":{"type":"scalar"},"locs":[{"a":238,"b":249}]},{"name":"url","required":true,"transform":{"type":"scalar"},"locs":[{"a":252,"b":256}]},{"name":"byteSize","required":true,"transform":{"type":"scalar"},"locs":[{"a":259,"b":268}]},{"name":"sha256","required":true,"transform":{"type":"scalar"},"locs":[{"a":271,"b":278}]},{"name":"uploadedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":281,"b":292}]}],"statement":"-- Un PDF subido (ADR 0017): fila nueva, nunca reemplaza otra.\nINSERT INTO reagents.safety_sheets\n  (workspace_id, id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)\nVALUES\n  (:workspaceId!, :id!, :productId!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un PDF subido (ADR 0017): fila nueva, nunca reemplaza otra.
 * INSERT INTO reagents.safety_sheets
 *   (workspace_id, id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
 * VALUES
 *   (:workspaceId!, :id!, :productId!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)
 * RETURNING id
 * ```
 */
export const insertSafetySheet = new PreparedQuery<IInsertSafetySheetParams,IInsertSafetySheetResult>(insertSafetySheetIR);


/** 'PointProductSheet' parameters type */
export interface IPointProductSheetParams {
  itemId: string;
  sheetId: string;
  workspaceId: string;
}

/** 'PointProductSheet' return type */
export interface IPointProductSheetResult {
  item_id: string;
}

/** 'PointProductSheet' query type */
export interface IPointProductSheetQuery {
  params: IPointProductSheetParams;
  result: IPointProductSheetResult;
}

const pointProductSheetIR: any = {"usedParamSet":{"sheetId":true,"workspaceId":true,"itemId":true},"params":[{"name":"sheetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":182}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":205,"b":217}]},{"name":"itemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":233,"b":240}]}],"statement":"-- El PDF pasa a ser la ficha vigente: digital y sin enlace, que es la otra forma de ficha.\nUPDATE reagents.products\nSET sds_kind = 'digital', sds_url = NULL, sds_sheet_id = :sheetId!\nWHERE workspace_id = :workspaceId! AND item_id = :itemId!\nRETURNING item_id"};

/**
 * Query generated from SQL:
 * ```
 * -- El PDF pasa a ser la ficha vigente: digital y sin enlace, que es la otra forma de ficha.
 * UPDATE reagents.products
 * SET sds_kind = 'digital', sds_url = NULL, sds_sheet_id = :sheetId!
 * WHERE workspace_id = :workspaceId! AND item_id = :itemId!
 * RETURNING item_id
 * ```
 */
export const pointProductSheet = new PreparedQuery<IPointProductSheetParams,IPointProductSheetResult>(pointProductSheetIR);


/** 'ListProductSafety' parameters type */
export interface IListProductSafetyParams {
  itemIds: stringArray;
  workspaceId: string;
}

/** 'ListProductSafety' return type */
export interface IListProductSafetyResult {
  controlled: boolean;
  item_id: string;
  sds_file_url: string | null;
  sds_kind: string | null;
  sds_url: string | null;
}

/** 'ListProductSafety' query type */
export interface IListProductSafetyQuery {
  params: IListProductSafetyParams;
  result: IListProductSafetyResult;
}

const listProductSafetyIR: any = {"usedParamSet":{"workspaceId":true,"itemIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":330,"b":342}]},{"name":"itemIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":365,"b":373}]}],"statement":"-- Marca de controlado (ADR 0015) y ficha de seguridad (ADR 0016) de los reactivos de unos frascos.\nSELECT r.item_id, r.controlled, r.sds_kind, r.sds_url, s.url AS \"sds_file_url?\"\nFROM reagents.products AS r\nLEFT JOIN reagents.safety_sheets AS s ON s.workspace_id = r.workspace_id AND s.id = r.sds_sheet_id\nWHERE r.workspace_id = :workspaceId! AND r.item_id = ANY (:itemIds!::uuid[])"};

/**
 * Query generated from SQL:
 * ```
 * -- Marca de controlado (ADR 0015) y ficha de seguridad (ADR 0016) de los reactivos de unos frascos.
 * SELECT r.item_id, r.controlled, r.sds_kind, r.sds_url, s.url AS "sds_file_url?"
 * FROM reagents.products AS r
 * LEFT JOIN reagents.safety_sheets AS s ON s.workspace_id = r.workspace_id AND s.id = r.sds_sheet_id
 * WHERE r.workspace_id = :workspaceId! AND r.item_id = ANY (:itemIds!::uuid[])
 * ```
 */
export const listProductSafety = new PreparedQuery<IListProductSafetyParams,IListProductSafetyResult>(listProductSafetyIR);


/** 'ListProducts' parameters type */
export interface IListProductsParams {
  afterCode?: string | null | void;
  afterId?: string | null | void;
  expiringDays: number;
  limit: NumberOrString;
  productId?: string | null | void;
  q?: string | null | void;
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
  sds_file_url: string | null;
  sds_kind: string | null;
  sds_url: string | null;
  sort_code: string;
}

/** 'ListProducts' query type */
export interface IListProductsQuery {
  params: IListProductsParams;
  result: IListProductsResult;
}

const listProductsIR: any = {"usedParamSet":{"q":true,"timeZone":true,"expiringDays":true,"workspaceId":true,"productId":true,"afterId":true,"afterCode":true,"limit":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":444,"b":445}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":1596,"b":1605},{"a":1929,"b":1938},{"a":1998,"b":2007}]},{"name":"expiringDays","required":true,"transform":{"type":"scalar"},"locs":[{"a":2018,"b":2031}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":2554,"b":2566}]},{"name":"productId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2628,"b":2637},{"a":2663,"b":2672}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2864,"b":2871},{"a":2933,"b":2940}]},{"name":"afterCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":2915,"b":2924}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2985,"b":2991}]}],"statement":"-- Con el total del espacio: suma exacta en numeric de todas sus ubicaciones.\n-- Con :q, solo los reactivos cuyo nombre, código o CAS lo contienen, plegados con inventory.fold_text\n-- (código y CAS son ASCII por su CHECK). `\\`, `%` y `_` se escapan con `\\` (el escape por omisión de\n-- LIKE; chr(92), porque PgTyped no admite `\\` en un literal) y cuentan como texto.\nWITH search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n)\nSELECT\n  i.id,\n  i.code,\n  i.name,\n  i.base_unit,\n  r.cas_number,\n  r.physical_state,\n  r.hazards,\n  r.controlled,\n  r.sds_kind,\n  r.sds_url,\n  sheet.url AS \"sds_file_url?\",\n  trim_scale(r.density) AS density,\n  trim_scale(i.minimum_quantity) AS minimum,\n  stock.balance AS \"balance!\",\n  -- Bajo mínimo (ADR 0012, 05-10-2026): existencia física, con los vencidos y lo apartado.\n  (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS \"below_minimum!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0)::int AS \"containers_with_stock!\",\n  -- Avisos de caducidad (ADR 0012, 05-10-2026): frascos con saldo; «hoy» es la fecha civil del espacio.\n  (SELECT count(*)\n     FROM inventory.positions AS p\n     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0\n      AND l.expires_on < (now() AT TIME ZONE :timeZone!)::date)::int AS \"expired_containers!\",\n  (SELECT count(*)\n     FROM inventory.positions AS p\n     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n    WHERE p.workspace_id = i.workspace_id\n      AND p.item_id = i.id\n      AND p.balance > 0\n      AND l.expires_on BETWEEN (now() AT TIME ZONE :timeZone!)::date\n                           AND (now() AT TIME ZONE :timeZone!)::date + :expiringDays!::int)::int AS \"expiring_containers!\",\n  lower(i.code) AS \"sort_code!\"\nFROM inventory.items AS i\nJOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id\nLEFT JOIN reagents.safety_sheets AS sheet ON sheet.workspace_id = r.workspace_id AND sheet.id = r.sds_sheet_id\nCROSS JOIN LATERAL (\n  SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = i.workspace_id\n    AND p.item_id = i.id\n) AS stock\nCROSS JOIN search\nWHERE i.workspace_id = :workspaceId!\n  AND i.kind = 'reagent'\n  AND i.archived_at IS NULL\n  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)\n  AND (search.pattern IS NULL\n       OR inventory.fold_text(i.name) LIKE search.pattern\n       OR lower(i.code) LIKE search.pattern\n       OR r.cas_number LIKE search.pattern)\n  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))\nORDER BY lower(i.code), i.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Con el total del espacio: suma exacta en numeric de todas sus ubicaciones.
 * -- Con :q, solo los reactivos cuyo nombre, código o CAS lo contienen, plegados con inventory.fold_text
 * -- (código y CAS son ASCII por su CHECK). `\`, `%` y `_` se escapan con `\` (el escape por omisión de
 * -- LIKE; chr(92), porque PgTyped no admite `\` en un literal) y cuentan como texto.
 * WITH search AS (
 *   SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * )
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
 *   sheet.url AS "sds_file_url?",
 *   trim_scale(r.density) AS density,
 *   trim_scale(i.minimum_quantity) AS minimum,
 *   stock.balance AS "balance!",
 *   -- Bajo mínimo (ADR 0012, 05-10-2026): existencia física, con los vencidos y lo apartado.
 *   (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS "below_minimum!",
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *     WHERE p.workspace_id = i.workspace_id
 *       AND p.item_id = i.id
 *       AND p.balance > 0)::int AS "containers_with_stock!",
 *   -- Avisos de caducidad (ADR 0012, 05-10-2026): frascos con saldo; «hoy» es la fecha civil del espacio.
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *      JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 *     WHERE p.workspace_id = i.workspace_id
 *       AND p.item_id = i.id
 *       AND p.balance > 0
 *       AND l.expires_on < (now() AT TIME ZONE :timeZone!)::date)::int AS "expired_containers!",
 *   (SELECT count(*)
 *      FROM inventory.positions AS p
 *      JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 *     WHERE p.workspace_id = i.workspace_id
 *       AND p.item_id = i.id
 *       AND p.balance > 0
 *       AND l.expires_on BETWEEN (now() AT TIME ZONE :timeZone!)::date
 *                            AND (now() AT TIME ZONE :timeZone!)::date + :expiringDays!::int)::int AS "expiring_containers!",
 *   lower(i.code) AS "sort_code!"
 * FROM inventory.items AS i
 * JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
 * LEFT JOIN reagents.safety_sheets AS sheet ON sheet.workspace_id = r.workspace_id AND sheet.id = r.sds_sheet_id
 * CROSS JOIN LATERAL (
 *   SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance
 *   FROM inventory.positions AS p
 *   WHERE p.workspace_id = i.workspace_id
 *     AND p.item_id = i.id
 * ) AS stock
 * CROSS JOIN search
 * WHERE i.workspace_id = :workspaceId!
 *   AND i.kind = 'reagent'
 *   AND i.archived_at IS NULL
 *   AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
 *   AND (search.pattern IS NULL
 *        OR inventory.fold_text(i.name) LIKE search.pattern
 *        OR lower(i.code) LIKE search.pattern
 *        OR r.cas_number LIKE search.pattern)
 *   AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
 * ORDER BY lower(i.code), i.id
 * LIMIT :limit!
 * ```
 */
export const listProducts = new PreparedQuery<IListProductsParams,IListProductsResult>(listProductsIR);


/** 'HomeSummary' parameters type */
export interface IHomeSummaryParams {
  expiringDays: number;
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

const homeSummaryIR: any = {"usedParamSet":{"workspaceId":true,"timeZone":true,"expiringDays":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":650,"b":662},{"a":1060,"b":1072}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":756,"b":765}]},{"name":"expiringDays","required":true,"transform":{"type":"scalar"},"locs":[{"a":1515,"b":1528}]}],"statement":"-- Contadores del Resumen y de la tarjeta de Inicio: inventario del espacio, no filas del catálogo. Vencido y por vencer (ADR 0012, 05-10-2026): frascos con saldo, con «hoy» en\n-- la fecha civil del espacio; por vencer incluye hoy y los próximos :expiringDays días (02 §12).\n-- Bajo mínimo: reactivos activos con mínimo cuya existencia física es menor (ADR 0012, 05-10-2026).\nWITH stocked AS (\n  SELECT p.item_id, l.expires_on\n  FROM inventory.positions AS p\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\n  JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\n  WHERE p.workspace_id = :workspaceId!\n    AND i.kind = 'reagent'\n    AND p.balance > 0\n), today AS (\n  SELECT (now() AT TIME ZONE :timeZone!)::date AS d\n), minimums AS (\n  SELECT i.minimum_quantity,\n         (SELECT coalesce(sum(p.balance), 0)\n            FROM inventory.positions AS p\n           WHERE p.workspace_id = i.workspace_id\n             AND p.item_id = i.id) AS balance\n  FROM inventory.items AS i\n  WHERE i.workspace_id = :workspaceId!\n    AND i.kind = 'reagent'\n    AND i.archived_at IS NULL\n    AND i.minimum_quantity IS NOT NULL\n)\nSELECT\n  (SELECT count(DISTINCT item_id) FROM stocked) AS \"products_with_stock!\",\n  (SELECT count(*) FROM stocked) AS \"containers_with_stock!\",\n  (SELECT count(*) FROM stocked, today WHERE stocked.expires_on < today.d) AS \"expired_containers!\",\n  (SELECT count(*) FROM stocked, today\n    WHERE stocked.expires_on BETWEEN today.d AND today.d + :expiringDays!::int) AS \"expiring_containers!\",\n  (SELECT count(*) FROM minimums WHERE balance < minimum_quantity) AS \"below_minimum!\",\n  (SELECT count(*) FROM minimums) AS \"products_with_minimum!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Contadores del Resumen y de la tarjeta de Inicio: inventario del espacio, no filas del catálogo. Vencido y por vencer (ADR 0012, 05-10-2026): frascos con saldo, con «hoy» en
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
 * ), today AS (
 *   SELECT (now() AT TIME ZONE :timeZone!)::date AS d
 * ), minimums AS (
 *   SELECT i.minimum_quantity,
 *          (SELECT coalesce(sum(p.balance), 0)
 *             FROM inventory.positions AS p
 *            WHERE p.workspace_id = i.workspace_id
 *              AND p.item_id = i.id) AS balance
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


/** 'ListActiveLocations' parameters type */
export interface IListActiveLocationsParams {
  workspaceId: string;
}

/** 'ListActiveLocations' return type */
export interface IListActiveLocationsResult {
  code: string;
  id: string;
  kind: string;
  name: string;
  parent_id: string | null;
}

/** 'ListActiveLocations' query type */
export interface IListActiveLocationsQuery {
  params: IListActiveLocationsParams;
  result: IListActiveLocationsResult;
}

const listActiveLocationsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":92}]}],"statement":"SELECT id, code, name, kind, parent_id\nFROM core.locations\nWHERE workspace_id = :workspaceId!\n  AND archived_at IS NULL\nORDER BY lower(code), id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, code, name, kind, parent_id
 * FROM core.locations
 * WHERE workspace_id = :workspaceId!
 *   AND archived_at IS NULL
 * ORDER BY lower(code), id
 * ```
 */
export const listActiveLocations = new PreparedQuery<IListActiveLocationsParams,IListActiveLocationsResult>(listActiveLocationsIR);


