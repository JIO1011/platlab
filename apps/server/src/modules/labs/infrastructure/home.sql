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
