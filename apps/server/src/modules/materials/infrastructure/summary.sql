/* @name materialsSummary */
-- Las cifras del Resumen y de la tarjeta de Inicio: materiales activos, los que están bajo su mínimo, y los
-- préstamos abiertos y atrasados (abiertos con la fecha prevista vencida en la fecha civil del espacio).
SELECT
  (SELECT count(*)
     FROM inventory.items AS i
     JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id
    WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL)::int AS "materials!",
  (SELECT count(*)
     FROM inventory.items AS i
    WHERE i.workspace_id = :workspaceId! AND i.kind = 'material' AND i.archived_at IS NULL
      AND i.minimum_quantity IS NOT NULL
      AND (SELECT coalesce(sum(p.balance), 0)
             FROM inventory.positions AS p
            WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id) < i.minimum_quantity)::int AS "below_minimum!",
  (SELECT count(*) FROM materials.loans AS l
    WHERE l.workspace_id = :workspaceId! AND l.status = 'open')::int AS "open_loans!",
  (SELECT count(*) FROM materials.loans AS l
    WHERE l.workspace_id = :workspaceId! AND l.status = 'open' AND l.due_on < (now() AT TIME ZONE :timeZone!)::date)::int AS "overdue_loans!";
