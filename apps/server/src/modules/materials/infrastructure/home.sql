/*
 * El Inicio (ADR 0026, «Diseño de IN-01»): una devolución cuenta el día previsto. Un día pasado solo muestra los
 * préstamos cerrados: los atrasados van en «Por atender».
 */

/* @name agendaReturns */
-- Los préstamos con devolución prevista el :date, con quien se llevó el material.
SELECT l.id, l.number, l.status, borrower.display_name AS "borrower_name!"
FROM materials.loans AS l
JOIN LATERAL (
  SELECT ident.display_name
  FROM core.principals AS pr
  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  JOIN core.identities AS ident ON ident.id = m.identity_id
  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id
) AS borrower ON true
WHERE l.workspace_id = :workspaceId! AND l.due_on = :date!::date AND (l.status = 'closed' OR l.due_on >= :today!::date)
ORDER BY l.number;

/* @name returnsPerDay */
-- El Calendario: cuántos de agendaReturns tiene cada día de :from a :to, sin ceros.
SELECT l.due_on::text AS "date!", count(*)::integer AS "count!"
FROM materials.loans AS l
WHERE l.workspace_id = :workspaceId! AND l.due_on BETWEEN :from!::date AND :to!::date
  AND (l.status = 'closed' OR l.due_on >= :today!::date)
GROUP BY l.due_on
ORDER BY l.due_on;
