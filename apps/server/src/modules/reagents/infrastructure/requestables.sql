/* Lo que otro módulo puede pedir de Reactivos (Laboratorios, ADR 0023): nombre, unidad y lo usable hoy. */

/* @name requestableReagents */
-- Reactivos activos con lo usable hoy: posiciones «usable» de lotes sin vencer en el día civil del espacio. Con
-- :itemIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los que contienen :q.
SELECT
  i.id,
  i.code,
  i.name,
  i.base_unit AS unit,
  trim_scale(coalesce((
    SELECT sum(p.balance)
    FROM inventory.positions AS p
    JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
    WHERE p.workspace_id = i.workspace_id
      AND p.item_id = i.id
      AND p.disposition = 'usable'
      AND (l.expires_on IS NULL OR l.expires_on >= (now() AT TIME ZONE :timeZone!)::date)
  ), 0))::text AS "available!"
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
