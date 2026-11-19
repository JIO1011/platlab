/** Types generated for queries found in "src/modules/materials/infrastructure/movements.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'ListMaterialMovements' parameters type */
export interface IListMaterialMovementsParams {
  beforeAt?: DateOrString | null | void;
  beforeId?: string | null | void;
  from?: string | null | void;
  kind?: string | null | void;
  limit: NumberOrString;
  productId?: string | null | void;
  purpose?: string | null | void;
  q?: string | null | void;
  timeZone: string;
  to?: string | null | void;
  workspaceId: string;
}

/** 'ListMaterialMovements' return type */
export interface IListMaterialMovementsResult {
  actor: string | null;
  at: Date;
  cursor_at: string;
  detail: string | null;
  id: string;
  kind: string;
  lot: string | null;
  outcome: string | null;
  person: string | null;
  place: string;
  product_class: string;
  product_code: string;
  product_id: string;
  product_name: string;
  purpose: string | null;
  quantity: string;
  reference: string | null;
  unit: string;
}

/** 'ListMaterialMovements' query type */
export interface IListMaterialMovementsQuery {
  params: IListMaterialMovementsParams;
  result: IListMaterialMovementsResult;
}

const listMaterialMovementsIR: any = {"usedParamSet":{"q":true,"workspaceId":true,"kind":true,"productId":true,"purpose":true,"from":true,"timeZone":true,"to":true,"beforeAt":true,"beforeId":true,"limit":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":699,"b":700},{"a":4773,"b":4774}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1677,"b":1689},{"a":1991,"b":2003},{"a":2337,"b":2349},{"a":2989,"b":3001}]},{"name":"kind","required":false,"transform":{"type":"scalar"},"locs":[{"a":4181,"b":4185},{"a":4213,"b":4217}]},{"name":"productId","required":false,"transform":{"type":"scalar"},"locs":[{"a":4233,"b":4242},{"a":4268,"b":4277}]},{"name":"purpose","required":false,"transform":{"type":"scalar"},"locs":[{"a":4293,"b":4300},{"a":4331,"b":4338}]},{"name":"from","required":false,"transform":{"type":"scalar"},"locs":[{"a":4354,"b":4358},{"a":4386,"b":4390}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":4423,"b":4432},{"a":4510,"b":4519}]},{"name":"to","required":false,"transform":{"type":"scalar"},"locs":[{"a":4442,"b":4444},{"a":4471,"b":4473}]},{"name":"beforeAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":4900,"b":4908},{"a":4950,"b":4958}]},{"name":"beforeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":4974,"b":4982}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":5028,"b":5034}]}],"statement":"-- Libro de Materiales (MA-01d, ADR 0025). Del libro del inventario: ingresos, salidas y ajustes de materiales; un ajuste\n-- que dejó una devolución dañada o perdida es una baja. De los vales: cada línea prestada (sale del estante) y cada\n-- devolución en buen estado (vuelve), que apartan y liberan sin mover el saldo. Del más nuevo al más viejo, por\n-- (at, id), con el periodo en la fecha civil del espacio; con :productId, solo ese material. Con :q, por material (nombre o código), referencia, vale\n-- (P-0043 o 43) o persona, plegados y con `\\`, `%` y `_` escapados como en el catálogo. Los nombres solo se muestran.\nWITH search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n),\nmovements AS (\n  SELECT e.id::text AS id,\n         CASE WHEN rl.id IS NOT NULL THEN 'writeoff' ELSE o.type END AS kind,\n         o.effective_at AS at, e.position_id, e.quantity, ln.loan_id, o.reference,\n         coalesce(d.requester_principal_id, o.requested_by_principal_id) AS person_id,\n         o.actor_principal_id AS actor_id, d.purpose, rl.outcome,\n         coalesce(rl.note, o.reason) AS detail\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  LEFT JOIN materials.issue_details AS d ON d.workspace_id = o.workspace_id AND d.operation_id = o.id\n  LEFT JOIN materials.return_lines AS rl ON rl.workspace_id = o.workspace_id AND rl.operation_id = o.id\n  LEFT JOIN materials.loan_lines AS ln ON ln.workspace_id = rl.workspace_id AND ln.id = rl.loan_line_id\n  WHERE o.workspace_id = :workspaceId!\n  UNION ALL\n  SELECT ln.id::text, 'loan', l.lent_at, ln.position_id, -ln.quantity, l.id, NULL, NULL,\n         l.lent_by_principal_id, NULL, NULL, l.notes\n  FROM materials.loan_lines AS ln\n  JOIN materials.loans AS l ON l.workspace_id = ln.workspace_id AND l.id = ln.loan_id\n  WHERE ln.workspace_id = :workspaceId!\n  UNION ALL\n  SELECT rl.id::text, 'return', rl.returned_at, ln.position_id, rl.quantity, ln.loan_id, NULL, NULL,\n         rl.returned_by_principal_id, NULL, NULL, rl.note\n  FROM materials.return_lines AS rl\n  JOIN materials.loan_lines AS ln ON ln.workspace_id = rl.workspace_id AND ln.id = rl.loan_line_id\n  WHERE rl.workspace_id = :workspaceId! AND rl.outcome = 'good'\n)\nSELECT\n  m.id AS \"id!\",\n  m.kind AS \"kind!\",\n  m.at AS \"at!\",\n  m.at::text AS \"cursor_at!\",\n  i.id AS product_id,\n  i.code AS product_code,\n  i.name AS product_name,\n  prod.class AS product_class,\n  i.base_unit AS unit,\n  place.name AS place,\n  lot.supplier_lot AS lot,\n  trim_scale(m.quantity) AS \"quantity!\",\n  CASE WHEN l.id IS NOT NULL THEN 'P-' || lpad(l.number::text, 4, '0') ELSE m.reference END AS reference,\n  person.display_name AS \"person?\",\n  actor.display_name AS \"actor?\",\n  m.purpose,\n  m.outcome,\n  m.detail\nFROM movements AS m\nCROSS JOIN search\nJOIN inventory.positions AS p ON p.workspace_id = :workspaceId! AND p.id = m.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'\nJOIN materials.products AS prod ON prod.workspace_id = i.workspace_id AND prod.item_id = i.id\nJOIN core.locations AS place ON place.workspace_id = p.workspace_id AND place.id = p.location_id\nLEFT JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id\nLEFT JOIN materials.loans AS l ON l.workspace_id = p.workspace_id AND l.id = m.loan_id\nLEFT JOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS mb ON mb.workspace_id = pr.workspace_id AND mb.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = mb.identity_id\n  WHERE pr.workspace_id = p.workspace_id AND pr.id = coalesce(m.person_id, l.borrower_principal_id)\n) AS person ON true\nLEFT JOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS mb ON mb.workspace_id = pr.workspace_id AND mb.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = mb.identity_id\n  WHERE pr.workspace_id = p.workspace_id AND pr.id = m.actor_id\n) AS actor ON true\nWHERE (:kind::text IS NULL OR m.kind = :kind::text)\n  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)\n  AND (:purpose::text IS NULL OR m.purpose = :purpose::text)\n  AND (:from::date IS NULL OR m.at >= (:from::date)::timestamp AT TIME ZONE :timeZone!)\n  AND (:to::date IS NULL OR m.at < (:to::date + 1)::timestamp AT TIME ZONE :timeZone!)\n  AND (search.pattern IS NULL\n       OR inventory.fold_text(i.name) LIKE search.pattern\n       OR lower(i.code) LIKE search.pattern\n       OR inventory.fold_text(m.reference) LIKE search.pattern\n       OR l.number::text = nullif(ltrim(substring(lower(:q::text) FROM '^(?:p-?)?([0-9]+)$'), '0'), '')\n       OR inventory.fold_text(person.display_name) LIKE search.pattern)\n  AND (:beforeAt::timestamptz IS NULL OR (m.at, m.id) < (:beforeAt::timestamptz, :beforeId::text))\nORDER BY m.at DESC, m.id DESC\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Libro de Materiales (MA-01d, ADR 0025). Del libro del inventario: ingresos, salidas y ajustes de materiales; un ajuste
 * -- que dejó una devolución dañada o perdida es una baja. De los vales: cada línea prestada (sale del estante) y cada
 * -- devolución en buen estado (vuelve), que apartan y liberan sin mover el saldo. Del más nuevo al más viejo, por
 * -- (at, id), con el periodo en la fecha civil del espacio; con :productId, solo ese material. Con :q, por material (nombre o código), referencia, vale
 * -- (P-0043 o 43) o persona, plegados y con `\`, `%` y `_` escapados como en el catálogo. Los nombres solo se muestran.
 * WITH search AS (
 *   SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * ),
 * movements AS (
 *   SELECT e.id::text AS id,
 *          CASE WHEN rl.id IS NOT NULL THEN 'writeoff' ELSE o.type END AS kind,
 *          o.effective_at AS at, e.position_id, e.quantity, ln.loan_id, o.reference,
 *          coalesce(d.requester_principal_id, o.requested_by_principal_id) AS person_id,
 *          o.actor_principal_id AS actor_id, d.purpose, rl.outcome,
 *          coalesce(rl.note, o.reason) AS detail
 *   FROM inventory.operations AS o
 *   JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 *   LEFT JOIN materials.issue_details AS d ON d.workspace_id = o.workspace_id AND d.operation_id = o.id
 *   LEFT JOIN materials.return_lines AS rl ON rl.workspace_id = o.workspace_id AND rl.operation_id = o.id
 *   LEFT JOIN materials.loan_lines AS ln ON ln.workspace_id = rl.workspace_id AND ln.id = rl.loan_line_id
 *   WHERE o.workspace_id = :workspaceId!
 *   UNION ALL
 *   SELECT ln.id::text, 'loan', l.lent_at, ln.position_id, -ln.quantity, l.id, NULL, NULL,
 *          l.lent_by_principal_id, NULL, NULL, l.notes
 *   FROM materials.loan_lines AS ln
 *   JOIN materials.loans AS l ON l.workspace_id = ln.workspace_id AND l.id = ln.loan_id
 *   WHERE ln.workspace_id = :workspaceId!
 *   UNION ALL
 *   SELECT rl.id::text, 'return', rl.returned_at, ln.position_id, rl.quantity, ln.loan_id, NULL, NULL,
 *          rl.returned_by_principal_id, NULL, NULL, rl.note
 *   FROM materials.return_lines AS rl
 *   JOIN materials.loan_lines AS ln ON ln.workspace_id = rl.workspace_id AND ln.id = rl.loan_line_id
 *   WHERE rl.workspace_id = :workspaceId! AND rl.outcome = 'good'
 * )
 * SELECT
 *   m.id AS "id!",
 *   m.kind AS "kind!",
 *   m.at AS "at!",
 *   m.at::text AS "cursor_at!",
 *   i.id AS product_id,
 *   i.code AS product_code,
 *   i.name AS product_name,
 *   prod.class AS product_class,
 *   i.base_unit AS unit,
 *   place.name AS place,
 *   lot.supplier_lot AS lot,
 *   trim_scale(m.quantity) AS "quantity!",
 *   CASE WHEN l.id IS NOT NULL THEN 'P-' || lpad(l.number::text, 4, '0') ELSE m.reference END AS reference,
 *   person.display_name AS "person?",
 *   actor.display_name AS "actor?",
 *   m.purpose,
 *   m.outcome,
 *   m.detail
 * FROM movements AS m
 * CROSS JOIN search
 * JOIN inventory.positions AS p ON p.workspace_id = :workspaceId! AND p.id = m.position_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'
 * JOIN materials.products AS prod ON prod.workspace_id = i.workspace_id AND prod.item_id = i.id
 * JOIN core.locations AS place ON place.workspace_id = p.workspace_id AND place.id = p.location_id
 * LEFT JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id
 * LEFT JOIN materials.loans AS l ON l.workspace_id = p.workspace_id AND l.id = m.loan_id
 * LEFT JOIN LATERAL (
 *   SELECT ident.display_name
 *   FROM core.principals AS pr
 *   JOIN core.memberships AS mb ON mb.workspace_id = pr.workspace_id AND mb.id = pr.membership_id
 *   JOIN core.identities AS ident ON ident.id = mb.identity_id
 *   WHERE pr.workspace_id = p.workspace_id AND pr.id = coalesce(m.person_id, l.borrower_principal_id)
 * ) AS person ON true
 * LEFT JOIN LATERAL (
 *   SELECT ident.display_name
 *   FROM core.principals AS pr
 *   JOIN core.memberships AS mb ON mb.workspace_id = pr.workspace_id AND mb.id = pr.membership_id
 *   JOIN core.identities AS ident ON ident.id = mb.identity_id
 *   WHERE pr.workspace_id = p.workspace_id AND pr.id = m.actor_id
 * ) AS actor ON true
 * WHERE (:kind::text IS NULL OR m.kind = :kind::text)
 *   AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
 *   AND (:purpose::text IS NULL OR m.purpose = :purpose::text)
 *   AND (:from::date IS NULL OR m.at >= (:from::date)::timestamp AT TIME ZONE :timeZone!)
 *   AND (:to::date IS NULL OR m.at < (:to::date + 1)::timestamp AT TIME ZONE :timeZone!)
 *   AND (search.pattern IS NULL
 *        OR inventory.fold_text(i.name) LIKE search.pattern
 *        OR lower(i.code) LIKE search.pattern
 *        OR inventory.fold_text(m.reference) LIKE search.pattern
 *        OR l.number::text = nullif(ltrim(substring(lower(:q::text) FROM '^(?:p-?)?([0-9]+)$'), '0'), '')
 *        OR inventory.fold_text(person.display_name) LIKE search.pattern)
 *   AND (:beforeAt::timestamptz IS NULL OR (m.at, m.id) < (:beforeAt::timestamptz, :beforeId::text))
 * ORDER BY m.at DESC, m.id DESC
 * LIMIT :limit!
 * ```
 */
export const listMaterialMovements = new PreparedQuery<IListMaterialMovementsParams,IListMaterialMovementsResult>(listMaterialMovementsIR);


/** 'MaterialName' parameters type */
export interface IMaterialNameParams {
  productId: string;
  workspaceId: string;
}

/** 'MaterialName' return type */
export interface IMaterialNameResult {
  code: string;
  name: string;
}

/** 'MaterialName' query type */
export interface IMaterialNameQuery {
  params: IMaterialNameParams;
  result: IMaterialNameResult;
}

const materialNameIR: any = {"usedParamSet":{"workspaceId":true,"productId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":126,"b":138}]},{"name":"productId","required":true,"transform":{"type":"scalar"},"locs":[{"a":149,"b":159}]}],"statement":"-- El nombre del material filtrado, para el encabezado del Excel.\nSELECT code, name FROM inventory.items WHERE workspace_id = :workspaceId! AND id = :productId! AND kind = 'material'"};

/**
 * Query generated from SQL:
 * ```
 * -- El nombre del material filtrado, para el encabezado del Excel.
 * SELECT code, name FROM inventory.items WHERE workspace_id = :workspaceId! AND id = :productId! AND kind = 'material'
 * ```
 */
export const materialName = new PreparedQuery<IMaterialNameParams,IMaterialNameResult>(materialNameIR);


/** 'StockPositionsOf' parameters type */
export interface IStockPositionsOfParams {
  itemIds: stringArray;
  workspaceId: string;
}

/** 'StockPositionsOf' return type */
export interface IStockPositionsOfResult {
  available: string;
  balance: string;
  expires_on: string | null;
  item_id: string;
  location_name: string;
  supplier_lot: string | null;
}

/** 'StockPositionsOf' query type */
export interface IStockPositionsOfQuery {
  params: IStockPositionsOfParams;
  result: IStockPositionsOfResult;
}

const stockPositionsOfIR: any = {"usedParamSet":{"workspaceId":true,"itemIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":578,"b":590}]},{"name":"itemIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":613,"b":621}]}],"statement":"-- Las existencias de hoy de esos materiales para el Excel del Inventario: cada ubicación y lote con saldo, primero lo que\n-- vence antes (FEFO, MA-01f).\nSELECT p.item_id, loc.name AS location_name, lot.supplier_lot, lot.expires_on::text AS expires_on,\n       trim_scale(p.balance) AS \"balance!\", trim_scale(p.balance - p.reserved) AS \"available!\"\nFROM inventory.positions AS p\nJOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id\nJOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id\nWHERE p.workspace_id = :workspaceId! AND p.item_id = ANY (:itemIds!::uuid[]) AND p.balance > 0\nORDER BY p.item_id, lot.expires_on NULLS LAST, inventory.fold_text(loc.name), p.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Las existencias de hoy de esos materiales para el Excel del Inventario: cada ubicación y lote con saldo, primero lo que
 * -- vence antes (FEFO, MA-01f).
 * SELECT p.item_id, loc.name AS location_name, lot.supplier_lot, lot.expires_on::text AS expires_on,
 *        trim_scale(p.balance) AS "balance!", trim_scale(p.balance - p.reserved) AS "available!"
 * FROM inventory.positions AS p
 * JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
 * JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id
 * WHERE p.workspace_id = :workspaceId! AND p.item_id = ANY (:itemIds!::uuid[]) AND p.balance > 0
 * ORDER BY p.item_id, lot.expires_on NULLS LAST, inventory.fold_text(loc.name), p.id
 * ```
 */
export const stockPositionsOf = new PreparedQuery<IStockPositionsOfParams,IStockPositionsOfResult>(stockPositionsOfIR);


