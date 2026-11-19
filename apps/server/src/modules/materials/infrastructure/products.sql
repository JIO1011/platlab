/* Clase de Materiales (03 §5): extensión 1:1 de un ítem `material` de inventario. */

/* @name insertProductDetail */
INSERT INTO materials.products (workspace_id, item_id, class)
VALUES (:workspaceId!, :itemId!, :class!)
RETURNING class;

/* @name findProductDetail */
SELECT class
FROM materials.products
WHERE workspace_id = :workspaceId! AND item_id = :itemId!;

/* @name listMaterials */
-- Con el total del espacio: suma exacta en numeric de todas sus ubicaciones.
-- Con :q, solo los materiales cuyo nombre o código lo contienen, plegados con inventory.fold_text. `\`, `%` y `_`
-- se escapan con `\` (chr(92), porque PgTyped no admite `\` en un literal) y cuentan como texto.
WITH search AS (
  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
)
SELECT
  i.id,
  i.code,
  i.name,
  i.base_unit,
  m.class,
  trim_scale(i.minimum_quantity) AS minimum,
  stock.balance AS "balance!",
  -- Lo disponible hoy: el saldo menos lo apartado, que incluye lo prestado (ADR 0025).
  stock.available AS "available!",
  -- Bajo mínimo: la existencia física total es menor que su mínimo (ADR 0012).
  (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS "below_minimum!",
  (SELECT count(*)
     FROM inventory.positions AS p
    WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0)::int AS "locations_with_stock!",
  -- Dónde está, de más a menos existencia: la tarjeta muestra los primeros nombres (sin ruta).
  (SELECT coalesce(array_agg(l.name ORDER BY p.balance DESC, l.name), '{}')
     FROM inventory.positions AS p
     JOIN core.locations AS l ON l.workspace_id = p.workspace_id AND l.id = p.location_id
    WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0) AS "location_names!",
  lower(i.code) AS "sort_code!"
FROM inventory.items AS i
JOIN materials.products AS m ON m.workspace_id = i.workspace_id AND m.item_id = i.id
CROSS JOIN LATERAL (
  SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance,
         trim_scale(coalesce(sum(p.balance - p.reserved), 0)) AS available
  FROM inventory.positions AS p
  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
) AS stock
CROSS JOIN search
WHERE i.workspace_id = :workspaceId!
  AND i.kind = 'material'
  AND i.archived_at IS NULL
  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
  AND (:class::text IS NULL OR m.class = :class::text)
  -- Con :stock = 'below-minimum', solo los que tienen mínimo y una existencia total menor que él.
  AND (:stock::text IS NULL OR (:stock::text = 'below-minimum' AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity))
  -- Con :areaId, solo los materiales con existencia en esa área (en cualquiera de sus ubicaciones).
  AND (:areaId::uuid IS NULL OR EXISTS (
         SELECT 1
           FROM inventory.positions AS p
           JOIN core.location_areas AS la ON la.workspace_id = p.workspace_id AND la.location_id = p.location_id
          WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0 AND la.area_id = :areaId::uuid))
  AND (search.pattern IS NULL
       OR inventory.fold_text(i.name) LIKE search.pattern
       OR lower(i.code) LIKE search.pattern)
  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
ORDER BY lower(i.code), i.id
LIMIT :limit!;

/* @name listMaterialAreas */
-- Las áreas con material en existencia: cuántos materiales hay en cada una y cuántos de ellos tienen algo prestado.
SELECT
  a.id,
  a.name,
  count(DISTINCT p.item_id)::int AS "materials!",
  count(DISTINCT p.item_id) FILTER (WHERE p.reserved > 0)::int AS "lent_materials!"
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id AND i.kind = 'material' AND i.archived_at IS NULL
JOIN core.location_areas AS la ON la.workspace_id = p.workspace_id AND la.location_id = p.location_id
JOIN core.locations AS a ON a.workspace_id = la.workspace_id AND a.id = la.area_id
WHERE p.workspace_id = :workspaceId! AND p.balance > 0
GROUP BY a.id, a.name
ORDER BY lower(a.name), a.id;
