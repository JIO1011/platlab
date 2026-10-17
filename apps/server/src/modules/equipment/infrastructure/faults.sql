/*
 * Incidentes de Equipos (ADR 0019): lecturas sobre la capacidad incidencias, con los datos del
 * equipo. Las escrituras son de la capacidad (capabilities/incidents).
 */

/* @name listFaults */
-- Primero la página (índices cases_status, cases_asset, cases_reporter) y después, solo para ella, el
-- equipo, su ubicación y quién hizo cada paso. Con :faultId, una falla. Sin :statuses, todas.
-- Con :reportedBy, solo las de esa persona (quien solo reporta ve las suyas).
WITH RECURSIVE page AS (
  SELECT c.*
  FROM incidents.cases AS c
  WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment'
    AND (:faultId::uuid IS NULL OR c.id = :faultId::uuid)
    AND (:statuses::text[] IS NULL OR c.status = ANY (:statuses::text[]))
    AND (:assetId::uuid IS NULL OR c.asset_id = :assetId::uuid)
    AND (:reportedBy::uuid IS NULL OR c.reported_by_principal_id = :reportedBy::uuid)
    AND (:afterAt::timestamptz IS NULL OR (c.reported_at, c.id) < (:afterAt::timestamptz, :afterId::uuid))
  ORDER BY c.reported_at DESC, c.id DESC
  LIMIT :limit!
), up AS (
  SELECT a.id AS asset_id, loc.parent_id, loc.kind, loc.name, 0 AS depth
  FROM equipment.assets AS a
  JOIN core.locations AS loc ON loc.workspace_id = a.workspace_id AND loc.id = a.location_id
  WHERE a.workspace_id = :workspaceId! AND a.id IN (SELECT asset_id FROM page)
  UNION ALL
  SELECT up.asset_id, parent.parent_id, parent.kind, parent.name, up.depth + 1
  FROM up
  JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id
  WHERE up.depth < 5
), paths AS (
  SELECT asset_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path
  FROM up
  GROUP BY asset_id
)
SELECT
  f.id, f.fault_type, f.description, f.usable, f.status,
  f.reported_at, f.attended_at, f.resolution, f.resolved_at,
  a.id AS asset_id, a.code AS asset_code, a.name AS asset_name, photo.url AS "asset_photo_url?",
  loc.name AS location_name, paths.path AS "location_path!",
  names.reported AS "reported_by_name?", names.attended AS "attended_by_name?",
  names.resolved AS "resolved_by_name?"
FROM page AS f
JOIN equipment.assets AS a ON a.workspace_id = :workspaceId! AND a.id = f.asset_id
JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = a.location_id
JOIN paths ON paths.asset_id = a.id
LEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = a.photo_id
-- Nombre de quien hizo cada paso, solo para las filas de la página.
LEFT JOIN LATERAL (
  SELECT
    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id
       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.reported_by_principal_id) AS reported,
    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id
       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.attended_by_principal_id) AS attended,
    (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id
       JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = f.resolved_by_principal_id) AS resolved
) AS names ON true
ORDER BY f.reported_at DESC, f.id DESC;

/* @name reportableAssets */
-- Para reportar: equipos no dados de baja cuyo nombre o código contiene :q, plegado como en el
-- inventario, o el equipo :assetId (el del QR de su etiqueta); quien llama pasa uno de los dos. Solo
-- lo que identifica al equipo (quien solo reporta no ve la ficha completa).
WITH RECURSIVE search AS (
  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
), page AS (
  SELECT a.id, a.code, a.name, a.location_id, a.photo_id
  FROM equipment.assets AS a
  CROSS JOIN search
  WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'
    AND (:assetId::uuid IS NULL OR a.id = :assetId::uuid)
    AND (search.pattern IS NULL OR a.search_text LIKE search.pattern)
  ORDER BY lower(a.code)
  LIMIT 20
), up AS (
  SELECT p.id AS asset_id, loc.parent_id, loc.kind, loc.name, 0 AS depth
  FROM page AS p
  JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id
  UNION ALL
  SELECT up.asset_id, parent.parent_id, parent.kind, parent.name, up.depth + 1
  FROM up
  JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id
  WHERE up.depth < 5
), paths AS (
  SELECT asset_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path
  FROM up
  GROUP BY asset_id
)
SELECT p.id, p.code, p.name, photo.url AS "photo_url?", loc.name AS location_name, paths.path AS "location_path!"
FROM page AS p
JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id
JOIN paths ON paths.asset_id = p.id
LEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = p.photo_id
ORDER BY lower(p.code);
