/* Detalle químico de Reactivos (03 §4): extensión 1:1 de un ítem `reagent` de inventario. */

/* @name insertProductDetail */
INSERT INTO reagents.products (workspace_id, item_id, cas_number, physical_state)
VALUES (:workspaceId!, :itemId!, :casNumber, :physicalState)
RETURNING cas_number, physical_state;

/* @name listProducts */
-- Con el total que el miembro puede consultar: suma exacta en numeric de sus ubicaciones autorizadas.
SELECT
  i.id,
  i.code,
  i.name,
  i.base_unit,
  r.cas_number,
  r.physical_state,
  (SELECT trim_scale(coalesce(sum(p.balance), 0))
     FROM inventory.positions AS p
    WHERE p.workspace_id = i.workspace_id
      AND p.item_id = i.id
      AND p.location_id = ANY (:locationIds!::uuid[])) AS "balance!",
  (SELECT count(*)
     FROM inventory.positions AS p
    WHERE p.workspace_id = i.workspace_id
      AND p.item_id = i.id
      AND p.balance > 0
      AND p.location_id = ANY (:locationIds!::uuid[]))::int AS "containers_with_stock!",
  -- Avisos de caducidad (ADR 0012, 05-10-2026): frascos con saldo; «hoy» es la fecha civil del espacio.
  (SELECT count(*)
     FROM inventory.positions AS p
     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
    WHERE p.workspace_id = i.workspace_id
      AND p.item_id = i.id
      AND p.balance > 0
      AND p.location_id = ANY (:locationIds!::uuid[])
      AND l.expires_on < (now() AT TIME ZONE :timeZone!)::date)::int AS "expired_containers!",
  (SELECT count(*)
     FROM inventory.positions AS p
     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
    WHERE p.workspace_id = i.workspace_id
      AND p.item_id = i.id
      AND p.balance > 0
      AND p.location_id = ANY (:locationIds!::uuid[])
      AND l.expires_on BETWEEN (now() AT TIME ZONE :timeZone!)::date
                           AND (now() AT TIME ZONE :timeZone!)::date + :expiringDays!::int)::int AS "expiring_containers!",
  lower(i.code) AS "sort_code!"
FROM inventory.items AS i
JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
WHERE i.workspace_id = :workspaceId!
  AND i.kind = 'reagent'
  AND i.archived_at IS NULL
  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
ORDER BY lower(i.code), i.id
LIMIT :limit!;

/* @name homeSummary */
-- Contadores del Resumen y de la tarjeta de Inicio: inventario que el miembro puede consultar, no
-- filas del catálogo. Vencido y por vencer (ADR 0012, 05-10-2026): frascos con saldo, con «hoy» en
-- la fecha civil del espacio; por vencer incluye hoy y los próximos :expiringDays días (02 §12).
WITH stocked AS (
  SELECT p.item_id, l.expires_on
  FROM inventory.positions AS p
  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
  JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
  WHERE p.workspace_id = :workspaceId!
    AND i.kind = 'reagent'
    AND p.balance > 0
    AND p.location_id = ANY (:locationIds!::uuid[])
), today AS (
  SELECT (now() AT TIME ZONE :timeZone!)::date AS d
)
SELECT
  (SELECT count(DISTINCT item_id) FROM stocked) AS "products_with_stock!",
  (SELECT count(*) FROM stocked) AS "containers_with_stock!",
  (SELECT count(*) FROM stocked, today WHERE stocked.expires_on < today.d) AS "expired_containers!",
  (SELECT count(*) FROM stocked, today
    WHERE stocked.expires_on BETWEEN today.d AND today.d + :expiringDays!::int) AS "expiring_containers!";

/* @name listProductLots */
-- Lotes de un reactivo del espacio, para elegirlos al registrar un ingreso.
SELECT l.id, l.item_id, l.code, l.supplier_name, l.supplier_lot, l.expires_on, l.condition
FROM inventory.lots AS l
JOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id
WHERE l.workspace_id = :workspaceId!
  AND l.item_id = :itemId!
  AND i.kind = 'reagent'
  AND i.archived_at IS NULL
ORDER BY l.expires_on NULLS LAST, lower(l.code), l.id
LIMIT 200;

/* @name listLocationsIn */
SELECT id, code, name, kind
FROM core.locations
WHERE workspace_id = :workspaceId!
  AND id = ANY (:locationIds!::uuid[])
  AND archived_at IS NULL
ORDER BY lower(code), id;
