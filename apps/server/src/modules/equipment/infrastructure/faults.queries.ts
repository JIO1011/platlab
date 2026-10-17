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
  usable: boolean;
}

/** 'ListFaults' query type */
export interface IListFaultsQuery {
  params: IListFaultsParams;
  result: IListFaultsResult;
}

const listFaultsIR: any = {"usedParamSet":{"workspaceId":true,"faultId":true,"statuses":true,"assetId":true,"reportedBy":true,"afterAt":true,"afterId":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":368,"b":380},{"a":1091,"b":1103},{"a":1303,"b":1315},{"a":1984,"b":1996},{"a":2069,"b":2081},{"a":2212,"b":2224},{"a":2572,"b":2584},{"a":2860,"b":2872},{"a":3148,"b":3160}]},{"name":"faultId","required":false,"transform":{"type":"scalar"},"locs":[{"a":423,"b":430},{"a":456,"b":463}]},{"name":"statuses","required":false,"transform":{"type":"scalar"},"locs":[{"a":481,"b":489},{"a":526,"b":534}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":555,"b":562},{"a":594,"b":601}]},{"name":"reportedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":619,"b":629},{"a":677,"b":687}]},{"name":"afterAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":705,"b":712},{"a":763,"b":770}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":786,"b":793}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":852,"b":858}]}],"statement":"-- Primero la página (índices cases_status, cases_asset, cases_reporter) y después, solo para ella, el\n-- equipo, su ubicación y quién hizo cada paso. Con :faultId, una falla. Sin :statuses, todas.\n-- Con :reportedBy, solo las de esa persona (quien solo reporta ve las suyas).\nWITH RECURSIVE page AS (\n  SELECT c.*\n  FROM incidents.cases AS c\n  WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment'\n    AND (:faultId::uuid IS NULL OR c.id = :faultId::uuid)\n    AND (:statuses::text[] IS NULL OR c.status = ANY (:statuses::text[]))\n    AND (:assetId::uuid IS NULL OR c.asset_id = :assetId::uuid)\n    AND (:reportedBy::uuid IS NULL OR c.reported_by_principal_id = :reportedBy::uuid)\n    AND (:afterAt::timestamptz IS NULL OR (c.reported_at, c.id) < (:afterAt::timestamptz, :afterId::uuid))\n  ORDER BY c.reported_at DESC, c.id DESC\n  LIMIT :limit!\n), up AS (\n  SELECT a.id AS asset_id, loc.parent_id, loc.kind, loc.name, 0 AS depth\n  FROM equipment.assets AS a\n  JOIN core.locations AS loc ON loc.workspace_id = a.workspace_id AND loc.id = a.location_id\n  WHERE a.workspace_id = :workspaceId! AND a.id IN (SELECT asset_id FROM page)\n  UNION ALL\n  SELECT up.asset_id, parent.parent_id, parent.kind, parent.name, up.depth + 1\n  FROM up\n  JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id\n  WHERE up.depth < 5\n), paths AS (\n  SELECT asset_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path\n  FROM up\n  GROUP BY asset_id\n)\nSELECT\n  f.id, f.fault_type, f.description, f.usable, f.status,\n  f.reported_at, f.attended_at, f.resolution, f.resolved_at,\n  a.id AS asset_id, a.code AS asset_code, a.name AS asset_name, photo.url AS \"asset_photo_url?\",\n  loc.name AS location_name, paths.path AS \"location_path!\",\n  names.reported AS \"reported_by_name?\", names.attended AS \"attended_by_name?\",\n  names.resolved AS \"resolved_by_name?\"\nFROM page AS f\nJOIN equipment.assets AS a ON a.workspace_id = :workspaceId! AND a.id = f.asset_id\nJOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = a.location_id\nJOIN paths ON paths.asset_id = a.id\nLEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = a.photo_id\n-- Nombre de quien hizo cada paso, solo para las filas de la página.\nLEFT JOIN LATERAL (\n  SELECT\n    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id\n       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.reported_by_principal_id) AS reported,\n    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id\n       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.attended_by_principal_id) AS attended,\n    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id\n       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.resolved_by_principal_id) AS resolved\n) AS names ON true\nORDER BY f.reported_at DESC, f.id DESC"};

/**
 * Query generated from SQL:
 * ```
 * -- Primero la página (índices cases_status, cases_asset, cases_reporter) y después, solo para ella, el
 * -- equipo, su ubicación y quién hizo cada paso. Con :faultId, una falla. Sin :statuses, todas.
 * -- Con :reportedBy, solo las de esa persona (quien solo reporta ve las suyas).
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
 *   names.resolved AS "resolved_by_name?"
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
 * ORDER BY f.reported_at DESC, f.id DESC
 * ```
 */
export const listFaults = new PreparedQuery<IListFaultsParams,IListFaultsResult>(listFaultsIR);


/** 'ReportableAssets' parameters type */
export interface IReportableAssetsParams {
  q: string;
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

const reportableAssetsIR: any = {"usedParamSet":{"q":true,"workspaceId":true},"params":[{"name":"q","required":true,"transform":{"type":"scalar"},"locs":[{"a":277,"b":279}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":535,"b":547},{"a":804,"b":816},{"a":1003,"b":1015},{"a":1397,"b":1409},{"a":1540,"b":1552}]}],"statement":"-- Para reportar: equipos no dados de baja cuyo nombre o código contiene :q, plegado como en el\n-- inventario; solo lo que identifica al equipo (quien solo reporta no ve la ficha completa).\nWITH RECURSIVE search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q!::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n), page AS (\n  SELECT a.id, a.code, a.name, a.location_id, a.photo_id\n  FROM equipment.assets AS a\n  CROSS JOIN search\n  WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired' AND a.search_text LIKE search.pattern\n  ORDER BY lower(a.code)\n  LIMIT 20\n), up AS (\n  SELECT p.id AS asset_id, loc.parent_id, loc.kind, loc.name, 0 AS depth\n  FROM page AS p\n  JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id\n  UNION ALL\n  SELECT up.asset_id, parent.parent_id, parent.kind, parent.name, up.depth + 1\n  FROM up\n  JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id\n  WHERE up.depth < 5\n), paths AS (\n  SELECT asset_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path\n  FROM up\n  GROUP BY asset_id\n)\nSELECT p.id, p.code, p.name, photo.url AS \"photo_url?\", loc.name AS location_name, paths.path AS \"location_path!\"\nFROM page AS p\nJOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id\nJOIN paths ON paths.asset_id = p.id\nLEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = p.photo_id\nORDER BY lower(p.code)"};

/**
 * Query generated from SQL:
 * ```
 * -- Para reportar: equipos no dados de baja cuyo nombre o código contiene :q, plegado como en el
 * -- inventario; solo lo que identifica al equipo (quien solo reporta no ve la ficha completa).
 * WITH RECURSIVE search AS (
 *   SELECT '%' || replace(replace(replace(inventory.fold_text(:q!::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * ), page AS (
 *   SELECT a.id, a.code, a.name, a.location_id, a.photo_id
 *   FROM equipment.assets AS a
 *   CROSS JOIN search
 *   WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired' AND a.search_text LIKE search.pattern
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


