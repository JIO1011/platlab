/*
 * Los casos de «Por atender» de Reactivos en el Inicio (ADR 0026, revisión de IN-02), con los mismos filtros que las
 * cifras de homeSummary (products.sql). Cada fila lleva el total antes del tope.
 */

/* @name containerCases */
-- Frascos con saldo vencidos (:expired) o por vencer (hoy y los próximos :expiringDays días), los que vencen antes
-- primero, con su reactivo, en la fecha civil del espacio.
WITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)
SELECT i.id AS "product_id!", i.name AS "product_name!", c.code AS "container_code?", l.expires_on::text AS "expires_on!",
  count(*) OVER ()::integer AS "total!"
FROM inventory.positions AS p
CROSS JOIN today
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
WHERE p.workspace_id = :workspaceId! AND i.kind = 'reagent' AND p.balance > 0
  AND CASE WHEN :expired!::boolean THEN l.expires_on < today.d
           ELSE l.expires_on BETWEEN today.d AND today.d + :expiringDays!::int END
ORDER BY l.expires_on, lower(i.name), c.code
LIMIT :limit!;

/* @name belowMinimumCases */
-- Reactivos activos con mínimo cuya existencia física es menor, los más lejos de su mínimo primero.
SELECT i.id, i.name, count(*) OVER ()::integer AS "total!"
FROM inventory.items AS i
CROSS JOIN LATERAL (
  SELECT coalesce(sum(p.balance), 0) AS balance
  FROM inventory.positions AS p
  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
) AS stock
WHERE i.workspace_id = :workspaceId! AND i.kind = 'reagent' AND i.archived_at IS NULL
  AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity
ORDER BY stock.balance / i.minimum_quantity, lower(i.name), i.id
LIMIT :limit!;
