/* Planes de Mantenimiento (ADR 0020): por tipo de equipo o por equipo, con sus exclusiones. */

/* @name listPlans */
-- Los activos por título, con su alcance, los equipos que cubren hoy (plan_assets: cuántos, la fecha más
-- cercana y cuántos están vencidos o no conformes, en la zona del espacio) y sus exclusiones activas por
-- código del equipo; con :planId, ese plan aunque esté archivado (la respuesta de un comando). El tipo y
-- el equipo se leen por las vistas de Equipos (ADR 0020).
SELECT
  p.id, p.kind, p.title, p.asset_type_id, t.name AS "type_name?", p.asset_id, a.code AS "asset_code?",
  a.name AS "asset_name?", p.interval_count, p.interval_unit, p.starts_on, p.checklist, p.acceptance_criteria,
  p.requirement, p.archived_at, p.version, cover.asset_count AS "asset_count!", cover.next_due_on AS "next_due_on?",
  cover.overdue_count AS "overdue_count!",
  coalesce((
    SELECT jsonb_agg(
             jsonb_build_object(
               'asset', jsonb_build_object('id', xa.id, 'code', xa.code, 'name', xa.name),
               'reason', x.reason,
               'createdAt', x.created_at)
             ORDER BY lower(xa.code), xa.id)
    FROM maintenance.plan_exclusions AS x
    JOIN equipment.asset_directory AS xa ON xa.workspace_id = x.workspace_id AND xa.id = x.asset_id
    WHERE x.workspace_id = p.workspace_id AND x.plan_id = p.id AND x.archived_at IS NULL
  ), '[]'::jsonb) AS "exclusions!"
FROM maintenance.plans AS p
LEFT JOIN equipment.asset_type_directory AS t ON t.workspace_id = p.workspace_id AND t.id = p.asset_type_id
LEFT JOIN equipment.asset_directory AS a ON a.workspace_id = p.workspace_id AND a.id = p.asset_id
CROSS JOIN LATERAL (
  SELECT count(*)::integer AS asset_count, min(pa.due_on) AS next_due_on,
         count(*) FILTER (
           WHERE pa.due_on < (now() AT TIME ZONE :timeZone!)::date OR pa.last_result = 'fail'
         )::integer AS overdue_count
  FROM maintenance.plan_assets AS pa
  WHERE pa.workspace_id = p.workspace_id AND pa.plan_id = p.id
) AS cover
WHERE p.workspace_id = :workspaceId!
  AND CASE WHEN :planId::uuid IS NULL THEN p.archived_at IS NULL ELSE p.id = :planId::uuid END
ORDER BY core.fold_text(p.title), p.id;

/* @name uncoveredAssets */
-- Cobertura (ADR 0020): los equipos no dados de baja que ningún plan activo cubre (plan_assets), los
-- primeros 50 por código; cada fila lleva el total.
SELECT a.id AS "id!", a.code AS "code!", a.name AS "name!", count(*) OVER ()::integer AS "total!"
FROM equipment.asset_directory AS a
WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'
  AND NOT EXISTS (
    SELECT 1 FROM maintenance.plan_assets AS pa WHERE pa.workspace_id = a.workspace_id AND pa.asset_id = a.id
  )
ORDER BY lower(a.code), a.id
LIMIT 50;

/* @name activeAssetType */
-- El tipo de un plan nuevo: del espacio y activo.
SELECT archived_at FROM equipment.asset_type_directory WHERE workspace_id = :workspaceId! AND id = :typeId!;

/* @name directoryAsset */
-- Un equipo del espacio por la vista de Equipos (ADR 0020), con su tipo y su condición.
SELECT id AS "id!", type_id AS "type_id!", condition AS "condition!"
FROM equipment.asset_directory
WHERE workspace_id = :workspaceId! AND id = :assetId!;

/* @name insertPlan */
INSERT INTO maintenance.plans (
  workspace_id, kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, checklist,
  acceptance_criteria, requirement, created_by_principal_id
)
VALUES (
  :workspaceId!, :kind!, :title!, :assetTypeId, :assetId, :intervalCount!, :intervalUnit!, :startsOn!::date,
  :checklist!::text[], :acceptanceCriteria, :requirement, :createdBy!
)
RETURNING id;

/* @name lockPlan */
-- Lo último del orden de bloqueo (02 §6): el plan que se edita, se archiva o cambia sus exclusiones.
SELECT kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, checklist,
       acceptance_criteria, requirement, archived_at, version
FROM maintenance.plans
WHERE workspace_id = :workspaceId! AND id = :planId!
FOR UPDATE;

/* @name updatePlan */
-- Escribe el plan ya combinado y sube la versión; el comando lo edita con el plan bloqueado.
UPDATE maintenance.plans
SET title = :title!, interval_count = :intervalCount!, interval_unit = :intervalUnit!, starts_on = :startsOn!::date,
    checklist = :checklist!::text[], acceptance_criteria = :acceptanceCriteria, requirement = :requirement,
    version = version + 1
WHERE workspace_id = :workspaceId! AND id = :planId!;

/* @name archivePlan */
-- Los registros hechos con él lo conservan; deja de cubrir equipos.
UPDATE maintenance.plans
SET archived_at = now(), version = version + 1
WHERE workspace_id = :workspaceId! AND id = :planId!;

/* @name insertExclusion */
-- Una exclusión activa del mismo equipo (plan_exclusions_active) no inserta nada: el comando responde.
-- Con :replacedBy, el plan propio que la crea.
INSERT INTO maintenance.plan_exclusions (
  workspace_id, plan_id, asset_type_id, asset_id, reason, replaced_by_plan_id, created_by_principal_id
)
VALUES (:workspaceId!, :planId!, :assetTypeId!, :assetId!, :reason!, :replacedBy, :createdBy!)
ON CONFLICT (workspace_id, plan_id, asset_id) WHERE archived_at IS NULL DO NOTHING
RETURNING id;

/* @name archiveExclusion */
-- El equipo vuelve a quedar cubierto por el plan de su tipo.
UPDATE maintenance.plan_exclusions
SET archived_at = now()
WHERE workspace_id = :workspaceId! AND plan_id = :planId! AND asset_id = :assetId! AND archived_at IS NULL
RETURNING id;

/* @name archiveReplacedExclusions */
-- Al archivar un plan propio, sus equipos vuelven al plan de su tipo (índice plan_exclusions_replaced_by).
UPDATE maintenance.plan_exclusions
SET archived_at = now()
WHERE workspace_id = :workspaceId! AND replaced_by_plan_id = :planId! AND archived_at IS NULL
RETURNING plan_id, asset_id;

/* @name planAssets */
-- Los equipos que alcanza un plan, por código: los no dados de baja de su tipo, o su equipo. Incluidos, con
-- su próxima fecha (plan_assets); excluidos, con el motivo y el plan propio que los reemplaza.
SELECT a.id AS "id!", a.code AS "code!", a.name AS "name!", area.name AS "area_name?",
       pa.due_on AS "due_on?", pa.last_result AS "last_result?",
       x.reason AS "reason?", r.id AS "replaced_by_id?", r.title AS "replaced_by_title?", r.kind AS "replaced_by_kind?"
FROM maintenance.plans AS p
JOIN equipment.asset_directory AS a
  ON a.workspace_id = p.workspace_id AND (a.id = p.asset_id OR a.type_id = p.asset_type_id)
LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
LEFT JOIN maintenance.plan_assets AS pa ON pa.workspace_id = p.workspace_id AND pa.plan_id = p.id AND pa.asset_id = a.id
LEFT JOIN maintenance.plan_exclusions AS x
  ON x.workspace_id = p.workspace_id AND x.plan_id = p.id AND x.asset_id = a.id AND x.archived_at IS NULL
LEFT JOIN maintenance.plans AS r ON r.workspace_id = x.workspace_id AND r.id = x.replaced_by_plan_id
WHERE p.workspace_id = :workspaceId! AND p.id = :planId! AND a.condition <> 'retired'
ORDER BY lower(a.code), a.id;
