/** Types generated for queries found in "src/modules/equipment/infrastructure/faults.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'ListFaults' parameters type */
export interface IListFaultsParams {
  afterAt?: DateOrString | null | void;
  afterId?: string | null | void;
  assetId?: string | null | void;
  faultId?: string | null | void;
  limit: NumberOrString;
  reportedBy?: string | null | void;
  statuses?: stringArray | null | void;
  timeZone: string;
  workspaceId: string;
}

/** 'ListFaults' return type */
export interface IListFaultsResult {
  asset_code: string;
  asset_id: string;
  asset_name: string;
  asset_photo_url: string | null;
  attended_at: Date | null;
  attended_by_name: string | null;
  description: string;
  fault_type: string;
  id: string;
  location_name: string;
  location_path: stringArray;
  reported_at: Date;
  reported_by_name: string | null;
  resolution: string | null;
  resolved_at: Date | null;
  resolved_by_name: string | null;
  status: string;
  supplier: string | null;
  usable: boolean;
  warranty_document_url: string | null;
  warranty_until: string | null;
}

/** 'ListFaults' query type */
export interface IListFaultsQuery {
  params: IListFaultsParams;
  result: IListFaultsResult;
}

const listFaultsIR: any = {"usedParamSet":{"workspaceId":true,"faultId":true,"statuses":true,"assetId":true,"reportedBy":true,"afterAt":true,"afterId":true,"limit":true,"timeZone":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":502,"b":514},{"a":1225,"b":1237},{"a":1437,"b":1449},{"a":2300,"b":2312},{"a":2385,"b":2397},{"a":2528,"b":2540},{"a":2888,"b":2900},{"a":3176,"b":3188},{"a":3464,"b":3476},{"a":3734,"b":3746}]},{"name":"faultId","required":false,"transform":{"type":"scalar"},"locs":[{"a":557,"b":564},{"a":590,"b":597}]},{"name":"statuses","required":false,"transform":{"type":"scalar"},"locs":[{"a":615,"b":623},{"a":660,"b":668}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":689,"b":696},{"a":728,"b":735}]},{"name":"reportedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":753,"b":763},{"a":811,"b":821}]},{"name":"afterAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":839,"b":846},{"a":897,"b":904}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":920,"b":927}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":986,"b":992}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":2097,"b":2106}]}],"statement":"-- Primero la página (índices cases_status, cases_asset, cases_reporter) y después, solo para ella, el\n-- equipo, su ubicación y quién hizo cada paso. Con :faultId, una falla. Sin :statuses, todas.\n-- Con :reportedBy, solo las de esa persona (quien solo reporta ve las suyas). Con la garantía vigente\n-- el día del reporte en la zona :timeZone (E-01e), su fecha, el proveedor y la garantía en PDF más reciente.\nWITH RECURSIVE page AS (\n  SELECT c.*\n  FROM incidents.cases AS c\n  WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment'\n    AND (:faultId::uuid IS NULL OR c.id = :faultId::uuid)\n    AND (:statuses::text[] IS NULL OR c.status = ANY (:statuses::text[]))\n    AND (:assetId::uuid IS NULL OR c.asset_id = :assetId::uuid)\n    AND (:reportedBy::uuid IS NULL OR c.reported_by_principal_id = :reportedBy::uuid)\n    AND (:afterAt::timestamptz IS NULL OR (c.reported_at, c.id) < (:afterAt::timestamptz, :afterId::uuid))\n  ORDER BY c.reported_at DESC, c.id DESC\n  LIMIT :limit!\n), up AS (\n  SELECT a.id AS asset_id, loc.parent_id, loc.kind, loc.name, 0 AS depth\n  FROM equipment.assets AS a\n  JOIN core.locations AS loc ON loc.workspace_id = a.workspace_id AND loc.id = a.location_id\n  WHERE a.workspace_id = :workspaceId! AND a.id IN (SELECT asset_id FROM page)\n  UNION ALL\n  SELECT up.asset_id, parent.parent_id, parent.kind, parent.name, up.depth + 1\n  FROM up\n  JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id\n  WHERE up.depth < 5\n), paths AS (\n  SELECT asset_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path\n  FROM up\n  GROUP BY asset_id\n)\nSELECT\n  f.id, f.fault_type, f.description, f.usable, f.status,\n  f.reported_at, f.attended_at, f.resolution, f.resolved_at,\n  a.id AS asset_id, a.code AS asset_code, a.name AS asset_name, photo.url AS \"asset_photo_url?\",\n  loc.name AS location_name, paths.path AS \"location_path!\",\n  names.reported AS \"reported_by_name?\", names.attended AS \"attended_by_name?\",\n  names.resolved AS \"resolved_by_name?\",\n  CASE WHEN (f.reported_at AT TIME ZONE :timeZone!)::date <= a.warranty_until THEN a.warranty_until END AS \"warranty_until?\",\n  a.supplier, warranty.url AS \"warranty_document_url?\"\nFROM page AS f\nJOIN equipment.assets AS a ON a.workspace_id = :workspaceId! AND a.id = f.asset_id\nJOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = a.location_id\nJOIN paths ON paths.asset_id = a.id\nLEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = a.photo_id\n-- Nombre de quien hizo cada paso, solo para las filas de la página.\nLEFT JOIN LATERAL (\n  SELECT\n    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id\n       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.reported_by_principal_id) AS reported,\n    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id\n       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.attended_by_principal_id) AS attended,\n    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id\n       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.resolved_by_principal_id) AS resolved\n) AS names ON true\n-- La garantía en PDF vigente más reciente del equipo (índice asset_documents_current).\nLEFT JOIN LATERAL (\n  SELECT d.url\n  FROM equipment.asset_documents AS d\n  WHERE d.workspace_id = :workspaceId! AND d.asset_id = a.id AND d.kind = 'warranty' AND d.archived_at IS NULL\n  ORDER BY d.uploaded_at DESC, d.id DESC\n  LIMIT 1\n) AS warranty ON true\nORDER BY f.reported_at DESC, f.id DESC"};

/**
 * Query generated from SQL:
 * ```
 * -- Primero la página (índices cases_status, cases_asset, cases_reporter) y después, solo para ella, el
 * -- equipo, su ubicación y quién hizo cada paso. Con :faultId, una falla. Sin :statuses, todas.
 * -- Con :reportedBy, solo las de esa persona (quien solo reporta ve las suyas). Con la garantía vigente
 * -- el día del reporte en la zona :timeZone (E-01e), su fecha, el proveedor y la garantía en PDF más reciente.
 * WITH RECURSIVE page AS (
 *   SELECT c.*
 *   FROM incidents.cases AS c
 *   WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment'
 *     AND (:faultId::uuid IS NULL OR c.id = :faultId::uuid)
 *     AND (:statuses::text[] IS NULL OR c.status = ANY (:statuses::text[]))
 *     AND (:assetId::uuid IS NULL OR c.asset_id = :assetId::uuid)
 *     AND (:reportedBy::uuid IS NULL OR c.reported_by_principal_id = :reportedBy::uuid)
 *     AND (:afterAt::timestamptz IS NULL OR (c.reported_at, c.id) < (:afterAt::timestamptz, :afterId::uuid))
 *   ORDER BY c.reported_at DESC, c.id DESC
 *   LIMIT :limit!
 * ), up AS (
 *   SELECT a.id AS asset_id, loc.parent_id, loc.kind, loc.name, 0 AS depth
 *   FROM equipment.assets AS a
 *   JOIN core.locations AS loc ON loc.workspace_id = a.workspace_id AND loc.id = a.location_id
 *   WHERE a.workspace_id = :workspaceId! AND a.id IN (SELECT asset_id FROM page)
 *   UNION ALL
 *   SELECT up.asset_id, parent.parent_id, parent.kind, parent.name, up.depth + 1
 *   FROM up
 *   JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id
 *   WHERE up.depth < 5
 * ), paths AS (
 *   SELECT asset_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path
 *   FROM up
 *   GROUP BY asset_id
 * )
 * SELECT
 *   f.id, f.fault_type, f.description, f.usable, f.status,
 *   f.reported_at, f.attended_at, f.resolution, f.resolved_at,
 *   a.id AS asset_id, a.code AS asset_code, a.name AS asset_name, photo.url AS "asset_photo_url?",
 *   loc.name AS location_name, paths.path AS "location_path!",
 *   names.reported AS "reported_by_name?", names.attended AS "attended_by_name?",
 *   names.resolved AS "resolved_by_name?",
 *   CASE WHEN (f.reported_at AT TIME ZONE :timeZone!)::date <= a.warranty_until THEN a.warranty_until END AS "warranty_until?",
 *   a.supplier, warranty.url AS "warranty_document_url?"
 * FROM page AS f
 * JOIN equipment.assets AS a ON a.workspace_id = :workspaceId! AND a.id = f.asset_id
 * JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = a.location_id
 * JOIN paths ON paths.asset_id = a.id
 * LEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = a.photo_id
 * -- Nombre de quien hizo cada paso, solo para las filas de la página.
 * LEFT JOIN LATERAL (
 *   SELECT
 *     (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id
 *        JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.reported_by_principal_id) AS reported,
 *     (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id
 *        JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.attended_by_principal_id) AS attended,
 *     (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id
 *        JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.resolved_by_principal_id) AS resolved
 * ) AS names ON true
 * -- La garantía en PDF vigente más reciente del equipo (índice asset_documents_current).
 * LEFT JOIN LATERAL (
 *   SELECT d.url
 *   FROM equipment.asset_documents AS d
 *   WHERE d.workspace_id = :workspaceId! AND d.asset_id = a.id AND d.kind = 'warranty' AND d.archived_at IS NULL
 *   ORDER BY d.uploaded_at DESC, d.id DESC
 *   LIMIT 1
 * ) AS warranty ON true
 * ORDER BY f.reported_at DESC, f.id DESC
 * ```
 */
export const listFaults = new PreparedQuery<IListFaultsParams,IListFaultsResult>(listFaultsIR);


/** 'ReportableAssets' parameters type */
export interface IReportableAssetsParams {
  assetId?: string | null | void;
  q?: string | null | void;
  workspaceId: string;
}

/** 'ReportableAssets' return type */
export interface IReportableAssetsResult {
  code: string;
  id: string;
  location_name: string;
  location_path: stringArray;
  name: string;
  photo_url: string | null;
}

/** 'ReportableAssets' query type */
export interface IReportableAssetsQuery {
  params: IReportableAssetsParams;
  result: IReportableAssetsResult;
}

const reportableAssetsIR: any = {"usedParamSet":{"q":true,"workspaceId":true,"assetId":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":362,"b":363}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":619,"b":631},{"a":978,"b":990},{"a":1177,"b":1189},{"a":1571,"b":1583},{"a":1714,"b":1726}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":671,"b":678},{"a":704,"b":711}]}],"statement":"-- Para reportar: equipos no dados de baja cuyo nombre o código contiene :q, plegado como en el\n-- inventario, o el equipo :assetId (el del QR de su etiqueta); quien llama pasa uno de los dos. Solo\n-- lo que identifica al equipo (quien solo reporta no ve la ficha completa).\nWITH RECURSIVE search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n), page AS (\n  SELECT a.id, a.code, a.name, a.location_id, a.photo_id\n  FROM equipment.assets AS a\n  CROSS JOIN search\n  WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'\n    AND (:assetId::uuid IS NULL OR a.id = :assetId::uuid)\n    AND (search.pattern IS NULL OR a.search_text LIKE search.pattern)\n  ORDER BY lower(a.code)\n  LIMIT 20\n), up AS (\n  SELECT p.id AS asset_id, loc.parent_id, loc.kind, loc.name, 0 AS depth\n  FROM page AS p\n  JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id\n  UNION ALL\n  SELECT up.asset_id, parent.parent_id, parent.kind, parent.name, up.depth + 1\n  FROM up\n  JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id\n  WHERE up.depth < 5\n), paths AS (\n  SELECT asset_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path\n  FROM up\n  GROUP BY asset_id\n)\nSELECT p.id, p.code, p.name, photo.url AS \"photo_url?\", loc.name AS location_name, paths.path AS \"location_path!\"\nFROM page AS p\nJOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id\nJOIN paths ON paths.asset_id = p.id\nLEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = p.photo_id\nORDER BY lower(p.code)"};

/**
 * Query generated from SQL:
 * ```
 * -- Para reportar: equipos no dados de baja cuyo nombre o código contiene :q, plegado como en el
 * -- inventario, o el equipo :assetId (el del QR de su etiqueta); quien llama pasa uno de los dos. Solo
 * -- lo que identifica al equipo (quien solo reporta no ve la ficha completa).
 * WITH RECURSIVE search AS (
 *   SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * ), page AS (
 *   SELECT a.id, a.code, a.name, a.location_id, a.photo_id
 *   FROM equipment.assets AS a
 *   CROSS JOIN search
 *   WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'
 *     AND (:assetId::uuid IS NULL OR a.id = :assetId::uuid)
 *     AND (search.pattern IS NULL OR a.search_text LIKE search.pattern)
 *   ORDER BY lower(a.code)
 *   LIMIT 20
 * ), up AS (
 *   SELECT p.id AS asset_id, loc.parent_id, loc.kind, loc.name, 0 AS depth
 *   FROM page AS p
 *   JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id
 *   UNION ALL
 *   SELECT up.asset_id, parent.parent_id, parent.kind, parent.name, up.depth + 1
 *   FROM up
 *   JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id
 *   WHERE up.depth < 5
 * ), paths AS (
 *   SELECT asset_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path
 *   FROM up
 *   GROUP BY asset_id
 * )
 * SELECT p.id, p.code, p.name, photo.url AS "photo_url?", loc.name AS location_name, paths.path AS "location_path!"
 * FROM page AS p
 * JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id
 * JOIN paths ON paths.asset_id = p.id
 * LEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = p.photo_id
 * ORDER BY lower(p.code)
 * ```
 */
export const reportableAssets = new PreparedQuery<IReportableAssetsParams,IReportableAssetsResult>(reportableAssetsIR);


/** 'FaultCounts' parameters type */
export interface IFaultCountsParams {
  reportedBy?: string | null | void;
  workspaceId: string;
}

/** 'FaultCounts' return type */
export interface IFaultCountsResult {
  in_progress: string;
  open: string;
  resolved: string;
}

/** 'FaultCounts' query type */
export interface IFaultCountsQuery {
  params: IFaultCountsParams;
  result: IFaultCountsResult;
}

const faultCountsIR: any = {"usedParamSet":{"workspaceId":true,"reportedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":410,"b":422}]},{"name":"reportedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":461,"b":471},{"a":517,"b":527}]}],"statement":"-- Las pestañas de Incidentes: cuántos hay en cada paso (índices cases_status y cases_reporter), con el\n-- alcance de la lista: con :reportedBy, solo los de esa persona.\nSELECT count(*) FILTER (WHERE status = 'open') AS \"open!\",\n       count(*) FILTER (WHERE status = 'in_progress') AS \"in_progress!\",\n       count(*) FILTER (WHERE status = 'resolved') AS \"resolved!\"\nFROM incidents.cases\nWHERE workspace_id = :workspaceId! AND module_code = 'equipment'\n  AND (:reportedBy::uuid IS NULL OR reported_by_principal_id = :reportedBy::uuid)"};

/**
 * Query generated from SQL:
 * ```
 * -- Las pestañas de Incidentes: cuántos hay en cada paso (índices cases_status y cases_reporter), con el
 * -- alcance de la lista: con :reportedBy, solo los de esa persona.
 * SELECT count(*) FILTER (WHERE status = 'open') AS "open!",
 *        count(*) FILTER (WHERE status = 'in_progress') AS "in_progress!",
 *        count(*) FILTER (WHERE status = 'resolved') AS "resolved!"
 * FROM incidents.cases
 * WHERE workspace_id = :workspaceId! AND module_code = 'equipment'
 *   AND (:reportedBy::uuid IS NULL OR reported_by_principal_id = :reportedBy::uuid)
 * ```
 */
export const faultCounts = new PreparedQuery<IFaultCountsParams,IFaultCountsResult>(faultCountsIR);


/** 'FaultStats' parameters type */
export interface IFaultStatsParams {
  timeZone: string;
  workspaceId: string;
}

/** 'FaultStats' return type */
export interface IFaultStatsResult {
  month: string;
  out_of_service_assets: number;
  out_of_service_seconds: string;
  repair_seconds: string;
  reported: number;
  resolved: number;
}

/** 'FaultStats' query type */
export interface IFaultStatsQuery {
  params: IFaultStatsParams;
  result: IFaultStatsResult;
}

const faultStatsIR: any = {"usedParamSet":{"timeZone":true,"workspaceId":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":371,"b":380},{"a":469,"b":478},{"a":569,"b":578},{"a":837,"b":846}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":675,"b":687},{"a":1019,"b":1031},{"a":1451,"b":1463},{"a":1616,"b":1628},{"a":2053,"b":2065},{"a":2345,"b":2357}]}],"statement":"-- «Incidentes en 12 meses» del Resumen (ADR 0019): los 12 meses de calendario hasta el actual en la zona\n-- :timeZone, cada uno con sus reportados y sus solucionados y cuánto tardaron estos, de reportado a\n-- solucionado. Cada fila repite los días fuera de servicio del período, en un solo viaje a la base.\nWITH span AS (\n  SELECT date_trunc('month', now() AT TIME ZONE :timeZone!) - interval '11 months' AS first_month\n), since AS (\n  SELECT first_month AT TIME ZONE :timeZone! AS at FROM span\n), reported AS (\n  SELECT date_trunc('month', c.reported_at AT TIME ZONE :timeZone!) AS month, count(*) AS n\n  FROM incidents.cases AS c CROSS JOIN since\n  WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment' AND c.reported_at >= since.at\n  GROUP BY 1\n), resolved AS (\n  SELECT date_trunc('month', c.resolved_at AT TIME ZONE :timeZone!) AS month, count(*) AS n,\n         sum(extract(epoch FROM c.resolved_at - c.reported_at)) AS seconds\n  FROM incidents.cases AS c CROSS JOIN since\n  WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment' AND c.status = 'resolved'\n    AND c.resolved_at >= since.at\n  GROUP BY 1\n), ends AS (\n  -- Un tramo fuera de servicio termina en el cambio que sacó al equipo de ese estado (también la baja) o\n  -- sigue abierto si el equipo está fuera de servicio ahora.\n  SELECT cc.asset_id, cc.occurred_at AS ends_at\n  FROM equipment.condition_changes AS cc CROSS JOIN since\n  WHERE cc.workspace_id = :workspaceId! AND cc.from_condition = 'faulted' AND cc.occurred_at > since.at\n  UNION ALL\n  SELECT a.id, now()\n  FROM equipment.assets AS a\n  WHERE a.workspace_id = :workspaceId! AND a.condition = 'faulted'\n), spans AS (\n  -- Y empieza en el último cambio a fuera de servicio anterior (índice condition_changes_asset) o, sin él,\n  -- en el alta: entre los dos no hay otro cambio, porque cada uno parte del estado que deja el anterior.\n  SELECT ends.asset_id, ends.ends_at,\n         coalesce(\n           (SELECT cc.occurred_at FROM equipment.condition_changes AS cc\n             WHERE cc.workspace_id = :workspaceId! AND cc.asset_id = ends.asset_id\n               AND cc.to_condition = 'faulted' AND cc.occurred_at <= ends.ends_at\n             ORDER BY cc.occurred_at DESC\n             LIMIT 1),\n           a.created_at) AS starts_at\n  FROM ends\n  JOIN equipment.assets AS a ON a.workspace_id = :workspaceId! AND a.id = ends.asset_id\n), out_of_service AS (\n  -- Cada tramo, recortado al período.\n  SELECT count(DISTINCT spans.asset_id) AS assets,\n         coalesce(sum(extract(epoch FROM spans.ends_at - greatest(spans.starts_at, since.at))), 0) AS seconds\n  FROM spans CROSS JOIN since\n)\nSELECT to_char(m.month, 'YYYY-MM') AS \"month!\",\n       coalesce(reported.n, 0)::integer AS \"reported!\",\n       coalesce(resolved.n, 0)::integer AS \"resolved!\",\n       round(coalesce(resolved.seconds, 0))::bigint AS \"repair_seconds!\",\n       out_of_service.assets::integer AS \"out_of_service_assets!\",\n       round(out_of_service.seconds)::bigint AS \"out_of_service_seconds!\"\nFROM span\nCROSS JOIN LATERAL generate_series(span.first_month, span.first_month + interval '11 months', interval '1 month') AS m(month)\nCROSS JOIN out_of_service\nLEFT JOIN reported ON reported.month = m.month\nLEFT JOIN resolved ON resolved.month = m.month\nORDER BY m.month"};

/**
 * Query generated from SQL:
 * ```
 * -- «Incidentes en 12 meses» del Resumen (ADR 0019): los 12 meses de calendario hasta el actual en la zona
 * -- :timeZone, cada uno con sus reportados y sus solucionados y cuánto tardaron estos, de reportado a
 * -- solucionado. Cada fila repite los días fuera de servicio del período, en un solo viaje a la base.
 * WITH span AS (
 *   SELECT date_trunc('month', now() AT TIME ZONE :timeZone!) - interval '11 months' AS first_month
 * ), since AS (
 *   SELECT first_month AT TIME ZONE :timeZone! AS at FROM span
 * ), reported AS (
 *   SELECT date_trunc('month', c.reported_at AT TIME ZONE :timeZone!) AS month, count(*) AS n
 *   FROM incidents.cases AS c CROSS JOIN since
 *   WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment' AND c.reported_at >= since.at
 *   GROUP BY 1
 * ), resolved AS (
 *   SELECT date_trunc('month', c.resolved_at AT TIME ZONE :timeZone!) AS month, count(*) AS n,
 *          sum(extract(epoch FROM c.resolved_at - c.reported_at)) AS seconds
 *   FROM incidents.cases AS c CROSS JOIN since
 *   WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment' AND c.status = 'resolved'
 *     AND c.resolved_at >= since.at
 *   GROUP BY 1
 * ), ends AS (
 *   -- Un tramo fuera de servicio termina en el cambio que sacó al equipo de ese estado (también la baja) o
 *   -- sigue abierto si el equipo está fuera de servicio ahora.
 *   SELECT cc.asset_id, cc.occurred_at AS ends_at
 *   FROM equipment.condition_changes AS cc CROSS JOIN since
 *   WHERE cc.workspace_id = :workspaceId! AND cc.from_condition = 'faulted' AND cc.occurred_at > since.at
 *   UNION ALL
 *   SELECT a.id, now()
 *   FROM equipment.assets AS a
 *   WHERE a.workspace_id = :workspaceId! AND a.condition = 'faulted'
 * ), spans AS (
 *   -- Y empieza en el último cambio a fuera de servicio anterior (índice condition_changes_asset) o, sin él,
 *   -- en el alta: entre los dos no hay otro cambio, porque cada uno parte del estado que deja el anterior.
 *   SELECT ends.asset_id, ends.ends_at,
 *          coalesce(
 *            (SELECT cc.occurred_at FROM equipment.condition_changes AS cc
 *              WHERE cc.workspace_id = :workspaceId! AND cc.asset_id = ends.asset_id
 *                AND cc.to_condition = 'faulted' AND cc.occurred_at <= ends.ends_at
 *              ORDER BY cc.occurred_at DESC
 *              LIMIT 1),
 *            a.created_at) AS starts_at
 *   FROM ends
 *   JOIN equipment.assets AS a ON a.workspace_id = :workspaceId! AND a.id = ends.asset_id
 * ), out_of_service AS (
 *   -- Cada tramo, recortado al período.
 *   SELECT count(DISTINCT spans.asset_id) AS assets,
 *          coalesce(sum(extract(epoch FROM spans.ends_at - greatest(spans.starts_at, since.at))), 0) AS seconds
 *   FROM spans CROSS JOIN since
 * )
 * SELECT to_char(m.month, 'YYYY-MM') AS "month!",
 *        coalesce(reported.n, 0)::integer AS "reported!",
 *        coalesce(resolved.n, 0)::integer AS "resolved!",
 *        round(coalesce(resolved.seconds, 0))::bigint AS "repair_seconds!",
 *        out_of_service.assets::integer AS "out_of_service_assets!",
 *        round(out_of_service.seconds)::bigint AS "out_of_service_seconds!"
 * FROM span
 * CROSS JOIN LATERAL generate_series(span.first_month, span.first_month + interval '11 months', interval '1 month') AS m(month)
 * CROSS JOIN out_of_service
 * LEFT JOIN reported ON reported.month = m.month
 * LEFT JOIN resolved ON resolved.month = m.month
 * ORDER BY m.month
 * ```
 */
export const faultStats = new PreparedQuery<IFaultStatsParams,IFaultStatsResult>(faultStatsIR);


