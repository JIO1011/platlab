/* Tablero del Resumen de Materiales (ADR 0025): solo lectura. Las cifras que cruzan materiales cuentan movimientos y
   vales, nunca suman cantidades (un material puede ir en g, mL o u). Solo se suman unidades por material. */

/* @name dashboardFigures */
-- Salidas, vales y bajas del periodo contra el periodo anterior de la misma duración.
WITH issues AS (
  SELECT DISTINCT o.id, o.effective_at
  FROM inventory.operations AS o
  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'
  WHERE o.workspace_id = :workspaceId! AND o.type = 'issue'
    AND o.effective_at >= now() - make_interval(days => :days! * 2)
)
SELECT
  (SELECT count(*) FROM issues WHERE effective_at >= now() - make_interval(days => :days!))::int AS "issues_current!",
  (SELECT count(*) FROM issues WHERE effective_at < now() - make_interval(days => :days!))::int AS "issues_previous!",
  (SELECT count(*) FROM materials.loans AS l
    WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!))::int AS "loans_current!",
  (SELECT count(*) FROM materials.loans AS l
    WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days! * 2)
      AND l.lent_at < now() - make_interval(days => :days!))::int AS "loans_previous!",
  (SELECT count(*) FROM materials.return_lines AS r
    WHERE r.workspace_id = :workspaceId! AND r.outcome <> 'good'
      AND r.returned_at >= now() - make_interval(days => :days!))::int AS "written_off_current!",
  (SELECT count(*) FROM materials.return_lines AS r
    WHERE r.workspace_id = :workspaceId! AND r.outcome <> 'good'
      AND r.returned_at >= now() - make_interval(days => :days! * 2)
      AND r.returned_at < now() - make_interval(days => :days!))::int AS "written_off_previous!";

/* @name dashboardWeekly */
-- Las últimas 8 semanas (lunes a domingo, en la fecha civil del espacio): ingresos, salidas y vales por semana.
WITH weeks AS (
  SELECT generate_series(
           date_trunc('week', now() AT TIME ZONE :timeZone!) - interval '49 days',
           date_trunc('week', now() AT TIME ZONE :timeZone!),
           interval '7 days')::date AS week
), moves AS (
  SELECT DISTINCT o.id, o.type, (o.effective_at AT TIME ZONE :timeZone!)::date AS day
  FROM inventory.operations AS o
  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'
  WHERE o.workspace_id = :workspaceId! AND o.type IN ('receipt', 'issue')
    AND o.effective_at >= now() - interval '60 days'
)
SELECT
  w.week::text AS "week!",
  (SELECT count(*) FROM moves AS m WHERE m.type = 'receipt' AND m.day >= w.week AND m.day < w.week + 7)::int AS "received!",
  (SELECT count(*) FROM moves AS m WHERE m.type = 'issue' AND m.day >= w.week AND m.day < w.week + 7)::int AS "issued!",
  (SELECT count(*) FROM materials.loans AS l
    WHERE l.workspace_id = :workspaceId!
      AND (l.lent_at AT TIME ZONE :timeZone!)::date >= w.week AND (l.lent_at AT TIME ZONE :timeZone!)::date < w.week + 7)::int AS "lent!"
FROM weeks AS w
ORDER BY w.week;

/* @name dashboardTopSupplies */
-- Los insumos con más salidas en el periodo; cada uno en su propia unidad.
SELECT i.id, i.name, i.base_unit,
       count(DISTINCT o.id)::int AS "events!",
       trim_scale(-sum(e.quantity)) AS "quantity!"
FROM inventory.operations AS o
JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'
JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'consumable'
WHERE o.workspace_id = :workspaceId! AND o.type = 'issue' AND o.effective_at >= now() - make_interval(days => :days!)
GROUP BY i.id, i.name, i.base_unit
ORDER BY count(DISTINCT o.id) DESC, lower(i.name), i.id
LIMIT 5;

/* @name dashboardTopReusables */
-- Los reutilizables más prestados en el periodo: unidades prestadas y en cuántos vales.
SELECT i.id, i.name, i.base_unit,
       count(DISTINCT l.id)::int AS "events!",
       trim_scale(sum(ll.quantity)) AS "quantity!"
FROM materials.loans AS l
JOIN materials.loan_lines AS ll ON ll.workspace_id = l.workspace_id AND ll.loan_id = l.id
JOIN inventory.positions AS p ON p.workspace_id = ll.workspace_id AND p.id = ll.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!)
GROUP BY i.id, i.name, i.base_unit
ORDER BY sum(ll.quantity) DESC, lower(i.name), i.id
LIMIT 5;

/* @name dashboardRunningLow */
-- Insumos que se acaban pronto: la existencia entre el consumo diario de los últimos 30 días, en días.
WITH used AS (
  SELECT p.item_id, -sum(e.quantity) AS total
  FROM inventory.operations AS o
  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
  -- Solo materiales: las salidas de reactivos del espacio no entran a la suma.
  JOIN inventory.items AS mi ON mi.workspace_id = p.workspace_id AND mi.id = p.item_id AND mi.kind = 'material'
  WHERE o.workspace_id = :workspaceId! AND o.type = 'issue' AND o.effective_at >= now() - interval '30 days'
  GROUP BY p.item_id
)
SELECT i.id, i.name, i.base_unit,
       trim_scale(stock.balance) AS "balance!",
       trim_scale(round(used.total / 30, 2)) AS "daily_use!",
       floor(stock.balance / (used.total / 30))::int AS "days_left!"
FROM inventory.items AS i
JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'consumable'
JOIN used ON used.item_id = i.id
CROSS JOIN LATERAL (
  SELECT coalesce(sum(p.balance), 0) AS balance
  FROM inventory.positions AS p
  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
) AS stock
WHERE i.workspace_id = :workspaceId! AND i.archived_at IS NULL AND used.total > 0
  AND floor(stock.balance / (used.total / 30)) <= 90
ORDER BY floor(stock.balance / (used.total / 30)), lower(i.name), i.id
LIMIT 5;

/* @name dashboardShelf */
-- Los reutilizables por cantidad: lo que hay en el estante frente a lo que posee el espacio (todos en piezas).
SELECT trim_scale(coalesce(sum(p.balance - p.reserved), 0)) AS "available!",
       trim_scale(coalesce(sum(p.balance), 0)) AS "total!"
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL
JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'reusable_counted'
WHERE p.workspace_id = :workspaceId!;

/* @name dashboardByClass */
SELECT m.class, count(*)::int AS "materials!"
FROM materials.products AS m
JOIN inventory.items AS i ON i.workspace_id = m.workspace_id AND i.id = m.item_id AND i.archived_at IS NULL
WHERE m.workspace_id = :workspaceId!
GROUP BY m.class;

/* @name dashboardBorrowers */
-- Quién presta más en el periodo: vales, unidades y el último.
SELECT borrower.display_name AS "name!",
       count(DISTINCT l.id)::int AS "loans!",
       trim_scale(sum(ll.quantity)) AS "units!",
       max(l.lent_at) AS "last_at!"
FROM materials.loans AS l
JOIN materials.loan_lines AS ll ON ll.workspace_id = l.workspace_id AND ll.loan_id = l.id
JOIN LATERAL (
  SELECT ident.display_name
  FROM core.principals AS pr
  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  JOIN core.identities AS ident ON ident.id = m.identity_id
  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id
) AS borrower ON true
WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!)
GROUP BY l.borrower_principal_id, borrower.display_name
ORDER BY count(DISTINCT l.id) DESC, sum(ll.quantity) DESC, borrower.display_name
LIMIT 5;

/* @name dashboardOverdue */
-- Los vales atrasados más antiguos, para «Hay que atender».
SELECT l.id, l.number, borrower.display_name AS "borrower_name!", l.due_on::text AS "due_on!"
FROM materials.loans AS l
JOIN LATERAL (
  SELECT ident.display_name
  FROM core.principals AS pr
  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  JOIN core.identities AS ident ON ident.id = m.identity_id
  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id
) AS borrower ON true
WHERE l.workspace_id = :workspaceId! AND l.status = 'open' AND l.due_on IS NOT NULL
  AND l.due_on < (now() AT TIME ZONE :timeZone!)::date
ORDER BY l.due_on, l.number
LIMIT 3;

/* @name dashboardBelowMinimum */
-- Los materiales más por debajo de su mínimo, para «Hay que atender».
SELECT i.id, i.name, i.base_unit,
       trim_scale(stock.balance) AS "balance!",
       trim_scale(i.minimum_quantity) AS "minimum!"
FROM inventory.items AS i
JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id
CROSS JOIN LATERAL (
  SELECT coalesce(sum(p.balance), 0) AS balance
  FROM inventory.positions AS p
  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
) AS stock
WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL
  AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity
ORDER BY stock.balance / i.minimum_quantity, lower(i.name), i.id
LIMIT 3;

/* @name dashboardExpiring */
-- Los lotes con saldo que vencen primero, vencidos incluidos, hasta :expiringBy, para «Hay que atender» (MA-01f).
SELECT i.id, i.name, i.base_unit,
       lot.supplier_lot AS lot,
       lot.expires_on::text AS "expires_on!",
       trim_scale(sum(p.balance)) AS "balance!"
FROM inventory.positions AS p
JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL
WHERE p.workspace_id = :workspaceId! AND p.balance > 0 AND lot.expires_on <= :expiringBy!::date
GROUP BY i.id, i.name, i.base_unit, lot.id, lot.supplier_lot, lot.expires_on
ORDER BY lot.expires_on, lower(i.name), lot.id
LIMIT 3;
