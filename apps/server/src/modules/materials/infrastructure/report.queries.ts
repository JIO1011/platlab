/** Types generated for queries found in "src/modules/materials/infrastructure/report.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'ListMaterialMovements' parameters type */
export interface IListMaterialMovementsParams {
  beforeAt?: DateOrString | null | void;
  beforeId?: string | null | void;
  from?: string | null | void;
  kind?: string | null | void;
  limit: NumberOrString;
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

const listMaterialMovementsIR: any = {"usedParamSet":{"q":true,"workspaceId":true,"kind":true,"purpose":true,"from":true,"timeZone":true,"to":true,"beforeAt":true,"beforeId":true,"limit":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":664,"b":665},{"a":4678,"b":4679}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1642,"b":1654},{"a":1956,"b":1968},{"a":2302,"b":2314},{"a":2954,"b":2966}]},{"name":"kind","required":false,"transform":{"type":"scalar"},"locs":[{"a":4146,"b":4150},{"a":4178,"b":4182}]},{"name":"purpose","required":false,"transform":{"type":"scalar"},"locs":[{"a":4198,"b":4205},{"a":4236,"b":4243}]},{"name":"from","required":false,"transform":{"type":"scalar"},"locs":[{"a":4259,"b":4263},{"a":4291,"b":4295}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":4328,"b":4337},{"a":4415,"b":4424}]},{"name":"to","required":false,"transform":{"type":"scalar"},"locs":[{"a":4347,"b":4349},{"a":4376,"b":4378}]},{"name":"beforeAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":4805,"b":4813},{"a":4855,"b":4863}]},{"name":"beforeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":4879,"b":4887}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":4933,"b":4939}]}],"statement":"-- Libro de Materiales (MA-01d, ADR 0025). Del libro del inventario: ingresos, salidas y ajustes de materiales; un ajuste\n-- que dejó una devolución dañada o perdida es una baja. De los vales: cada línea prestada (sale del estante) y cada\n-- devolución en buen estado (vuelve), que apartan y liberan sin mover el saldo. Del más nuevo al más viejo, por\n-- (at, id), con el periodo en la fecha civil del espacio. Con :q, por material (nombre o código), referencia, vale\n-- (P-0043 o 43) o persona, plegados y con `\\`, `%` y `_` escapados como en el catálogo. Los nombres solo se muestran.\nWITH search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n),\nmovements AS (\n  SELECT e.id::text AS id,\n         CASE WHEN rl.id IS NOT NULL THEN 'writeoff' ELSE o.type END AS kind,\n         o.effective_at AS at, e.position_id, e.quantity, ln.loan_id, o.reference,\n         coalesce(d.requester_principal_id, o.requested_by_principal_id) AS person_id,\n         o.actor_principal_id AS actor_id, d.purpose, rl.outcome,\n         coalesce(rl.note, o.reason) AS detail\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  LEFT JOIN materials.issue_details AS d ON d.workspace_id = o.workspace_id AND d.operation_id = o.id\n  LEFT JOIN materials.return_lines AS rl ON rl.workspace_id = o.workspace_id AND rl.operation_id = o.id\n  LEFT JOIN materials.loan_lines AS ln ON ln.workspace_id = rl.workspace_id AND ln.id = rl.loan_line_id\n  WHERE o.workspace_id = :workspaceId!\n  UNION ALL\n  SELECT ln.id::text, 'loan', l.lent_at, ln.position_id, -ln.quantity, l.id, NULL, NULL,\n         l.lent_by_principal_id, NULL, NULL, l.notes\n  FROM materials.loan_lines AS ln\n  JOIN materials.loans AS l ON l.workspace_id = ln.workspace_id AND l.id = ln.loan_id\n  WHERE ln.workspace_id = :workspaceId!\n  UNION ALL\n  SELECT rl.id::text, 'return', rl.returned_at, ln.position_id, rl.quantity, ln.loan_id, NULL, NULL,\n         rl.returned_by_principal_id, NULL, NULL, rl.note\n  FROM materials.return_lines AS rl\n  JOIN materials.loan_lines AS ln ON ln.workspace_id = rl.workspace_id AND ln.id = rl.loan_line_id\n  WHERE rl.workspace_id = :workspaceId! AND rl.outcome = 'good'\n)\nSELECT\n  m.id AS \"id!\",\n  m.kind AS \"kind!\",\n  m.at AS \"at!\",\n  m.at::text AS \"cursor_at!\",\n  i.id AS product_id,\n  i.code AS product_code,\n  i.name AS product_name,\n  prod.class AS product_class,\n  i.base_unit AS unit,\n  place.name AS place,\n  lot.supplier_lot AS lot,\n  trim_scale(m.quantity) AS \"quantity!\",\n  CASE WHEN l.id IS NOT NULL THEN 'P-' || lpad(l.number::text, 4, '0') ELSE m.reference END AS reference,\n  person.display_name AS \"person?\",\n  actor.display_name AS \"actor?\",\n  m.purpose,\n  m.outcome,\n  m.detail\nFROM movements AS m\nCROSS JOIN search\nJOIN inventory.positions AS p ON p.workspace_id = :workspaceId! AND p.id = m.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'\nJOIN materials.products AS prod ON prod.workspace_id = i.workspace_id AND prod.item_id = i.id\nJOIN core.locations AS place ON place.workspace_id = p.workspace_id AND place.id = p.location_id\nLEFT JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id\nLEFT JOIN materials.loans AS l ON l.workspace_id = p.workspace_id AND l.id = m.loan_id\nLEFT JOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS mb ON mb.workspace_id = pr.workspace_id AND mb.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = mb.identity_id\n  WHERE pr.workspace_id = p.workspace_id AND pr.id = coalesce(m.person_id, l.borrower_principal_id)\n) AS person ON true\nLEFT JOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS mb ON mb.workspace_id = pr.workspace_id AND mb.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = mb.identity_id\n  WHERE pr.workspace_id = p.workspace_id AND pr.id = m.actor_id\n) AS actor ON true\nWHERE (:kind::text IS NULL OR m.kind = :kind::text)\n  AND (:purpose::text IS NULL OR m.purpose = :purpose::text)\n  AND (:from::date IS NULL OR m.at >= (:from::date)::timestamp AT TIME ZONE :timeZone!)\n  AND (:to::date IS NULL OR m.at < (:to::date + 1)::timestamp AT TIME ZONE :timeZone!)\n  AND (search.pattern IS NULL\n       OR inventory.fold_text(i.name) LIKE search.pattern\n       OR lower(i.code) LIKE search.pattern\n       OR inventory.fold_text(m.reference) LIKE search.pattern\n       OR l.number::text = nullif(ltrim(substring(lower(:q::text) FROM '^(?:p-?)?([0-9]+)$'), '0'), '')\n       OR inventory.fold_text(person.display_name) LIKE search.pattern)\n  AND (:beforeAt::timestamptz IS NULL OR (m.at, m.id) < (:beforeAt::timestamptz, :beforeId::text))\nORDER BY m.at DESC, m.id DESC\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Libro de Materiales (MA-01d, ADR 0025). Del libro del inventario: ingresos, salidas y ajustes de materiales; un ajuste
 * -- que dejó una devolución dañada o perdida es una baja. De los vales: cada línea prestada (sale del estante) y cada
 * -- devolución en buen estado (vuelve), que apartan y liberan sin mover el saldo. Del más nuevo al más viejo, por
 * -- (at, id), con el periodo en la fecha civil del espacio. Con :q, por material (nombre o código), referencia, vale
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


/** 'MaterialsReport' parameters type */
export interface IMaterialsReportParams {
  expiringBy: string;
  workspaceId: string;
}

/** 'MaterialsReport' return type */
export interface IMaterialsReportResult {
  below_minimum: number;
  consumables: number;
  empty: number;
  expiring: number;
  lent: string;
  on_shelf: string;
  reusables: number;
  written_off: string;
}

/** 'MaterialsReport' query type */
export interface IMaterialsReportQuery {
  params: IMaterialsReportParams;
  result: IMaterialsReportResult;
}

const materialsReportIR: any = {"usedParamSet":{"expiringBy":true,"workspaceId":true},"params":[{"name":"expiringBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":500,"b":511}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":875,"b":887},{"a":1764,"b":1776}]}],"statement":"-- El estado por clase (MA-01d), hoy: insumos activos, bajo su mínimo, con un lote por vencer hasta :expiringBy (vencidos\n-- incluidos) y agotados; reutilizables por cantidad activos, sus piezas en el estante y prestadas, y las dadas de baja\n-- por daño o pérdida desde el inicio.\nWITH stock AS (\n  SELECT prod.class, i.minimum_quantity,\n         coalesce(sum(p.balance), 0) AS balance,\n         coalesce(sum(p.reserved), 0) AS reserved,\n         coalesce(bool_or(p.balance > 0 AND lot.expires_on <= :expiringBy!::date), false) AS expiring\n  FROM inventory.items AS i\n  JOIN materials.products AS prod ON prod.workspace_id = i.workspace_id AND prod.item_id = i.id\n  LEFT JOIN inventory.positions AS p ON p.workspace_id = i.workspace_id AND p.item_id = i.id\n  LEFT JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id\n  WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL\n  GROUP BY i.id, prod.class, i.minimum_quantity\n)\nSELECT\n  count(*) FILTER (WHERE class = 'consumable')::int AS \"consumables!\",\n  count(*) FILTER (WHERE class = 'consumable' AND minimum_quantity IS NOT NULL AND balance < minimum_quantity)::int AS \"below_minimum!\",\n  count(*) FILTER (WHERE class = 'consumable' AND expiring)::int AS \"expiring!\",\n  count(*) FILTER (WHERE class = 'consumable' AND balance = 0)::int AS \"empty!\",\n  count(*) FILTER (WHERE class = 'reusable_counted')::int AS \"reusables!\",\n  trim_scale(coalesce(sum(balance - reserved) FILTER (WHERE class = 'reusable_counted'), 0)) AS \"on_shelf!\",\n  trim_scale(coalesce(sum(reserved) FILTER (WHERE class = 'reusable_counted'), 0)) AS \"lent!\",\n  (SELECT trim_scale(coalesce(sum(rl.quantity), 0))\n     FROM materials.return_lines AS rl\n    WHERE rl.workspace_id = :workspaceId! AND rl.outcome <> 'good') AS \"written_off!\"\nFROM stock"};

/**
 * Query generated from SQL:
 * ```
 * -- El estado por clase (MA-01d), hoy: insumos activos, bajo su mínimo, con un lote por vencer hasta :expiringBy (vencidos
 * -- incluidos) y agotados; reutilizables por cantidad activos, sus piezas en el estante y prestadas, y las dadas de baja
 * -- por daño o pérdida desde el inicio.
 * WITH stock AS (
 *   SELECT prod.class, i.minimum_quantity,
 *          coalesce(sum(p.balance), 0) AS balance,
 *          coalesce(sum(p.reserved), 0) AS reserved,
 *          coalesce(bool_or(p.balance > 0 AND lot.expires_on <= :expiringBy!::date), false) AS expiring
 *   FROM inventory.items AS i
 *   JOIN materials.products AS prod ON prod.workspace_id = i.workspace_id AND prod.item_id = i.id
 *   LEFT JOIN inventory.positions AS p ON p.workspace_id = i.workspace_id AND p.item_id = i.id
 *   LEFT JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id
 *   WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL
 *   GROUP BY i.id, prod.class, i.minimum_quantity
 * )
 * SELECT
 *   count(*) FILTER (WHERE class = 'consumable')::int AS "consumables!",
 *   count(*) FILTER (WHERE class = 'consumable' AND minimum_quantity IS NOT NULL AND balance < minimum_quantity)::int AS "below_minimum!",
 *   count(*) FILTER (WHERE class = 'consumable' AND expiring)::int AS "expiring!",
 *   count(*) FILTER (WHERE class = 'consumable' AND balance = 0)::int AS "empty!",
 *   count(*) FILTER (WHERE class = 'reusable_counted')::int AS "reusables!",
 *   trim_scale(coalesce(sum(balance - reserved) FILTER (WHERE class = 'reusable_counted'), 0)) AS "on_shelf!",
 *   trim_scale(coalesce(sum(reserved) FILTER (WHERE class = 'reusable_counted'), 0)) AS "lent!",
 *   (SELECT trim_scale(coalesce(sum(rl.quantity), 0))
 *      FROM materials.return_lines AS rl
 *     WHERE rl.workspace_id = :workspaceId! AND rl.outcome <> 'good') AS "written_off!"
 * FROM stock
 * ```
 */
export const materialsReport = new PreparedQuery<IMaterialsReportParams,IMaterialsReportResult>(materialsReportIR);


