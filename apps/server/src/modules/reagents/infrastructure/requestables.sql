/* Lo que otro módulo puede pedir de Reactivos (Laboratorios, ADR 0023): nombre y unidad. Lo que hay lo dice
   `reagentStockByArea`, la misma cuenta con la que se aparta. */

/* @name requestableReagents */
-- Reactivos activos. Con :itemIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los que
-- contienen :q.
SELECT i.id, i.code, i.name, i.base_unit AS unit
FROM inventory.items AS i
JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
WHERE i.workspace_id = :workspaceId!
  AND i.kind = 'reagent'
  AND (CASE WHEN :itemIds::uuid[] IS NOT NULL THEN i.id = ANY (:itemIds::uuid[])
            ELSE i.archived_at IS NULL
              AND (inventory.fold_text(i.name) LIKE '%' || inventory.fold_text(:q::text) || '%'
                   OR lower(i.code) LIKE '%' || lower(:q::text) || '%') END)
ORDER BY inventory.fold_text(i.name), i.id
LIMIT 200;
