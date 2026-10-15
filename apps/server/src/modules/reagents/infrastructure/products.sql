/* Detalle químico de Reactivos (03 §4): extensión 1:1 de un ítem `reagent` de inventario. */

/* @name insertProductDetail */
INSERT INTO reagents.products
  (workspace_id, item_id, cas_number, physical_state, hazards, controlled, sds_kind, sds_url, density)
VALUES
  (:workspaceId!, :itemId!, :casNumber, :physicalState!, :hazards!::text[], :controlled!, :sdsKind, :sdsUrl, :density::numeric)
RETURNING cas_number, physical_state, hazards, controlled, sds_kind, sds_url, trim_scale(density) AS density;

/* @name findProductDetail */
-- La ficha química de un reactivo del espacio (ADR 0015).
SELECT cas_number, physical_state, hazards, controlled, sds_kind, sds_url, trim_scale(density) AS density
FROM reagents.products
WHERE workspace_id = :workspaceId! AND item_id = :itemId!;

/* @name updateProductDetail */
-- Escribe la ficha ya combinada; el comando la edita con el ítem bloqueado.
UPDATE reagents.products
SET cas_number = :casNumber, physical_state = :physicalState, hazards = :hazards!::text[], controlled = :controlled!,
    sds_kind = :sdsKind, sds_url = :sdsUrl, density = :density::numeric
WHERE workspace_id = :workspaceId! AND item_id = :itemId!
RETURNING item_id;

/* @name listProductSafety */
-- Marca de controlado (ADR 0015) y ficha de seguridad (ADR 0016) de los reactivos de unos frascos.
SELECT item_id, controlled, sds_kind, sds_url
FROM reagents.products
WHERE workspace_id = :workspaceId! AND item_id = ANY (:itemIds!::uuid[]);

/* @name listProducts */
-- Con el total que el miembro puede consultar: suma exacta en numeric de sus ubicaciones autorizadas.
-- Con :q, solo los reactivos cuyo nombre, código o CAS lo contienen, plegados con inventory.fold_text
-- (código y CAS son ASCII por su CHECK). `\`, `%` y `_` se escapan con `\` (el escape por omisión de
-- LIKE; chr(92), porque PgTyped no admite `\` en un literal) y cuentan como texto.
WITH search AS (
  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
)
SELECT
  i.id,
  i.code,
  i.name,
  i.base_unit,
  r.cas_number,
  r.physical_state,
  r.hazards,
  r.controlled,
  r.sds_kind,
  r.sds_url,
  trim_scale(r.density) AS density,
  trim_scale(i.minimum_quantity) AS minimum,
  stock.balance AS "balance!",
  -- Bajo mínimo (ADR 0012, 05-10-2026): existencia física, con los vencidos y lo apartado.
  (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS "below_minimum!",
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
CROSS JOIN LATERAL (
  SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance
  FROM inventory.positions AS p
  WHERE p.workspace_id = i.workspace_id
    AND p.item_id = i.id
    AND p.location_id = ANY (:locationIds!::uuid[])
) AS stock
CROSS JOIN search
WHERE i.workspace_id = :workspaceId!
  AND i.kind = 'reagent'
  AND i.archived_at IS NULL
  AND (:productId::uuid IS NULL OR i.id = :productId::uuid)
  AND (search.pattern IS NULL
       OR inventory.fold_text(i.name) LIKE search.pattern
       OR lower(i.code) LIKE search.pattern
       OR r.cas_number LIKE search.pattern)
  AND (:afterId::uuid IS NULL OR (lower(i.code), i.id) > (:afterCode::text, :afterId::uuid))
ORDER BY lower(i.code), i.id
LIMIT :limit!;

/* @name homeSummary */
-- Contadores del Resumen y de la tarjeta de Inicio: inventario que el miembro puede consultar, no
-- filas del catálogo. Vencido y por vencer (ADR 0012, 05-10-2026): frascos con saldo, con «hoy» en
-- la fecha civil del espacio; por vencer incluye hoy y los próximos :expiringDays días (02 §12).
-- Bajo mínimo: reactivos activos con mínimo cuya existencia física es menor (ADR 0012, 05-10-2026).
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
), minimums AS (
  SELECT i.minimum_quantity,
         (SELECT coalesce(sum(p.balance), 0)
            FROM inventory.positions AS p
           WHERE p.workspace_id = i.workspace_id
             AND p.item_id = i.id
             AND p.location_id = ANY (:locationIds!::uuid[])) AS balance
  FROM inventory.items AS i
  WHERE i.workspace_id = :workspaceId!
    AND i.kind = 'reagent'
    AND i.archived_at IS NULL
    AND i.minimum_quantity IS NOT NULL
)
SELECT
  (SELECT count(DISTINCT item_id) FROM stocked) AS "products_with_stock!",
  (SELECT count(*) FROM stocked) AS "containers_with_stock!",
  (SELECT count(*) FROM stocked, today WHERE stocked.expires_on < today.d) AS "expired_containers!",
  (SELECT count(*) FROM stocked, today
    WHERE stocked.expires_on BETWEEN today.d AND today.d + :expiringDays!::int) AS "expiring_containers!",
  (SELECT count(*) FROM minimums WHERE balance < minimum_quantity) AS "below_minimum!",
  (SELECT count(*) FROM minimums) AS "products_with_minimum!";

/* @name listLocationsIn */
SELECT id, code, name, kind, parent_id
FROM core.locations
WHERE workspace_id = :workspaceId!
  AND id = ANY (:locationIds!::uuid[])
  AND archived_at IS NULL
ORDER BY lower(code), id;
