/* La tarjeta del Inicio de Laboratorios (ADR 0023, «Cierre de Laboratorios»). */

/* @name pendingRequestCounts */
-- Lo que espera programarse, lo que llegó fuera de plazo y lo que espera cambios de quien pidió. Con :requesterId, solo
-- las suyas.
SELECT count(*) FILTER (WHERE status = 'submitted')::integer AS "pending!",
  count(*) FILTER (WHERE status = 'submitted' AND late)::integer AS "late!",
  count(*) FILTER (WHERE status = 'changes_requested')::integer AS "attention!"
FROM labs.requests
WHERE workspace_id = :workspaceId! AND status IN ('submitted', 'changes_requested')
  AND (:requesterId::uuid IS NULL OR requester_principal_id = :requesterId::uuid);

/* @name requestsSentPerDay */
-- Solicitudes enviadas por primera vez cada día de los últimos :days días hasta :today, en la zona del espacio, con ceros.
-- Con :requesterId, solo las que envió esa persona.
SELECT to_char(d.day, 'YYYY-MM-DD') AS "date!", count(e.request_id)::integer AS "value!"
FROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)
LEFT JOIN labs.request_events AS e
  ON e.workspace_id = :workspaceId! AND e.action = 'submitted' AND (e.created_at AT TIME ZONE :timeZone!)::date = d.day::date
    AND (:requesterId::uuid IS NULL OR e.principal_id = :requesterId::uuid)
GROUP BY d.day
ORDER BY d.day;

/* @name agendaBlocks */
-- Actividad del Inicio (ADR 0026): los bloques activos de :date con su estado, el título de la solicitud, el área y el
-- grupo. Un día pasado solo muestra los cerrados. Con :requesterId, solo los de sus solicitudes.
SELECT a.id, coalesce(q.title, '') AS "title!", a.code, a.area_id, area.name AS "area_name?", career.name AS "group?",
  to_char(a.starts_at, 'HH24:MI') AS "starts_at!", to_char(a.ends_at, 'HH24:MI') AS "ends_at!", a.stage
FROM labs.activities AS a
JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
LEFT JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
LEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id
WHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.on_date = :date!::date
  AND (a.on_date >= :today!::date OR a.stage = 'closed')
  AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)
ORDER BY a.starts_at, a.code;

/* @name blocksPerDay */
-- El Calendario del Inicio: cuántos bloques de agendaBlocks tiene cada día de :from a :to, sin ceros.
SELECT a.on_date::text AS "date!", count(*)::integer AS "count!"
FROM labs.activities AS a
JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
WHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.on_date BETWEEN :from!::date AND :to!::date
  AND (a.on_date >= :today!::date OR a.stage = 'closed')
  AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)
GROUP BY a.on_date
ORDER BY a.on_date;

/* @name agendaAreas */
-- Las filas de Actividad (ADR 0026, revisión de IN-02): las áreas con horario de Laboratorios, también las libres.
SELECT area.id, area.name
FROM labs.spaces AS s
JOIN core.locations AS area ON area.workspace_id = s.workspace_id AND area.id = s.area_id
WHERE s.workspace_id = :workspaceId! AND s.archived_at IS NULL AND area.archived_at IS NULL
ORDER BY lower(area.name), area.id;

/* @name blocksToClose */
-- «Prácticas por cerrar» en el Inicio: bloques activos de días pasados que nadie cerró, los más antiguos primero, con
-- el título de la solicitud, el código y el área. Cada fila lleva el total antes del tope.
SELECT a.id, coalesce(q.title, '') AS "title!", a.code, area.name AS "area_name?", a.on_date::text AS "date!",
  count(*) OVER ()::integer AS "total!"
FROM labs.activities AS a
JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
LEFT JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
WHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.stage <> 'closed' AND a.on_date < :today!::date
ORDER BY a.on_date, a.starts_at, a.code
LIMIT :limit!;

/* @name requestCases */
-- «Solicitudes por programar» (:status submitted) y «Con cambios pedidos» (changes_requested, con :requesterId): las
-- que esperan desde hace más primero, con el docente y si llegó fuera de plazo. Cada fila lleva el total antes del tope.
SELECT q.id, coalesce(q.title, '') AS "title!", q.teacher_name, coalesce(q.late, false) AS "late!",
  (coalesce(q.submitted_at, q.updated_at) AT TIME ZONE :timeZone!)::date::text AS "date!",
  count(*) OVER ()::integer AS "total!"
FROM labs.requests AS q
WHERE q.workspace_id = :workspaceId! AND q.status = :status!
  AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)
ORDER BY coalesce(q.submitted_at, q.updated_at), q.id
LIMIT :limit!;
