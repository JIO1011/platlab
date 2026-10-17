/*
 * Incidentes de Equipos (ADR 0019): lecturas sobre la capacidad incidencias, con los datos del
 * equipo. Las escrituras son de la capacidad (capabilities/incidents).
 */

/* @name listFaults */
-- Primero la página (índices cases_status, cases_asset, cases_reporter) y después, solo para ella, el
-- equipo, su ubicación y quién hizo cada paso. Con :faultId, una falla. Sin :statuses, todas.
-- Con :reportedBy, solo las de esa persona (quien solo reporta ve las suyas). Con la garantía vigente
-- el día del reporte en la zona :timeZone (E-01e), su fecha, el proveedor y la garantía en PDF más reciente.
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
  names.resolved AS "resolved_by_name?",
  CASE WHEN (f.reported_at AT TIME ZONE :timeZone!)::date <= a.warranty_until THEN a.warranty_until END AS "warranty_until?",
  a.supplier, warranty.url AS "warranty_document_url?"
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
-- La garantía en PDF vigente más reciente del equipo (índice asset_documents_current).
LEFT JOIN LATERAL (
  SELECT d.url
  FROM equipment.asset_documents AS d
  WHERE d.workspace_id = :workspaceId! AND d.asset_id = a.id AND d.kind = 'warranty' AND d.archived_at IS NULL
  ORDER BY d.uploaded_at DESC, d.id DESC
  LIMIT 1
) AS warranty ON true
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

/* @name faultCounts */
-- Las pestañas de Incidentes: cuántos hay en cada paso (índices cases_status y cases_reporter), con el
-- alcance de la lista: con :reportedBy, solo los de esa persona.
SELECT count(*) FILTER (WHERE status = 'open') AS "open!",
       count(*) FILTER (WHERE status = 'in_progress') AS "in_progress!",
       count(*) FILTER (WHERE status = 'resolved') AS "resolved!"
FROM incidents.cases
WHERE workspace_id = :workspaceId! AND module_code = 'equipment'
  AND (:reportedBy::uuid IS NULL OR reported_by_principal_id = :reportedBy::uuid);

/* @name faultStats */
-- «Incidentes en 12 meses» del Resumen (ADR 0019): los 12 meses de calendario hasta el actual en la zona
-- :timeZone, cada uno con sus reportados y sus solucionados y cuánto tardaron estos, de reportado a
-- solucionado. Cada fila repite los días fuera de servicio del período, en un solo viaje a la base.
WITH span AS (
  SELECT date_trunc('month', now() AT TIME ZONE :timeZone!) - interval '11 months' AS first_month
), since AS (
  SELECT first_month AT TIME ZONE :timeZone! AS at FROM span
), reported AS (
  SELECT date_trunc('month', c.reported_at AT TIME ZONE :timeZone!) AS month, count(*) AS n
  FROM incidents.cases AS c CROSS JOIN since
  WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment' AND c.reported_at >= since.at
  GROUP BY 1
), resolved AS (
  SELECT date_trunc('month', c.resolved_at AT TIME ZONE :timeZone!) AS month, count(*) AS n,
         sum(extract(epoch FROM c.resolved_at - c.reported_at)) AS seconds
  FROM incidents.cases AS c CROSS JOIN since
  WHERE c.workspace_id = :workspaceId! AND c.module_code = 'equipment' AND c.status = 'resolved'
    AND c.resolved_at >= since.at
  GROUP BY 1
), ends AS (
  -- Un tramo fuera de servicio termina en el cambio que sacó al equipo de ese estado (también la baja) o
  -- sigue abierto si el equipo está fuera de servicio ahora.
  SELECT cc.asset_id, cc.occurred_at AS ends_at
  FROM equipment.condition_changes AS cc CROSS JOIN since
  WHERE cc.workspace_id = :workspaceId! AND cc.from_condition = 'faulted' AND cc.occurred_at > since.at
  UNION ALL
  SELECT a.id, now()
  FROM equipment.assets AS a
  WHERE a.workspace_id = :workspaceId! AND a.condition = 'faulted'
), spans AS (
  -- Y empieza en el último cambio a fuera de servicio anterior (índice condition_changes_asset) o, sin él,
  -- en el alta: entre los dos no hay otro cambio, porque cada uno parte del estado que deja el anterior.
  SELECT ends.asset_id, ends.ends_at,
         coalesce(
           (SELECT cc.occurred_at FROM equipment.condition_changes AS cc
             WHERE cc.workspace_id = :workspaceId! AND cc.asset_id = ends.asset_id
               AND cc.to_condition = 'faulted' AND cc.occurred_at <= ends.ends_at
             ORDER BY cc.occurred_at DESC
             LIMIT 1),
           a.created_at) AS starts_at
  FROM ends
  JOIN equipment.assets AS a ON a.workspace_id = :workspaceId! AND a.id = ends.asset_id
), out_of_service AS (
  -- Cada tramo, recortado al período.
  SELECT count(DISTINCT spans.asset_id) AS assets,
         coalesce(sum(extract(epoch FROM spans.ends_at - greatest(spans.starts_at, since.at))), 0) AS seconds
  FROM spans CROSS JOIN since
)
SELECT to_char(m.month, 'YYYY-MM') AS "month!",
       coalesce(reported.n, 0)::integer AS "reported!",
       coalesce(resolved.n, 0)::integer AS "resolved!",
       round(coalesce(resolved.seconds, 0))::bigint AS "repair_seconds!",
       out_of_service.assets::integer AS "out_of_service_assets!",
       round(out_of_service.seconds)::bigint AS "out_of_service_seconds!"
FROM span
CROSS JOIN LATERAL generate_series(span.first_month, span.first_month + interval '11 months', interval '1 month') AS m(month)
CROSS JOIN out_of_service
LEFT JOIN reported ON reported.month = m.month
LEFT JOIN resolved ON resolved.month = m.month
ORDER BY m.month;
