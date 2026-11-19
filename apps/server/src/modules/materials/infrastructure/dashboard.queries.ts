/** Types generated for queries found in "src/modules/materials/infrastructure/dashboard.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'DashboardFigures' parameters type */
export interface IDashboardFiguresParams {
  days: number;
  workspaceId: string;
}

/** 'DashboardFigures' return type */
export interface IDashboardFiguresResult {
  issues_current: number;
  issues_previous: number;
  loans_current: number;
  loans_previous: number;
  written_off_current: number;
  written_off_previous: number;
}

/** 'DashboardFigures' query type */
export interface IDashboardFiguresQuery {
  params: IDashboardFiguresParams;
  result: IDashboardFiguresResult;
}

const dashboardFiguresIR: any = {"usedParamSet":{"workspaceId":true,"days":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":492,"b":504},{"a":914,"b":926},{"a":1082,"b":1094},{"a":1322,"b":1334},{"a":1537,"b":1549}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":583,"b":588},{"a":687,"b":692},{"a":805,"b":810},{"a":975,"b":980},{"a":1143,"b":1148},{"a":1207,"b":1212},{"a":1417,"b":1422},{"a":1632,"b":1637},{"a":1700,"b":1705}]}],"statement":"-- Salidas, vales y bajas del periodo contra el periodo anterior de la misma duración.\nWITH issues AS (\n  SELECT DISTINCT o.id, o.effective_at\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'\n  WHERE o.workspace_id = :workspaceId! AND o.type = 'issue'\n    AND o.effective_at >= now() - make_interval(days => :days! * 2)\n)\nSELECT\n  (SELECT count(*) FROM issues WHERE effective_at >= now() - make_interval(days => :days!))::int AS \"issues_current!\",\n  (SELECT count(*) FROM issues WHERE effective_at < now() - make_interval(days => :days!))::int AS \"issues_previous!\",\n  (SELECT count(*) FROM materials.loans AS l\n    WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!))::int AS \"loans_current!\",\n  (SELECT count(*) FROM materials.loans AS l\n    WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days! * 2)\n      AND l.lent_at < now() - make_interval(days => :days!))::int AS \"loans_previous!\",\n  (SELECT count(*) FROM materials.return_lines AS r\n    WHERE r.workspace_id = :workspaceId! AND r.outcome <> 'good'\n      AND r.returned_at >= now() - make_interval(days => :days!))::int AS \"written_off_current!\",\n  (SELECT count(*) FROM materials.return_lines AS r\n    WHERE r.workspace_id = :workspaceId! AND r.outcome <> 'good'\n      AND r.returned_at >= now() - make_interval(days => :days! * 2)\n      AND r.returned_at < now() - make_interval(days => :days!))::int AS \"written_off_previous!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Salidas, vales y bajas del periodo contra el periodo anterior de la misma duración.
 * WITH issues AS (
 *   SELECT DISTINCT o.id, o.effective_at
 *   FROM inventory.operations AS o
 *   JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 *   JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 *   JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'
 *   WHERE o.workspace_id = :workspaceId! AND o.type = 'issue'
 *     AND o.effective_at >= now() - make_interval(days => :days! * 2)
 * )
 * SELECT
 *   (SELECT count(*) FROM issues WHERE effective_at >= now() - make_interval(days => :days!))::int AS "issues_current!",
 *   (SELECT count(*) FROM issues WHERE effective_at < now() - make_interval(days => :days!))::int AS "issues_previous!",
 *   (SELECT count(*) FROM materials.loans AS l
 *     WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!))::int AS "loans_current!",
 *   (SELECT count(*) FROM materials.loans AS l
 *     WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days! * 2)
 *       AND l.lent_at < now() - make_interval(days => :days!))::int AS "loans_previous!",
 *   (SELECT count(*) FROM materials.return_lines AS r
 *     WHERE r.workspace_id = :workspaceId! AND r.outcome <> 'good'
 *       AND r.returned_at >= now() - make_interval(days => :days!))::int AS "written_off_current!",
 *   (SELECT count(*) FROM materials.return_lines AS r
 *     WHERE r.workspace_id = :workspaceId! AND r.outcome <> 'good'
 *       AND r.returned_at >= now() - make_interval(days => :days! * 2)
 *       AND r.returned_at < now() - make_interval(days => :days!))::int AS "written_off_previous!"
 * ```
 */
export const dashboardFigures = new PreparedQuery<IDashboardFiguresParams,IDashboardFiguresResult>(dashboardFiguresIR);


/** 'DashboardWeekly' parameters type */
export interface IDashboardWeeklyParams {
  timeZone: string;
  workspaceId: string;
}

/** 'DashboardWeekly' return type */
export interface IDashboardWeeklyResult {
  issued: number;
  lent: number;
  received: number;
  week: string;
}

/** 'DashboardWeekly' query type */
export interface IDashboardWeeklyQuery {
  params: IDashboardWeeklyParams;
  result: IDashboardWeeklyResult;
}

const dashboardWeeklyIR: any = {"usedParamSet":{"timeZone":true,"workspaceId":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":204,"b":213},{"a":287,"b":296},{"a":419,"b":428},{"a":1297,"b":1306},{"a":1353,"b":1362}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":793,"b":805},{"a":1249,"b":1261}]}],"statement":"-- Las últimas 8 semanas (lunes a domingo, en la fecha civil del espacio): ingresos, salidas y vales por semana.\nWITH weeks AS (\n  SELECT generate_series(\n           date_trunc('week', now() AT TIME ZONE :timeZone!) - interval '49 days',\n           date_trunc('week', now() AT TIME ZONE :timeZone!),\n           interval '7 days')::date AS week\n), moves AS (\n  SELECT DISTINCT o.id, o.type, (o.effective_at AT TIME ZONE :timeZone!)::date AS day\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'\n  WHERE o.workspace_id = :workspaceId! AND o.type IN ('receipt', 'issue')\n    AND o.effective_at >= now() - interval '60 days'\n)\nSELECT\n  w.week::text AS \"week!\",\n  (SELECT count(*) FROM moves AS m WHERE m.type = 'receipt' AND m.day >= w.week AND m.day < w.week + 7)::int AS \"received!\",\n  (SELECT count(*) FROM moves AS m WHERE m.type = 'issue' AND m.day >= w.week AND m.day < w.week + 7)::int AS \"issued!\",\n  (SELECT count(*) FROM materials.loans AS l\n    WHERE l.workspace_id = :workspaceId!\n      AND (l.lent_at AT TIME ZONE :timeZone!)::date >= w.week AND (l.lent_at AT TIME ZONE :timeZone!)::date < w.week + 7)::int AS \"lent!\"\nFROM weeks AS w\nORDER BY w.week"};

/**
 * Query generated from SQL:
 * ```
 * -- Las últimas 8 semanas (lunes a domingo, en la fecha civil del espacio): ingresos, salidas y vales por semana.
 * WITH weeks AS (
 *   SELECT generate_series(
 *            date_trunc('week', now() AT TIME ZONE :timeZone!) - interval '49 days',
 *            date_trunc('week', now() AT TIME ZONE :timeZone!),
 *            interval '7 days')::date AS week
 * ), moves AS (
 *   SELECT DISTINCT o.id, o.type, (o.effective_at AT TIME ZONE :timeZone!)::date AS day
 *   FROM inventory.operations AS o
 *   JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 *   JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 *   JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'
 *   WHERE o.workspace_id = :workspaceId! AND o.type IN ('receipt', 'issue')
 *     AND o.effective_at >= now() - interval '60 days'
 * )
 * SELECT
 *   w.week::text AS "week!",
 *   (SELECT count(*) FROM moves AS m WHERE m.type = 'receipt' AND m.day >= w.week AND m.day < w.week + 7)::int AS "received!",
 *   (SELECT count(*) FROM moves AS m WHERE m.type = 'issue' AND m.day >= w.week AND m.day < w.week + 7)::int AS "issued!",
 *   (SELECT count(*) FROM materials.loans AS l
 *     WHERE l.workspace_id = :workspaceId!
 *       AND (l.lent_at AT TIME ZONE :timeZone!)::date >= w.week AND (l.lent_at AT TIME ZONE :timeZone!)::date < w.week + 7)::int AS "lent!"
 * FROM weeks AS w
 * ORDER BY w.week
 * ```
 */
export const dashboardWeekly = new PreparedQuery<IDashboardWeeklyParams,IDashboardWeeklyResult>(dashboardWeeklyIR);


/** 'DashboardTopSupplies' parameters type */
export interface IDashboardTopSuppliesParams {
  days: number;
  workspaceId: string;
}

/** 'DashboardTopSupplies' return type */
export interface IDashboardTopSuppliesResult {
  base_unit: string;
  events: number;
  id: string;
  name: string;
  quantity: string;
}

/** 'DashboardTopSupplies' query type */
export interface IDashboardTopSuppliesQuery {
  params: IDashboardTopSuppliesParams;
  result: IDashboardTopSuppliesResult;
}

const dashboardTopSuppliesIR: any = {"usedParamSet":{"workspaceId":true,"days":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":659,"b":671}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":746,"b":751}]}],"statement":"-- Los insumos con más salidas en el periodo; cada uno en su propia unidad.\nSELECT i.id, i.name, i.base_unit,\n       count(DISTINCT o.id)::int AS \"events!\",\n       trim_scale(-sum(e.quantity)) AS \"quantity!\"\nFROM inventory.operations AS o\nJOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\nJOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'\nJOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'consumable'\nWHERE o.workspace_id = :workspaceId! AND o.type = 'issue' AND o.effective_at >= now() - make_interval(days => :days!)\nGROUP BY i.id, i.name, i.base_unit\nORDER BY count(DISTINCT o.id) DESC, lower(i.name), i.id\nLIMIT 5"};

/**
 * Query generated from SQL:
 * ```
 * -- Los insumos con más salidas en el periodo; cada uno en su propia unidad.
 * SELECT i.id, i.name, i.base_unit,
 *        count(DISTINCT o.id)::int AS "events!",
 *        trim_scale(-sum(e.quantity)) AS "quantity!"
 * FROM inventory.operations AS o
 * JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 * JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material'
 * JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'consumable'
 * WHERE o.workspace_id = :workspaceId! AND o.type = 'issue' AND o.effective_at >= now() - make_interval(days => :days!)
 * GROUP BY i.id, i.name, i.base_unit
 * ORDER BY count(DISTINCT o.id) DESC, lower(i.name), i.id
 * LIMIT 5
 * ```
 */
export const dashboardTopSupplies = new PreparedQuery<IDashboardTopSuppliesParams,IDashboardTopSuppliesResult>(dashboardTopSuppliesIR);


/** 'DashboardTopReusables' parameters type */
export interface IDashboardTopReusablesParams {
  days: number;
  workspaceId: string;
}

/** 'DashboardTopReusables' return type */
export interface IDashboardTopReusablesResult {
  base_unit: string;
  events: number;
  id: string;
  name: string;
  quantity: string;
}

/** 'DashboardTopReusables' query type */
export interface IDashboardTopReusablesQuery {
  params: IDashboardTopReusablesParams;
  result: IDashboardTopReusablesResult;
}

const dashboardTopReusablesIR: any = {"usedParamSet":{"workspaceId":true,"days":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":534,"b":546}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":595,"b":600}]}],"statement":"-- Los reutilizables más prestados en el periodo: unidades prestadas y en cuántos vales.\nSELECT i.id, i.name, i.base_unit,\n       count(DISTINCT l.id)::int AS \"events!\",\n       trim_scale(sum(ll.quantity)) AS \"quantity!\"\nFROM materials.loans AS l\nJOIN materials.loan_lines AS ll ON ll.workspace_id = l.workspace_id AND ll.loan_id = l.id\nJOIN inventory.positions AS p ON p.workspace_id = ll.workspace_id AND p.id = ll.position_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nWHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!)\nGROUP BY i.id, i.name, i.base_unit\nORDER BY sum(ll.quantity) DESC, lower(i.name), i.id\nLIMIT 5"};

/**
 * Query generated from SQL:
 * ```
 * -- Los reutilizables más prestados en el periodo: unidades prestadas y en cuántos vales.
 * SELECT i.id, i.name, i.base_unit,
 *        count(DISTINCT l.id)::int AS "events!",
 *        trim_scale(sum(ll.quantity)) AS "quantity!"
 * FROM materials.loans AS l
 * JOIN materials.loan_lines AS ll ON ll.workspace_id = l.workspace_id AND ll.loan_id = l.id
 * JOIN inventory.positions AS p ON p.workspace_id = ll.workspace_id AND p.id = ll.position_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!)
 * GROUP BY i.id, i.name, i.base_unit
 * ORDER BY sum(ll.quantity) DESC, lower(i.name), i.id
 * LIMIT 5
 * ```
 */
export const dashboardTopReusables = new PreparedQuery<IDashboardTopReusablesParams,IDashboardTopReusablesResult>(dashboardTopReusablesIR);


/** 'DashboardRunningLow' parameters type */
export interface IDashboardRunningLowParams {
  workspaceId: string;
}

/** 'DashboardRunningLow' return type */
export interface IDashboardRunningLowResult {
  balance: string;
  base_unit: string;
  daily_use: string;
  days_left: number;
  id: string;
  name: string;
}

/** 'DashboardRunningLow' query type */
export interface IDashboardRunningLowQuery {
  params: IDashboardRunningLowParams;
  result: IDashboardRunningLowResult;
}

const dashboardRunningLowIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":598,"b":610},{"a":1285,"b":1297}]}],"statement":"-- Insumos que se acaban pronto: la existencia entre el consumo diario de los últimos 30 días, en días.\nWITH used AS (\n  SELECT p.item_id, -sum(e.quantity) AS total\n  FROM inventory.operations AS o\n  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id\n  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id\n  -- Solo materiales: las salidas de reactivos del espacio no entran a la suma.\n  JOIN inventory.items AS mi ON mi.workspace_id = p.workspace_id AND mi.id = p.item_id AND mi.kind = 'material'\n  WHERE o.workspace_id = :workspaceId! AND o.type = 'issue' AND o.effective_at >= now() - interval '30 days'\n  GROUP BY p.item_id\n)\nSELECT i.id, i.name, i.base_unit,\n       trim_scale(stock.balance) AS \"balance!\",\n       trim_scale(round(used.total / 30, 2)) AS \"daily_use!\",\n       floor(stock.balance / (used.total / 30))::int AS \"days_left!\"\nFROM inventory.items AS i\nJOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'consumable'\nJOIN used ON used.item_id = i.id\nCROSS JOIN LATERAL (\n  SELECT coalesce(sum(p.balance), 0) AS balance\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id\n) AS stock\nWHERE i.workspace_id = :workspaceId! AND i.archived_at IS NULL AND used.total > 0\n  AND floor(stock.balance / (used.total / 30)) <= 90\nORDER BY floor(stock.balance / (used.total / 30)), lower(i.name), i.id\nLIMIT 5"};

/**
 * Query generated from SQL:
 * ```
 * -- Insumos que se acaban pronto: la existencia entre el consumo diario de los últimos 30 días, en días.
 * WITH used AS (
 *   SELECT p.item_id, -sum(e.quantity) AS total
 *   FROM inventory.operations AS o
 *   JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
 *   JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
 *   -- Solo materiales: las salidas de reactivos del espacio no entran a la suma.
 *   JOIN inventory.items AS mi ON mi.workspace_id = p.workspace_id AND mi.id = p.item_id AND mi.kind = 'material'
 *   WHERE o.workspace_id = :workspaceId! AND o.type = 'issue' AND o.effective_at >= now() - interval '30 days'
 *   GROUP BY p.item_id
 * )
 * SELECT i.id, i.name, i.base_unit,
 *        trim_scale(stock.balance) AS "balance!",
 *        trim_scale(round(used.total / 30, 2)) AS "daily_use!",
 *        floor(stock.balance / (used.total / 30))::int AS "days_left!"
 * FROM inventory.items AS i
 * JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'consumable'
 * JOIN used ON used.item_id = i.id
 * CROSS JOIN LATERAL (
 *   SELECT coalesce(sum(p.balance), 0) AS balance
 *   FROM inventory.positions AS p
 *   WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
 * ) AS stock
 * WHERE i.workspace_id = :workspaceId! AND i.archived_at IS NULL AND used.total > 0
 *   AND floor(stock.balance / (used.total / 30)) <= 90
 * ORDER BY floor(stock.balance / (used.total / 30)), lower(i.name), i.id
 * LIMIT 5
 * ```
 */
export const dashboardRunningLow = new PreparedQuery<IDashboardRunningLowParams,IDashboardRunningLowResult>(dashboardRunningLowIR);


/** 'DashboardShelf' parameters type */
export interface IDashboardShelfParams {
  workspaceId: string;
}

/** 'DashboardShelf' return type */
export interface IDashboardShelfResult {
  available: string;
  total: string;
}

/** 'DashboardShelf' query type */
export interface IDashboardShelfQuery {
  params: IDashboardShelfParams;
  result: IDashboardShelfResult;
}

const dashboardShelfIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":551,"b":563}]}],"statement":"-- Los reutilizables por cantidad: lo que hay en el estante frente a lo que posee el espacio (todos en piezas).\nSELECT trim_scale(coalesce(sum(p.balance - p.reserved), 0)) AS \"available!\",\n       trim_scale(coalesce(sum(p.balance), 0)) AS \"total!\"\nFROM inventory.positions AS p\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL\nJOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'reusable_counted'\nWHERE p.workspace_id = :workspaceId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Los reutilizables por cantidad: lo que hay en el estante frente a lo que posee el espacio (todos en piezas).
 * SELECT trim_scale(coalesce(sum(p.balance - p.reserved), 0)) AS "available!",
 *        trim_scale(coalesce(sum(p.balance), 0)) AS "total!"
 * FROM inventory.positions AS p
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL
 * JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id AND m.class = 'reusable_counted'
 * WHERE p.workspace_id = :workspaceId!
 * ```
 */
export const dashboardShelf = new PreparedQuery<IDashboardShelfParams,IDashboardShelfResult>(dashboardShelfIR);


/** 'DashboardByClass' parameters type */
export interface IDashboardByClassParams {
  workspaceId: string;
}

/** 'DashboardByClass' return type */
export interface IDashboardByClassResult {
  class: string;
  materials: number;
}

/** 'DashboardByClass' query type */
export interface IDashboardByClassQuery {
  params: IDashboardByClassParams;
  result: IDashboardByClassResult;
}

const dashboardByClassIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":206,"b":218}]}],"statement":"SELECT m.class, count(*)::int AS \"materials!\"\nFROM materials.products AS m\nJOIN inventory.items AS i ON i.workspace_id = m.workspace_id AND i.id = m.item_id AND i.archived_at IS NULL\nWHERE m.workspace_id = :workspaceId!\nGROUP BY m.class"};

/**
 * Query generated from SQL:
 * ```
 * SELECT m.class, count(*)::int AS "materials!"
 * FROM materials.products AS m
 * JOIN inventory.items AS i ON i.workspace_id = m.workspace_id AND i.id = m.item_id AND i.archived_at IS NULL
 * WHERE m.workspace_id = :workspaceId!
 * GROUP BY m.class
 * ```
 */
export const dashboardByClass = new PreparedQuery<IDashboardByClassParams,IDashboardByClassResult>(dashboardByClassIR);


/** 'DashboardBorrowers' parameters type */
export interface IDashboardBorrowersParams {
  days: number;
  workspaceId: string;
}

/** 'DashboardBorrowers' return type */
export interface IDashboardBorrowersResult {
  last_at: Date;
  loans: number;
  name: string;
  units: string;
}

/** 'DashboardBorrowers' query type */
export interface IDashboardBorrowersQuery {
  params: IDashboardBorrowersParams;
  result: IDashboardBorrowersResult;
}

const dashboardBorrowersIR: any = {"usedParamSet":{"workspaceId":true,"days":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":699,"b":711}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":760,"b":765}]}],"statement":"-- Quién presta más en el periodo: vales, unidades y el último.\nSELECT borrower.display_name AS \"name!\",\n       count(DISTINCT l.id)::int AS \"loans!\",\n       trim_scale(sum(ll.quantity)) AS \"units!\",\n       max(l.lent_at) AS \"last_at!\"\nFROM materials.loans AS l\nJOIN materials.loan_lines AS ll ON ll.workspace_id = l.workspace_id AND ll.loan_id = l.id\nJOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = m.identity_id\n  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id\n) AS borrower ON true\nWHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!)\nGROUP BY l.borrower_principal_id, borrower.display_name\nORDER BY count(DISTINCT l.id) DESC, sum(ll.quantity) DESC, borrower.display_name\nLIMIT 5"};

/**
 * Query generated from SQL:
 * ```
 * -- Quién presta más en el periodo: vales, unidades y el último.
 * SELECT borrower.display_name AS "name!",
 *        count(DISTINCT l.id)::int AS "loans!",
 *        trim_scale(sum(ll.quantity)) AS "units!",
 *        max(l.lent_at) AS "last_at!"
 * FROM materials.loans AS l
 * JOIN materials.loan_lines AS ll ON ll.workspace_id = l.workspace_id AND ll.loan_id = l.id
 * JOIN LATERAL (
 *   SELECT ident.display_name
 *   FROM core.principals AS pr
 *   JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   JOIN core.identities AS ident ON ident.id = m.identity_id
 *   WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id
 * ) AS borrower ON true
 * WHERE l.workspace_id = :workspaceId! AND l.lent_at >= now() - make_interval(days => :days!)
 * GROUP BY l.borrower_principal_id, borrower.display_name
 * ORDER BY count(DISTINCT l.id) DESC, sum(ll.quantity) DESC, borrower.display_name
 * LIMIT 5
 * ```
 */
export const dashboardBorrowers = new PreparedQuery<IDashboardBorrowersParams,IDashboardBorrowersResult>(dashboardBorrowersIR);


/** 'DashboardOverdue' parameters type */
export interface IDashboardOverdueParams {
  timeZone: string;
  workspaceId: string;
}

/** 'DashboardOverdue' return type */
export interface IDashboardOverdueResult {
  borrower_name: string;
  due_on: string;
  id: string;
  number: number;
}

/** 'DashboardOverdue' query type */
export interface IDashboardOverdueQuery {
  params: IDashboardOverdueParams;
  result: IDashboardOverdueResult;
}

const dashboardOverdueIR: any = {"usedParamSet":{"workspaceId":true,"timeZone":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":528,"b":540}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":626,"b":635}]}],"statement":"-- Los vales atrasados más antiguos, para «Hay que atender».\nSELECT l.id, l.number, borrower.display_name AS \"borrower_name!\", l.due_on::text AS \"due_on!\"\nFROM materials.loans AS l\nJOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = m.identity_id\n  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id\n) AS borrower ON true\nWHERE l.workspace_id = :workspaceId! AND l.status = 'open' AND l.due_on IS NOT NULL\n  AND l.due_on < (now() AT TIME ZONE :timeZone!)::date\nORDER BY l.due_on, l.number\nLIMIT 3"};

/**
 * Query generated from SQL:
 * ```
 * -- Los vales atrasados más antiguos, para «Hay que atender».
 * SELECT l.id, l.number, borrower.display_name AS "borrower_name!", l.due_on::text AS "due_on!"
 * FROM materials.loans AS l
 * JOIN LATERAL (
 *   SELECT ident.display_name
 *   FROM core.principals AS pr
 *   JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   JOIN core.identities AS ident ON ident.id = m.identity_id
 *   WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id
 * ) AS borrower ON true
 * WHERE l.workspace_id = :workspaceId! AND l.status = 'open' AND l.due_on IS NOT NULL
 *   AND l.due_on < (now() AT TIME ZONE :timeZone!)::date
 * ORDER BY l.due_on, l.number
 * LIMIT 3
 * ```
 */
export const dashboardOverdue = new PreparedQuery<IDashboardOverdueParams,IDashboardOverdueResult>(dashboardOverdueIR);


/** 'DashboardBelowMinimum' parameters type */
export interface IDashboardBelowMinimumParams {
  workspaceId: string;
}

/** 'DashboardBelowMinimum' return type */
export interface IDashboardBelowMinimumResult {
  balance: string;
  base_unit: string;
  id: string;
  minimum: string;
  name: string;
}

/** 'DashboardBelowMinimum' query type */
export interface IDashboardBelowMinimumQuery {
  params: IDashboardBelowMinimumParams;
  result: IDashboardBelowMinimumResult;
}

const dashboardBelowMinimumIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":512,"b":524}]}],"statement":"-- Los materiales más por debajo de su mínimo, para «Hay que atender».\nSELECT i.id, i.name, i.base_unit,\n       trim_scale(stock.balance) AS \"balance!\",\n       trim_scale(i.minimum_quantity) AS \"minimum!\"\nFROM inventory.items AS i\nJOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id\nCROSS JOIN LATERAL (\n  SELECT coalesce(sum(p.balance), 0) AS balance\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id\n) AS stock\nWHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL\n  AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity\nORDER BY stock.balance / i.minimum_quantity, lower(i.name), i.id\nLIMIT 3"};

/**
 * Query generated from SQL:
 * ```
 * -- Los materiales más por debajo de su mínimo, para «Hay que atender».
 * SELECT i.id, i.name, i.base_unit,
 *        trim_scale(stock.balance) AS "balance!",
 *        trim_scale(i.minimum_quantity) AS "minimum!"
 * FROM inventory.items AS i
 * JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id
 * CROSS JOIN LATERAL (
 *   SELECT coalesce(sum(p.balance), 0) AS balance
 *   FROM inventory.positions AS p
 *   WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
 * ) AS stock
 * WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL
 *   AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity
 * ORDER BY stock.balance / i.minimum_quantity, lower(i.name), i.id
 * LIMIT 3
 * ```
 */
export const dashboardBelowMinimum = new PreparedQuery<IDashboardBelowMinimumParams,IDashboardBelowMinimumResult>(dashboardBelowMinimumIR);


/** 'DashboardExpiring' parameters type */
export interface IDashboardExpiringParams {
  expiringBy: string;
  workspaceId: string;
}

/** 'DashboardExpiring' return type */
export interface IDashboardExpiringResult {
  balance: string;
  base_unit: string;
  expires_on: string;
  id: string;
  lot: string | null;
  name: string;
}

/** 'DashboardExpiring' query type */
export interface IDashboardExpiringQuery {
  params: IDashboardExpiringParams;
  result: IDashboardExpiringResult;
}

const dashboardExpiringIR: any = {"usedParamSet":{"workspaceId":true,"expiringBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":546,"b":558}]},{"name":"expiringBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":600,"b":611}]}],"statement":"-- Los lotes con saldo que vencen primero, vencidos incluidos, hasta :expiringBy, para «Hay que atender» (MA-01f).\nSELECT i.id, i.name, i.base_unit,\n       lot.supplier_lot AS lot,\n       lot.expires_on::text AS \"expires_on!\",\n       trim_scale(sum(p.balance)) AS \"balance!\"\nFROM inventory.positions AS p\nJOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL\nWHERE p.workspace_id = :workspaceId! AND p.balance > 0 AND lot.expires_on <= :expiringBy!::date\nGROUP BY i.id, i.name, i.base_unit, lot.id, lot.supplier_lot, lot.expires_on\nORDER BY lot.expires_on, lower(i.name), lot.id\nLIMIT 3"};

/**
 * Query generated from SQL:
 * ```
 * -- Los lotes con saldo que vencen primero, vencidos incluidos, hasta :expiringBy, para «Hay que atender» (MA-01f).
 * SELECT i.id, i.name, i.base_unit,
 *        lot.supplier_lot AS lot,
 *        lot.expires_on::text AS "expires_on!",
 *        trim_scale(sum(p.balance)) AS "balance!"
 * FROM inventory.positions AS p
 * JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL
 * WHERE p.workspace_id = :workspaceId! AND p.balance > 0 AND lot.expires_on <= :expiringBy!::date
 * GROUP BY i.id, i.name, i.base_unit, lot.id, lot.supplier_lot, lot.expires_on
 * ORDER BY lot.expires_on, lower(i.name), lot.id
 * LIMIT 3
 * ```
 */
export const dashboardExpiring = new PreparedQuery<IDashboardExpiringParams,IDashboardExpiringResult>(dashboardExpiringIR);


