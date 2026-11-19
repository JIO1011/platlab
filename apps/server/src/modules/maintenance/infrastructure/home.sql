/*
 * El Inicio (ADR 0026, «Diseño de IN-01»): un mantenimiento cuenta el día que vence y, hecho, el día del registro.
 * Un día pasado solo muestra lo registrado: lo vencido sin hacer va en «Por atender».
 */

/* @name agendaMaintenance */
-- Lo registrado el :date (hecho) y, si :date no es pasado, lo que vence ese día, con el equipo y el plan.
SELECT r.asset_id AS "asset_id!", a.code AS "asset_code!", a.name AS "asset_name!", p.title AS "plan_title?", true AS "done!"
FROM maintenance.records AS r
JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id
LEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id
WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on = :date!::date
UNION ALL
SELECT pa.asset_id, a.code, a.name, p.title, false
FROM maintenance.plan_assets AS pa
JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
JOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id
WHERE pa.workspace_id = :workspaceId! AND pa.due_on = :date!::date AND :date!::date >= :today!::date
ORDER BY 5 DESC, 3, 4;

/* @name maintenancePerDay */
-- El Calendario: cuántos de agendaMaintenance tiene cada día de :from a :to, sin ceros.
SELECT x.day::text AS "date!", count(*)::integer AS "count!"
FROM (
  SELECT r.performed_on AS day
  FROM maintenance.records AS r
  JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id
  WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on BETWEEN :from!::date AND :to!::date
  UNION ALL
  SELECT pa.due_on
  FROM maintenance.plan_assets AS pa
  JOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id
  WHERE pa.workspace_id = :workspaceId! AND pa.due_on BETWEEN greatest(:from!::date, :today!::date) AND :to!::date
) AS x
GROUP BY x.day
ORDER BY x.day;
