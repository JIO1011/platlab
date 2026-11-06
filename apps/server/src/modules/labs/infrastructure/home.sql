/* La tarjeta del Inicio de Laboratorios (ADR 0023, «Cierre de Laboratorios»). */

/* @name pendingRequestCounts */
-- Lo que espera programarse y, de ello, lo que llegó fuera de plazo.
SELECT count(*)::integer AS "pending!", count(*) FILTER (WHERE late)::integer AS "late!"
FROM labs.requests
WHERE workspace_id = :workspaceId! AND status = 'submitted';

/* @name requestsSentPerDay */
-- Solicitudes enviadas por primera vez cada día de los últimos :days días hasta :today, en la zona del espacio, con ceros.
SELECT to_char(d.day, 'YYYY-MM-DD') AS "date!", count(e.request_id)::integer AS "value!"
FROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)
LEFT JOIN labs.request_events AS e
  ON e.workspace_id = :workspaceId! AND e.action = 'submitted' AND (e.created_at AT TIME ZONE :timeZone!)::date = d.day::date
GROUP BY d.day
ORDER BY d.day;
