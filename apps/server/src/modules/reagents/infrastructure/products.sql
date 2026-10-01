/* Detalle químico de Reactivos (03 §4): extensión 1:1 de un ítem `reagent` de inventario. */

/* @name insertProductDetail */
INSERT INTO reagents.products (workspace_id, item_id, cas_number, physical_state)
VALUES (:workspaceId!, :itemId!, :casNumber, :physicalState)
RETURNING cas_number, physical_state;

/* @name listProducts */
SELECT
  i.id,
  i.code,
  i.name,
  i.base_unit,
  r.cas_number,
  r.physical_state,
  lower(i.code) AS "sort_code!"
FROM inventory.items AS i
JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
WHERE i.workspace_id = :workspaceId!
  AND i.kind = 'reagent'
  AND i.archived_at IS NULL
  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
ORDER BY lower(i.code), i.id
LIMIT :limit!;

/* @name homeSummary */
-- Contadores de la tarjeta de Inicio, solo en las ubicaciones que el miembro puede consultar.
SELECT
  (SELECT count(*)
     FROM inventory.items AS i
     JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
    WHERE i.workspace_id = :workspaceId! AND i.archived_at IS NULL) AS "products!",
  (SELECT count(*)
     FROM inventory.positions AS p
     JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
    WHERE p.workspace_id = :workspaceId!
      AND i.kind = 'reagent'
      AND p.balance > 0
      AND p.location_id = ANY (:locationIds!::uuid[])) AS "positions_with_stock!";
