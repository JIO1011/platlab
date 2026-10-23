/* Solicitudes de Laboratorios (ADR 0023, «Diseño de L-01b»): borrador, envío, cambios, rechazo y cancelación. */

/* @name nextRequestNumber */
-- El número siguiente del espacio (SOL-0042). La fila del contador serializa a quienes crean a la vez, y un
-- número tomado no vuelve aunque la solicitud se cancele.
INSERT INTO labs.request_counters (workspace_id, last_number)
VALUES (:workspaceId!, 1)
ON CONFLICT (workspace_id) DO UPDATE SET last_number = labs.request_counters.last_number + 1
RETURNING last_number AS "number!";

/* @name activeFormRevision */
-- La última revisión de un formato activo: la que llena un borrador nuevo.
SELECT max(r.revision) AS revision
FROM labs.forms AS f
JOIN labs.form_revisions AS r ON r.workspace_id = f.workspace_id AND r.form_id = f.id
WHERE f.workspace_id = :workspaceId! AND f.id = :formId! AND f.archived_at IS NULL;

/* @name revisionLayout */
SELECT layout
FROM labs.form_revisions
WHERE workspace_id = :workspaceId! AND form_id = :formId! AND revision = :revision!;

/* @name insertRequest */
INSERT INTO labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id, title, teacher_name,
  activity_type, subject_id, career_id, dates, starts_at, ends_at, participants, groups, area_id, answers, notes)
VALUES (:workspaceId!, :number!, :formId!, :formRevision!, :requesterId!, :title, :teacherName, :activityType, :subjectId,
  :careerId, :dates!::date[], :startsAt::time, :endsAt::time, :participants, :groups!, :areaId, :answers!::jsonb, :notes)
RETURNING id;

/* @name listRequests */
-- Con :requestId, solo esa (quién la ve lo decide el comando). Si no, con :requesterId, las de esa persona
-- (borradores incluidos), o las recibidas: sin borradores. Activas primero y, dentro, por la fecha más próxima.
SELECT
  q.id, q.number, q.status, q.form_id, q.form_revision, f.name AS form_name, r.title AS form_title, r.document_code,
  r.layout, q.requester_principal_id, coalesce(ident.display_name, '') AS "requester_name!",
  q.title, q.teacher_name, q.activity_type, subject.name AS "subject?", career.name AS "career?",
  q.dates::text[] AS "dates!", to_char(q.starts_at, 'HH24:MI') AS starts_at, to_char(q.ends_at, 'HH24:MI') AS ends_at,
  q.participants, q.groups, q.area_id, q.answers, q.notes, q.late, q.submitted_at, q.version,
  (SELECT count(*) FROM labs.activities AS a
    WHERE a.workspace_id = q.workspace_id AND a.request_id = q.id AND a.cancelled_at IS NULL)::int AS "scheduled_count!"
FROM labs.requests AS q
JOIN labs.forms AS f ON f.workspace_id = q.workspace_id AND f.id = q.form_id
JOIN labs.form_revisions AS r ON r.workspace_id = q.workspace_id AND r.form_id = q.form_id AND r.revision = q.form_revision
LEFT JOIN labs.list_values AS subject ON subject.workspace_id = q.workspace_id AND subject.id = q.subject_id
LEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id
LEFT JOIN core.principals AS pr ON pr.workspace_id = q.workspace_id AND pr.id = q.requester_principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
WHERE q.workspace_id = :workspaceId!
  AND (CASE WHEN :requestId::uuid IS NOT NULL THEN q.id = :requestId::uuid
            WHEN :requesterId::uuid IS NOT NULL THEN q.requester_principal_id = :requesterId::uuid
            ELSE q.status <> 'draft' END)
ORDER BY q.status IN ('rejected', 'cancelled'), q.dates[1] NULLS LAST, q.number DESC
LIMIT 500;

/* @name requestLines */
SELECT request_id, line, kind, item_id, asset_type_id, description, trim_scale(quantity)::text AS "quantity!",
  trim_scale(per_group)::text AS per_group, unit
FROM labs.request_lines
WHERE workspace_id = :workspaceId! AND request_id = ANY (:requestIds!::uuid[])
ORDER BY request_id, line;

/* @name requestEvents */
SELECT e.action, e.reason, coalesce(ident.display_name, '') AS "by!", e.created_at
FROM labs.request_events AS e
LEFT JOIN core.principals AS pr ON pr.workspace_id = e.workspace_id AND pr.id = e.principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
WHERE e.workspace_id = :workspaceId! AND e.request_id = :requestId!
ORDER BY e.created_at, e.id;

/* @name lockRequest */
-- Lo último del orden de bloqueo (02 §6): la solicitud que se guarda, se envía o se resuelve.
SELECT status, version, requester_principal_id
FROM labs.requests
WHERE workspace_id = :workspaceId! AND id = :requestId!
FOR UPDATE;

/* @name insertListValue */
-- Un nombre que ya está en la lista (sin tildes ni mayúsculas) no inserta nada.
INSERT INTO labs.list_values (workspace_id, kind, name, created_by_principal_id)
VALUES (:workspaceId!, :kind!, :name!, :createdBy!)
ON CONFLICT (workspace_id, kind, core.fold_text(name)) DO NOTHING
RETURNING id;

/* @name listValueNamed */
SELECT id
FROM labs.list_values
WHERE workspace_id = :workspaceId! AND kind = :kind! AND core.fold_text(name) = core.fold_text(:name!);

/* @name listValues */
SELECT kind, name
FROM labs.list_values
WHERE workspace_id = :workspaceId!
ORDER BY kind, core.fold_text(name);

/* @name activeSpace */
SELECT 1 AS "found!"
FROM labs.spaces
WHERE workspace_id = :workspaceId! AND area_id = :areaId! AND archived_at IS NULL;

/* @name writeRequest */
UPDATE labs.requests
SET title = :title, teacher_name = :teacherName, activity_type = :activityType, subject_id = :subjectId,
  career_id = :careerId, dates = :dates!::date[], starts_at = :startsAt::time, ends_at = :endsAt::time,
  participants = :participants, groups = :groups!, area_id = :areaId, answers = :answers!::jsonb, notes = :notes,
  version = version + 1
WHERE workspace_id = :workspaceId! AND id = :requestId!;

/* @name deleteRequestLines */
DELETE FROM labs.request_lines
WHERE workspace_id = :workspaceId! AND request_id = :requestId!;

/* @name insertRequestLines */
-- Todas las líneas en una sentencia, numeradas en el orden en que llegan. Con «por grupo», el total es por grupo
-- × :groups (ADR 0023, «Cantidades»), exacto en numeric.
INSERT INTO labs.request_lines (workspace_id, request_id, line, kind, item_id, asset_type_id, description, quantity, per_group, unit)
SELECT :workspaceId!, :requestId!, e.n, l.kind, l.item_id, l.asset_type_id, l.description,
  coalesce(l.per_group * :groups!::integer, l.quantity), l.per_group, l.unit
FROM jsonb_array_elements(:lines!::jsonb) WITH ORDINALITY AS e (value, n)
CROSS JOIN LATERAL jsonb_to_record(e.value) AS l (kind text, item_id uuid, asset_type_id uuid, description text,
  quantity numeric, per_group numeric, unit text);

/* @name setRequestStatus */
-- Enviar fija la fecha de envío y si llega fuera de plazo; resolver o cancelar solo cambia el estado.
UPDATE labs.requests
SET status = :status!, late = coalesce(:late, late), submitted_at = coalesce(:submittedAt::timestamptz, submitted_at),
  version = version + 1
WHERE workspace_id = :workspaceId! AND id = :requestId!;

/* @name insertRequestEvent */
INSERT INTO labs.request_events (workspace_id, request_id, action, reason, principal_id)
VALUES (:workspaceId!, :requestId!, :action!, :reason, :principalId!);

/* @name datesOutsidePeriods */
-- Las fechas que no caen en ningún período activo: fuera de ellos no se agenda.
SELECT d::text AS "date!"
FROM unnest(:dates!::date[]) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM labs.periods AS p
  WHERE p.workspace_id = :workspaceId! AND p.archived_at IS NULL AND d BETWEEN p.starts_on AND p.ends_on
)
ORDER BY d;

/* @name requestBlocks */
-- El bloque activo de cada fecha programada (L-01c).
SELECT a.on_date::text AS "date!", a.code, a.area_id, area.name AS area_name, to_char(a.starts_at, 'HH24:MI') AS "starts_at!",
  to_char(a.ends_at, 'HH24:MI') AS "ends_at!", coalesce(ident.display_name, '') AS "responsible_name!"
FROM labs.activities AS a
JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
LEFT JOIN core.principals AS pr ON pr.workspace_id = a.workspace_id AND pr.id = a.responsible_principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
WHERE a.workspace_id = :workspaceId! AND a.request_id = :requestId! AND a.cancelled_at IS NULL
ORDER BY a.on_date;

/* @name releaseRequestBlocks */
-- Libera los bloques activos de la solicitud al cancelarla, rechazarla o pedir cambios; quedan en su historial.
UPDATE labs.activities
SET cancelled_at = now(), version = version + 1
WHERE workspace_id = :workspaceId! AND request_id = :requestId! AND cancelled_at IS NULL;
