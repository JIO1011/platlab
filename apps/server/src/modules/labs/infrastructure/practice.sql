/* Preparación y cierre de cada bloque (ADR 0023, «Cierre de Laboratorios», L-01e). */

/* @name lockActivityRequest */
-- Primero la solicitud del bloque, como al programar o liberar (solicitud → bloque): así avanzar una práctica y
-- cancelar su solicitud no se cruzan.
SELECT q.id, q.status
FROM labs.requests AS q
JOIN labs.activities AS a ON a.workspace_id = q.workspace_id AND a.request_id = q.id
WHERE a.workspace_id = :workspaceId! AND a.id = :activityId!
FOR UPDATE OF q;

/* @name lockPractice */
-- Después, el bloque que avanza: su etapa, su día, su código y su área.
SELECT a.request_id, a.on_date::text AS "on_date!", a.stage, a.version, a.cancelled_at, a.code, area.name AS area_name
FROM labs.activities AS a
JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
WHERE a.workspace_id = :workspaceId! AND a.id = :activityId!
FOR UPDATE OF a;

/* @name setPreparedLines */
UPDATE labs.activities
SET prepared_lines = :lines!::smallint[], version = version + 1
WHERE workspace_id = :workspaceId! AND id = :activityId!;

/* @name advanceStage */
-- Un paso adelante con quién y cuándo: lista, en curso o cerrada (con sus observaciones).
UPDATE labs.activities
SET stage = :stage!,
  ready_at = CASE WHEN :stage! = 'ready' THEN now() ELSE ready_at END,
  ready_by_principal_id = CASE WHEN :stage! = 'ready' THEN :principalId!::uuid ELSE ready_by_principal_id END,
  started_at = CASE WHEN :stage! = 'running' THEN now() ELSE started_at END,
  started_by_principal_id = CASE WHEN :stage! = 'running' THEN :principalId!::uuid ELSE started_by_principal_id END,
  closed_at = CASE WHEN :stage! = 'closed' THEN now() ELSE closed_at END,
  closed_by_principal_id = CASE WHEN :stage! = 'closed' THEN :principalId!::uuid ELSE closed_by_principal_id END,
  closing_notes = CASE WHEN :stage! = 'closed' THEN :notes ELSE closing_notes END,
  version = version + 1
WHERE workspace_id = :workspaceId! AND id = :activityId!;

/* @name insertUsage */
INSERT INTO labs.activity_usage (workspace_id, activity_id, line, held, used)
VALUES (:workspaceId!, :activityId!, :line!, :held!::numeric, :used!::numeric);

/* @name completeRequest */
-- Con todas sus fechas programadas y todos sus bloques activos cerrados, la solicitud queda «finalizada».
UPDATE labs.requests AS q
SET status = 'completed', version = version + 1
WHERE q.workspace_id = :workspaceId! AND q.id = :requestId! AND q.status = 'scheduled'
  AND NOT EXISTS (SELECT 1 FROM labs.activities AS a
                  WHERE a.workspace_id = q.workspace_id AND a.request_id = q.id AND a.cancelled_at IS NULL AND a.stage <> 'closed')
RETURNING id;

/* @name activityUsage */
-- Lo apartado, utilizado y devuelto de cada reactivo de esos bloques cerrados.
SELECT activity_id, line, trim_scale(held)::text AS "held!", trim_scale(used)::text AS "used!", trim_scale(returned)::text AS "returned!"
FROM labs.activity_usage
WHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[])
ORDER BY activity_id, line;

/* @name blockAsset */
-- Un equipo apartado vigente del bloque: de él se reporta un incidente.
SELECT asset_id
FROM labs.activity_assets
WHERE workspace_id = :workspaceId! AND activity_id = :activityId! AND asset_id = :assetId! AND released_at IS NULL;

/* @name insertActivityIncident */
INSERT INTO labs.activity_incidents (workspace_id, activity_id, case_id)
VALUES (:workspaceId!, :activityId!, :caseId!);

/* @name upcomingAssetBookings */
-- Las próximas reservas vigentes de un equipo desde :from («Reservado» en Equipos), hasta diez.
SELECT a.id, a.on_date::text AS "date!", to_char(lower(aa.during), 'HH24:MI') AS "starts_at!",
  to_char(upper(aa.during), 'HH24:MI') AS "ends_at!", a.code, area.name AS area_name, a.stage,
  coalesce(requester.display_name, '') AS "requester_name!"
FROM labs.activity_assets AS aa
JOIN labs.activities AS a ON a.workspace_id = aa.workspace_id AND a.id = aa.activity_id
JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
LEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id
LEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id
LEFT JOIN core.identities AS requester ON requester.id = rm.identity_id
WHERE aa.workspace_id = :workspaceId! AND aa.asset_id = :assetId! AND aa.released_at IS NULL
  AND a.cancelled_at IS NULL AND a.stage <> 'closed' AND a.on_date >= :from!::date
ORDER BY lower(aa.during)
LIMIT 10;

/* @name incidentPractice */
-- La práctica en que ocurrió un incidente de Equipos, si nació de una.
SELECT a.id, a.code, a.on_date::text AS "date!", to_char(a.starts_at, 'HH24:MI') AS "starts_at!",
  to_char(a.ends_at, 'HH24:MI') AS "ends_at!", area.name AS area_name, coalesce(q.title, '') AS "title!",
  coalesce(requester.display_name, '') AS "requester_name!"
FROM labs.activity_incidents AS i
JOIN labs.activities AS a ON a.workspace_id = i.workspace_id AND a.id = i.activity_id
JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
LEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id
LEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id
LEFT JOIN core.identities AS requester ON requester.id = rm.identity_id
WHERE i.workspace_id = :workspaceId! AND i.case_id = :caseId!;
