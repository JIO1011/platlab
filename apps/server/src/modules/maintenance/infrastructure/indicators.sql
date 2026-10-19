/*
 * Indicadores de Mantenimiento (ADR 0020, M-01c): se calculan al consultar, del día :from (el primero del mes
 * de hace 11 meses) al día :today, en la zona del espacio. Cada fecha que tocaba es un trabajo programado: un
 * registro no anulado que la cumplió (records.due_on) o lo pendiente de plan_assets.
 */

/* @name monthlyWork */
-- Programado frente a realizado, por el mes de la fecha que tocaba, de :from al mes de :today; el mes actual
-- incluye lo que toca después de hoy.
WITH slots AS (
  SELECT r.due_on, r.performed_on
  FROM maintenance.records AS r
  WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL
    AND r.due_on >= :from!::date AND r.due_on < (date_trunc('month', :today!::date::timestamp) + interval '1 month')::date
  UNION ALL
  SELECT pa.due_on, NULL
  FROM maintenance.plan_assets AS pa
  WHERE pa.workspace_id = :workspaceId!
    AND pa.due_on >= :from!::date AND pa.due_on < (date_trunc('month', :today!::date::timestamp) + interval '1 month')::date
)
SELECT to_char(m.month, 'YYYY-MM') AS "month!",
       count(s.due_on)::integer AS "due!",
       count(s.performed_on)::integer AS "done!",
       count(*) FILTER (WHERE s.performed_on <= s.due_on)::integer AS "on_time!"
FROM generate_series(:from!::date::timestamp, :today!::date::timestamp, interval '1 month') AS m (month)
LEFT JOIN slots AS s ON date_trunc('month', s.due_on::timestamp) = m.month
GROUP BY m.month
ORDER BY m.month;

/* @name compliance */
-- Cumplimiento del plan hasta hoy: hecho en la fecha que tocaba o antes, hecho después, o pendiente con la
-- fecha ya pasada (lo que toca hoy aún no cuenta). La fila "total" es la del espacio; las demás, por el
-- requisito actual del plan, de la A a la Z.
WITH slots AS (
  SELECT r.due_on, r.performed_on, p.requirement
  FROM maintenance.records AS r
  JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id
  WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.due_on BETWEEN :from!::date AND :today!::date
  UNION ALL
  SELECT pa.due_on, NULL, p.requirement
  FROM maintenance.plan_assets AS pa
  JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
  WHERE pa.workspace_id = :workspaceId! AND pa.due_on >= :from!::date AND pa.due_on < :today!::date
)
SELECT grouping(requirement) = 1 AS "total!", requirement,
       count(*) FILTER (WHERE performed_on <= due_on)::integer AS "on_time!",
       count(*) FILTER (WHERE performed_on > due_on)::integer AS "late!",
       count(*) FILTER (WHERE performed_on IS NULL)::integer AS "pending!"
FROM slots
GROUP BY GROUPING SETS ((), (requirement))
ORDER BY grouping(requirement) DESC, core.fold_text(requirement), requirement;

/* @name calibrationState */
-- Calibraciones vigentes: de los trabajos de los planes de calibración, los que tienen un último registro que
-- no es «No conforme» y cuya fecha no venció.
SELECT count(*)::integer AS "total!",
       count(*) FILTER (
         WHERE pa.last_record_id IS NOT NULL AND pa.last_result <> 'fail' AND pa.due_on >= :today!::date
       )::integer AS "current!"
FROM maintenance.plan_assets AS pa
JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
WHERE pa.workspace_id = :workspaceId! AND p.kind = 'calibration';

/* @name workCosts */
-- Lo registrado en el periodo, por la fecha del trabajo: preventivo (todo lo que se planifica) frente a
-- correctivo, y cuántos registros no tienen costo.
SELECT trim_scale(coalesce(sum(cost) FILTER (WHERE kind <> 'corrective'), 0))::text AS "preventive!",
       trim_scale(coalesce(sum(cost) FILTER (WHERE kind = 'corrective'), 0))::text AS "corrective!",
       count(*) FILTER (WHERE cost IS NULL)::integer AS "without_cost!"
FROM maintenance.records
WHERE workspace_id = :workspaceId! AND voided_at IS NULL AND performed_on BETWEEN :from!::date AND :today!::date;

/* @name replacementCandidates */
-- «Evaluar reemplazo» (02 §12): los equipos no dados de baja que cumplieron su vida útil, cuyo correctivo del
-- periodo llega a :repairShare de su valor de reposición o que están en :faultyAssetIds (Equipos cuenta sus
-- incidentes), sin un descarte vigente. Por código, con su área.
WITH repairs AS (
  SELECT asset_id, sum(cost) AS cost
  FROM maintenance.records
  WHERE workspace_id = :workspaceId! AND voided_at IS NULL AND kind = 'corrective'
    AND performed_on BETWEEN :from!::date AND :today!::date
  GROUP BY asset_id
), assessed AS (
  SELECT a.workspace_id, a.id, a.code, a.name, a.location_id, a.replacement_value,
         CASE WHEN equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today!::date) = 'reached'
              THEN (a.acquired_on + make_interval(years => a.useful_life_years))::date END AS life_ended_on,
         CASE WHEN a.replacement_value > 0 AND rep.cost >= a.replacement_value * :repairShare!::numeric
              THEN rep.cost END AS repair_cost
  FROM equipment.asset_directory AS a
  LEFT JOIN repairs AS rep ON rep.asset_id = a.id
  WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'
)
SELECT s.id AS "id!", s.code AS "code!", s.name AS "name!", area.name AS "area_name?", s.life_ended_on,
       trim_scale(s.repair_cost)::text AS repair_cost, trim_scale(s.replacement_value)::text AS replacement_value
FROM assessed AS s
LEFT JOIN core.location_areas AS la ON la.workspace_id = s.workspace_id AND la.location_id = s.location_id
LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
WHERE (s.life_ended_on IS NOT NULL OR s.repair_cost IS NOT NULL OR s.id = ANY (:faultyAssetIds!::uuid[]))
  AND NOT EXISTS (
    SELECT 1 FROM maintenance.replacement_reviews AS d
    WHERE d.workspace_id = s.workspace_id AND d.asset_id = s.id AND d.dismissed_until > :today!::date
  )
ORDER BY lower(s.code), s.id
LIMIT :limit!;

/* @name insertReplacementReview */
-- Descarta el aviso del equipo hasta :months meses después de :today, con motivo. Un descarte del mismo día no
-- suma otro; la fecha se responde igual.
WITH target AS (
  SELECT (:today!::date + make_interval(months => :months!::integer))::date AS until
), inserted AS (
  INSERT INTO maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
  SELECT :workspaceId!, :assetId!, :reason!, target.until, :createdBy! FROM target
  ON CONFLICT (workspace_id, asset_id, dismissed_until) DO NOTHING
  RETURNING id
)
SELECT until AS "dismissed_until!" FROM target;

/* @name recordsPerDay */
-- La tarjeta del Inicio: los registros no anulados por la fecha del trabajo, de los últimos :days días hasta
-- :today, con ceros.
SELECT to_char(d.day, 'YYYY-MM-DD') AS "date!", count(r.id)::integer AS "value!"
FROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)
LEFT JOIN maintenance.records AS r
  ON r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on = d.day::date
GROUP BY d.day
ORDER BY d.day;
