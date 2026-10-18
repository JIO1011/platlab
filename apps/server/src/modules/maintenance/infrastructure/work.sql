/*
 * Lo que toca hacer en Mantenimiento (ADR 0020): se calcula al consultar desde maintenance.plan_assets,
 * en la zona horaria del espacio. Los equipos se leen por la vista de Equipos y su área, por Core.
 */

/* @name workspaceToday */
SELECT (now() AT TIME ZONE :timeZone!)::date AS "today!";

/* @name listDue */
-- «Por hacer»: los no conformes, sea cual sea su fecha, y después lo que vence hasta dentro de 30 días,
-- de la fecha más antigua a la más nueva, con el equipo, su área, el plan y el último registro. Cada fila
-- lleva el total antes del tope.
WITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)
SELECT
  pa.plan_id AS "plan_id!", p.title AS plan_title, p.kind AS plan_kind, pa.asset_id AS "asset_id!",
  a.code AS "asset_code!", a.name AS "asset_name!", area.name AS "area_name?", pa.due_on AS "due_on!",
  pa.last_record_id, pa.last_performed_on, pa.last_result, count(*) OVER ()::integer AS "total!"
FROM maintenance.plan_assets AS pa
CROSS JOIN today
JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
JOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id
LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
WHERE pa.workspace_id = :workspaceId! AND (pa.due_on <= today.d + 30 OR pa.last_result = 'fail')
ORDER BY (pa.last_result = 'fail') IS TRUE DESC, pa.due_on, lower(a.code), p.id
LIMIT :limit!;

/* @name dueCounts */
-- Las cifras del Resumen: vencidos (antes de hoy) o no conformes, cuántos de ellos son no conformes, y
-- los demás que tocan desde hoy hasta dentro de 30 días.
WITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)
SELECT today.d AS "today!",
       count(*) FILTER (WHERE pa.due_on < today.d OR pa.last_result = 'fail')::integer AS "overdue!",
       count(*) FILTER (WHERE pa.last_result = 'fail')::integer AS "nonconforming!",
       count(*) FILTER (WHERE pa.due_on >= today.d AND pa.last_result IS DISTINCT FROM 'fail')::integer AS "next30!"
FROM today
LEFT JOIN maintenance.plan_assets AS pa
  ON pa.workspace_id = :workspaceId! AND (pa.due_on <= today.d + 30 OR pa.last_result = 'fail')
GROUP BY today.d;

/* @name findAssets */
-- «Registrar mantenimiento»: hasta 20 equipos no dados de baja cuyo código o nombre contiene :q, plegado
-- como en el inventario (ADR 0015), o con el código :code sin mayúsculas. Con :assetId, ese equipo,
-- también dado de baja (la ficha). Quien llama pasa uno de los tres.
WITH search AS (
  SELECT '%' || replace(replace(replace(core.fold_text(:q::text),
           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
)
SELECT a.id AS "id!", a.code AS "code!", a.name AS "name!", a.condition AS "condition!", area.name AS "area_name?"
FROM equipment.asset_directory AS a
CROSS JOIN search
LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
WHERE a.workspace_id = :workspaceId!
  AND CASE WHEN :assetId::uuid IS NULL THEN a.condition <> 'retired' ELSE a.id = :assetId::uuid END
  AND (:code::text IS NULL OR lower(a.code) = lower(:code::text))
  AND (search.pattern IS NULL OR core.fold_text(a.code || ' ' || a.name) LIKE search.pattern)
ORDER BY lower(a.code), a.id
LIMIT 20;

/* @name assetPlans */
-- Los planes que cubren al equipo, de la próxima fecha más cercana a la más lejana, con el último resultado.
SELECT pa.plan_id AS "plan_id!", p.title, p.kind, pa.due_on AS "due_on!", pa.last_performed_on, pa.last_result
FROM maintenance.plan_assets AS pa
JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
WHERE pa.workspace_id = :workspaceId! AND pa.asset_id = :assetId!
ORDER BY pa.due_on, p.id;

/* @name assetExclusions */
-- Los planes activos de su tipo de los que el equipo está excluido, con el motivo, del más reciente al
-- más antiguo.
SELECT p.id, p.title, p.kind, x.reason, x.created_at
FROM maintenance.plan_exclusions AS x
JOIN maintenance.plans AS p ON p.workspace_id = x.workspace_id AND p.id = x.plan_id
WHERE x.workspace_id = :workspaceId! AND x.asset_id = :assetId! AND x.archived_at IS NULL
  AND p.archived_at IS NULL
ORDER BY x.created_at DESC, p.id;

/* @name nextDueByAsset */
-- La columna «Próximo mantenimiento» del Inventario: de cada equipo de :assetIds, su plan no conforme o,
-- si no hay, la fecha más cercana; el semáforo está en rojo con cualquiera de los dos.
SELECT DISTINCT ON (pa.asset_id)
  pa.asset_id AS "asset_id!", pa.due_on AS "due_on!", p.id AS plan_id, p.title, p.kind, pa.last_result
FROM maintenance.plan_assets AS pa
JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
WHERE pa.workspace_id = :workspaceId! AND pa.asset_id = ANY (:assetIds!::uuid[])
ORDER BY pa.asset_id, (pa.last_result = 'fail') IS TRUE DESC, pa.due_on, p.id;
