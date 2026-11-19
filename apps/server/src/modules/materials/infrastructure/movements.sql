/* @name listMaterialMovements */
-- Libro de Materiales (MA-01d, ADR 0025). Del libro del inventario: ingresos, salidas y ajustes de materiales; un ajuste
-- que dejó una devolución dañada o perdida es una baja. De los vales: cada línea prestada (sale del estante) y cada
-- devolución en buen estado (vuelve), que apartan y liberan sin mover el saldo. Del más nuevo al más viejo, por
-- (at, id), con el periodo en la fecha civil del espacio; con :productId, solo ese material. Con :q, por material (nombre o código), referencia, vale
-- (P-0043 o 43) o persona, plegados y con `\`, `%` y `_` escapados como en el catálogo. Los nombres solo se muestran.
WITH search AS (
  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
),
movements AS (
  SELECT e.id::text AS id,
         CASE WHEN rl.id IS NOT NULL THEN 'writeoff' ELSE o.type END AS kind,
         o.effective_at AS at, e.position_id, e.quantity, ln.loan_id, o.reference,
         coalesce(d.requester_principal_id, o.requested_by_principal_id) AS person_id,
         o.actor_principal_id AS actor_id, d.purpose, rl.outcome,
         coalesce(rl.note, o.reason) AS detail
  FROM inventory.operations AS o
  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
  LEFT JOIN materials.issue_details AS d ON d.workspace_id = o.workspace_id AND d.operation_id = o.id
  LEFT JOIN materials.return_lines AS rl ON rl.workspace_id = o.workspace_id AND rl.operation_id = o.id
  LEFT JOIN materials.loan_lines AS ln ON ln.workspace_id = rl.workspace_id AND ln.id = rl.loan_line_id
  WHERE o.workspace_id = :workspaceId!
  UNION ALL
  SELECT ln.id::text, 'loan', l.lent_at, ln.position_id, -ln.quantity, l.id, NULL, NULL,
         l.lent_by_principal_id, NULL, NULL, l.notes
  FROM materials.loan_lines AS ln
  JOIN materials.loans AS l ON l.workspace_id = ln.workspace_id AND l.id = ln.loan_id
  WHERE ln.workspace_id = :workspaceId!
  UNION ALL
  SELECT rl.id::text, 'return', rl.returned_at, ln.position_id, rl.quantity, ln.loan_id, NULL, NULL,
         rl.returned_by_principal_id, NULL, NULL, rl.note
  FROM materials.return_lines AS rl
  JOIN materials.loan_lines AS ln ON ln.workspace_id = rl.workspace_id AND ln.id = rl.loan_line_id
  WHERE rl.workspace_id = :workspaceId! AND rl.outcome = 'good'
)
SELECT
  m.id AS "id!",
  m.kind AS "kind!",
  m.at AS "at!",
  m.at::text AS "cursor_at!",
  i.id AS product_id,
  i.code AS product_code,
  i.name AS product_name,
  prod.class AS product_class,
  i.base_unit AS unit,
  place.name AS place,
  lot.supplier_lot AS lot,
  trim_scale(m.quantity) AS "quantity!",
  CASE WHEN l.id IS NOT NULL THEN 'P-' || lpad(l.number::text, 4, '0') ELSE m.reference END AS reference,
  person.display_name AS "person?",
  actor.display_name AS "actor?",
  m.purpose,
  m.outcome,
  m.detail
FROM movements AS m
CROSS JOIN search
JOIN inventory.positions AS p ON p.workspace_id = :workspaceId! AND p.id = m.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'
JOIN materials.products AS prod ON prod.workspace_id = i.workspace_id AND prod.item_id = i.id
JOIN core.locations AS place ON place.workspace_id = p.workspace_id AND place.id = p.location_id
LEFT JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id
LEFT JOIN materials.loans AS l ON l.workspace_id = p.workspace_id AND l.id = m.loan_id
LEFT JOIN LATERAL (
  SELECT ident.display_name
  FROM core.principals AS pr
  JOIN core.memberships AS mb ON mb.workspace_id = pr.workspace_id AND mb.id = pr.membership_id
  JOIN core.identities AS ident ON ident.id = mb.identity_id
  WHERE pr.workspace_id = p.workspace_id AND pr.id = coalesce(m.person_id, l.borrower_principal_id)
) AS person ON true
LEFT JOIN LATERAL (
  SELECT ident.display_name
  FROM core.principals AS pr
  JOIN core.memberships AS mb ON mb.workspace_id = pr.workspace_id AND mb.id = pr.membership_id
  JOIN core.identities AS ident ON ident.id = mb.identity_id
  WHERE pr.workspace_id = p.workspace_id AND pr.id = m.actor_id
) AS actor ON true
WHERE (:kind::text IS NULL OR m.kind = :kind::text)
  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
  AND (:purpose::text IS NULL OR m.purpose = :purpose::text)
  AND (:from::date IS NULL OR m.at >= (:from::date)::timestamp AT TIME ZONE :timeZone!)
  AND (:to::date IS NULL OR m.at < (:to::date + 1)::timestamp AT TIME ZONE :timeZone!)
  AND (search.pattern IS NULL
       OR inventory.fold_text(i.name) LIKE search.pattern
       OR lower(i.code) LIKE search.pattern
       OR inventory.fold_text(m.reference) LIKE search.pattern
       OR l.number::text = nullif(ltrim(substring(lower(:q::text) FROM '^(?:p-?)?([0-9]+)$'), '0'), '')
       OR inventory.fold_text(person.display_name) LIKE search.pattern)
  AND (:beforeAt::timestamptz IS NULL OR (m.at, m.id) < (:beforeAt::timestamptz, :beforeId::text))
ORDER BY m.at DESC, m.id DESC
LIMIT :limit!;

/* @name materialName */
-- El nombre del material filtrado, para el encabezado del Excel.
SELECT code, name FROM inventory.items WHERE workspace_id = :workspaceId! AND id = :productId! AND kind = 'material';

/* @name stockPositionsOf */
-- Las existencias de hoy de esos materiales para el Excel del Inventario: cada ubicación y lote con saldo, primero lo que
-- vence antes (FEFO, MA-01f).
SELECT p.item_id, loc.name AS location_name, lot.supplier_lot, lot.expires_on::text AS expires_on,
       trim_scale(p.balance) AS "balance!", trim_scale(p.balance - p.reserved) AS "available!"
FROM inventory.positions AS p
JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id
WHERE p.workspace_id = :workspaceId! AND p.item_id = ANY (:itemIds!::uuid[]) AND p.balance > 0
ORDER BY p.item_id, lot.expires_on NULLS LAST, inventory.fold_text(loc.name), p.id;
