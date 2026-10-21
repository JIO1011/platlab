/* Detalle químico de Reactivos (03 §4): extensión 1:1 de un ítem `reagent` de inventario. */

/* @name insertProductDetail */
INSERT INTO reagents.products
  (workspace_id, item_id, cas_number, physical_state, hazards, controlled, sds_kind, sds_url, density)
VALUES
  (:workspaceId!, :itemId!, :casNumber, :physicalState!, :hazards!::text[], :controlled!, :sdsKind, :sdsUrl, :density::numeric)
RETURNING cas_number, physical_state, hazards, controlled, sds_kind, sds_url, sds_sheet_id,
  NULL::text AS sds_file_url, trim_scale(density) AS density;

/* @name findProductDetail */
-- La ficha química de un reactivo del espacio (ADR 0015), con el PDF vigente de su ficha de seguridad (ADR 0017).
SELECT r.cas_number, r.physical_state, r.hazards, r.controlled, r.sds_kind, r.sds_url, r.sds_sheet_id,
       s.url AS "sds_file_url?", trim_scale(r.density) AS density
FROM reagents.products AS r
LEFT JOIN reagents.safety_sheets AS s ON s.workspace_id = r.workspace_id AND s.id = r.sds_sheet_id
WHERE r.workspace_id = :workspaceId! AND r.item_id = :itemId!;

/* @name updateProductDetail */
-- Escribe la ficha ya combinada; el comando la edita con el ítem bloqueado. Sin :keepSheet, el reactivo
-- deja de apuntar a su PDF (ADR 0017), que sigue en el historial.
UPDATE reagents.products
SET cas_number = :casNumber, physical_state = :physicalState, hazards = :hazards!::text[], controlled = :controlled!,
    sds_kind = :sdsKind, sds_url = :sdsUrl, density = :density::numeric,
    sds_sheet_id = CASE WHEN :keepSheet!::boolean THEN sds_sheet_id END
WHERE workspace_id = :workspaceId! AND item_id = :itemId!
RETURNING item_id;

/* @name insertSafetySheet */
-- Un PDF subido (ADR 0017): fila nueva, nunca reemplaza otra.
INSERT INTO reagents.safety_sheets
  (workspace_id, id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
VALUES
  (:workspaceId!, :id!, :productId!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)
RETURNING id;

/* @name pointProductSheet */
-- El PDF pasa a ser la ficha vigente: digital y sin enlace, que es la otra forma de ficha.
UPDATE reagents.products
SET sds_kind = 'digital', sds_url = NULL, sds_sheet_id = :sheetId!
WHERE workspace_id = :workspaceId! AND item_id = :itemId!
RETURNING item_id;

/* @name listProductSafety */
-- Marca de controlado (ADR 0015) y ficha de seguridad (ADR 0016) de los reactivos de unos frascos.
SELECT r.item_id, r.controlled, r.sds_kind, r.sds_url, s.url AS "sds_file_url?"
FROM reagents.products AS r
LEFT JOIN reagents.safety_sheets AS s ON s.workspace_id = r.workspace_id AND s.id = r.sds_sheet_id
WHERE r.workspace_id = :workspaceId! AND r.item_id = ANY (:itemIds!::uuid[]);

/* @name listProducts */
-- Con el total del espacio: suma exacta en numeric de todas sus ubicaciones.
-- Con :q, solo los reactivos cuyo nombre, código o CAS lo contienen, plegados con inventory.fold_text
-- (código y CAS son ASCII por su CHECK). `\`, `%` y `_` se escapan con `\` (el escape por omisión de
-- LIKE; chr(92), porque PgTyped no admite `\` en un literal) y cuentan como texto.
WITH search AS (
  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
),
-- El área de cada ubicación del espacio, calculada una sola vez para todos los reactivos.
place AS MATERIALIZED (
  SELECT location_id, area_id FROM core.location_areas WHERE workspace_id = :workspaceId!
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
  sheet.url AS "sds_file_url?",
  trim_scale(r.density) AS density,
  trim_scale(i.minimum_quantity) AS minimum,
  stock.balance AS "balance!",
  -- Bajo mínimo (ADR 0012, 05-10-2026): existencia física, con los vencidos y lo apartado.
  (i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity) AS "below_minimum!",
  (SELECT count(*)
     FROM inventory.positions AS p
    WHERE p.workspace_id = i.workspace_id
      AND p.item_id = i.id
      AND p.balance > 0)::int AS "containers_with_stock!",
  -- Avisos de caducidad (ADR 0012, 05-10-2026): frascos con saldo; «hoy» es la fecha civil del espacio.
  (SELECT count(*)
     FROM inventory.positions AS p
     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
    WHERE p.workspace_id = i.workspace_id
      AND p.item_id = i.id
      AND p.balance > 0
      AND l.expires_on < (now() AT TIME ZONE :timeZone!)::date)::int AS "expired_containers!",
  (SELECT count(*)
     FROM inventory.positions AS p
     JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
    WHERE p.workspace_id = i.workspace_id
      AND p.item_id = i.id
      AND p.balance > 0
      AND l.expires_on BETWEEN (now() AT TIME ZONE :timeZone!)::date
                           AND (now() AT TIME ZONE :timeZone!)::date + :expiringDays!::int)::int AS "expiring_containers!",
  -- Dónde tiene existencias (ADR 0024): las cifras de la sección Áreas abren el Inventario filtrado por ellas.
  ARRAY(SELECT DISTINCT place.area_id
          FROM inventory.positions AS p
          JOIN place ON place.location_id = p.location_id
         WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0) AS "area_ids!",
  ARRAY(SELECT DISTINCT l.department_id
          FROM inventory.positions AS p
          JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
         WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id AND p.balance > 0
           AND l.department_id IS NOT NULL) AS "department_ids!",
  lower(i.code) AS "sort_code!"
FROM inventory.items AS i
JOIN reagents.products AS r ON r.workspace_id = i.workspace_id AND r.item_id = i.id
LEFT JOIN reagents.safety_sheets AS sheet ON sheet.workspace_id = r.workspace_id AND sheet.id = r.sds_sheet_id
CROSS JOIN LATERAL (
  SELECT trim_scale(coalesce(sum(p.balance), 0)) AS balance
  FROM inventory.positions AS p
  WHERE p.workspace_id = i.workspace_id
    AND p.item_id = i.id
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
-- Contadores del Resumen y de la tarjeta de Inicio: inventario del espacio, no filas del catálogo. Vencido y por vencer (ADR 0012, 05-10-2026): frascos con saldo, con «hoy» en
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
), today AS (
  SELECT (now() AT TIME ZONE :timeZone!)::date AS d
), minimums AS (
  SELECT i.minimum_quantity,
         (SELECT coalesce(sum(p.balance), 0)
            FROM inventory.positions AS p
           WHERE p.workspace_id = i.workspace_id
             AND p.item_id = i.id) AS balance
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

