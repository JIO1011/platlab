/* @name materialsSummary */
-- Las cifras del Resumen y de la tarjeta de Inicio: materiales activos, los que están bajo su mínimo, y los
-- préstamos abiertos y atrasados (abiertos con la fecha prevista vencida en la fecha civil del espacio), y los que
-- tienen un lote por vencer.
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
    WHERE l.workspace_id = :workspaceId! AND l.status = 'open' AND l.due_on < (now() AT TIME ZONE :timeZone!)::date)::int AS "overdue_loans!",
  -- Materiales con un lote con saldo que vence hasta :expiringBy, vencidos incluidos (MA-01f).
  (SELECT count(DISTINCT p.item_id)
     FROM inventory.positions AS p
     JOIN inventory.lots AS lot ON lot.workspace_id = p.workspace_id AND lot.id = p.lot_id
     JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL
    WHERE p.workspace_id = :workspaceId! AND p.balance > 0 AND lot.expires_on <= :expiringBy!::date)::int AS "expiring!";
