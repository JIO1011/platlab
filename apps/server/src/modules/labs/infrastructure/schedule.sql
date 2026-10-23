/* Cronograma de Laboratorios (ADR 0023, L-01c): bloques por fecha, con su código y su responsable. */

/* @name listActivities */
-- Los bloques activos del rango (o solo :activityId), con lo que el bloque muestra: actividad, solicitante y grupo.
SELECT a.id, a.request_id, q.number AS request_number, coalesce(q.title, '') AS "title!",
  coalesce(requester.display_name, '') AS "requester_name!", subject.name AS "subject?", career.name AS "group?",
  coalesce(q.participants, 0) AS "participants!",
  a.on_date::text AS "date!", a.area_id, to_char(a.starts_at, 'HH24:MI') AS "starts_at!", to_char(a.ends_at, 'HH24:MI') AS "ends_at!",
  a.responsible_principal_id, coalesce(responsible.display_name, '') AS "responsible_name!", a.code, a.version
FROM labs.activities AS a
JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
LEFT JOIN labs.list_values AS subject ON subject.workspace_id = q.workspace_id AND subject.id = q.subject_id
LEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id
LEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id
LEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id
LEFT JOIN core.identities AS requester ON requester.id = rm.identity_id
LEFT JOIN core.principals AS pp ON pp.workspace_id = a.workspace_id AND pp.id = a.responsible_principal_id
LEFT JOIN core.memberships AS pm ON pm.workspace_id = pp.workspace_id AND pm.id = pp.membership_id
LEFT JOIN core.identities AS responsible ON responsible.id = pm.identity_id
WHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL
  AND (CASE WHEN :activityId::uuid IS NOT NULL THEN a.id = :activityId::uuid
            ELSE a.on_date BETWEEN :from::date AND :to::date END)
ORDER BY a.on_date, a.starts_at, a.area_id;

/* @name lockActivity */
-- Lo último del orden de bloqueo: el bloque que se mueve.
SELECT request_id, on_date::text AS "on_date!", area_id, period_id, week, sequence, code, version, cancelled_at
FROM labs.activities
WHERE workspace_id = :workspaceId! AND id = :activityId!
FOR UPDATE;

/* @name lockRequestForSchedule */
-- La solicitud que se programa, bloqueada: su estado, sus fechas y sus participantes deciden.
SELECT status, version, dates::text[] AS "dates!", coalesce(participants, 0) AS "participants!"
FROM labs.requests
WHERE workspace_id = :workspaceId! AND id = :requestId!
FOR UPDATE;

/* @name scheduleContext */
-- Lo que decide si se puede programar en el área ese día, leído en la misma transacción: aforo y horario del área
-- activa, períodos activos, cierres vigentes (del área y comunes) y los demás bloques activos del área.
SELECT s.capacity, s.weekly_hours, s.abbreviation,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'code', p.code, 'startsOn', p.starts_on, 'endsOn', p.ends_on)), '[]')
     FROM labs.periods AS p WHERE p.workspace_id = s.workspace_id AND p.archived_at IS NULL) AS "periods!",
  (SELECT coalesce(jsonb_agg(jsonb_build_object('startsOn', c.starts_on, 'endsOn', c.ends_on)), '[]')
     FROM labs.closures AS c
    WHERE c.workspace_id = s.workspace_id AND c.voided_at IS NULL AND (c.area_id IS NULL OR c.area_id = s.area_id)
      AND :date::date BETWEEN c.starts_on AND c.ends_on) AS "closures!",
  (SELECT coalesce(jsonb_agg(jsonb_build_object('startsAt', to_char(a.starts_at, 'HH24:MI'), 'endsAt', to_char(a.ends_at, 'HH24:MI'))), '[]')
     FROM labs.activities AS a
    WHERE a.workspace_id = s.workspace_id AND a.area_id = s.area_id AND a.on_date = :date::date AND a.cancelled_at IS NULL
      AND a.id IS DISTINCT FROM :exceptId::uuid) AS "others!"
FROM labs.spaces AS s
WHERE s.workspace_id = :workspaceId! AND s.area_id = :areaId! AND s.archived_at IS NULL;

/* @name nextActivitySequence */
-- El número siguiente del área en esa semana del período; la fila serializa a quienes programan a la vez.
INSERT INTO labs.activity_sequences (workspace_id, period_id, week, area_id, last_number)
VALUES (:workspaceId!, :periodId!, :week!, :areaId!, 1)
ON CONFLICT (workspace_id, period_id, week, area_id) DO UPDATE SET last_number = labs.activity_sequences.last_number + 1
RETURNING last_number AS "sequence!";

/* @name insertActivity */
INSERT INTO labs.activities (workspace_id, request_id, on_date, area_id, starts_at, ends_at, responsible_principal_id,
  period_id, week, sequence, code, created_by_principal_id)
VALUES (:workspaceId!, :requestId!, :date!::date, :areaId!, :startsAt!::time, :endsAt!::time, :responsibleId!, :periodId!,
  :week!, :sequence!, :code!, :createdBy!)
RETURNING id;

/* @name moveActivity */
UPDATE labs.activities
SET area_id = :areaId!, starts_at = :startsAt!::time, ends_at = :endsAt!::time, responsible_principal_id = :responsibleId!,
  period_id = :periodId!, week = :week!, sequence = :sequence!, code = :code!, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :activityId!;

/* @name insertActivityCode */
INSERT INTO labs.activity_codes (workspace_id, activity_id, code, principal_id)
VALUES (:workspaceId!, :activityId!, :code!, :principalId!);

/* @name markScheduled */
-- Con todas sus fechas programadas, la solicitud queda «programada»; devuelve si cambió.
UPDATE labs.requests AS q
SET status = 'scheduled', version = version + 1
WHERE q.workspace_id = :workspaceId! AND q.id = :requestId! AND q.status = 'submitted'
  AND cardinality(q.dates) = (SELECT count(*) FROM labs.activities AS a
                               WHERE a.workspace_id = q.workspace_id AND a.request_id = q.id AND a.cancelled_at IS NULL)
RETURNING id;

/* @name bumpRequest */
-- Programar una fecha sin completarlas también cambia la solicitud que otra persona pudo estar viendo.
UPDATE labs.requests SET version = version + 1
WHERE workspace_id = :workspaceId! AND id = :requestId!;
