/*
  Capacidad inventario (03 §4). Toda consulta filtra el espacio y el tipo de ítem del módulo que
  la invoca: una ruta de Reactivos nunca ve ni opera un ítem de otro tipo (02 §4).
  La aritmética de cantidades ocurre aquí, en numeric; el servidor solo transporta cadenas.
*/

/* @name insertItem */
INSERT INTO inventory.items (workspace_id, kind, code, name, base_unit)
VALUES (:workspaceId!, :kind!, :code!, :name!, :baseUnit!)
RETURNING id, code, name, base_unit;

/* @name findItem */
SELECT id, code, name, base_unit
FROM inventory.items
WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL;

/* @name insertLot */
INSERT INTO inventory.lots (workspace_id, item_id, code, supplier_name, supplier_lot, expires_on)
VALUES (:workspaceId!, :itemId!, :code!, :supplierName, :supplierLot, :expiresOn)
RETURNING id, item_id, code, supplier_name, supplier_lot, expires_on;

/* @name findLot */
SELECT l.id, l.item_id, l.condition, i.base_unit
FROM inventory.lots AS l
JOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id
WHERE l.workspace_id = :workspaceId! AND l.id = :lotId! AND i.kind = :kind! AND i.archived_at IS NULL;

/* @name findLocation */
SELECT id
FROM core.locations
WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL;

/* @name ensurePosition */
-- Dos ingresos simultáneos a una posición nueva no duplican su clave: el segundo espera y no inserta.
INSERT INTO inventory.positions (workspace_id, item_id, lot_id, location_id, disposition)
VALUES (:workspaceId!, :itemId!, :lotId!, :locationId!, 'usable')
ON CONFLICT (workspace_id, item_id, lot_id, location_id, disposition) DO NOTHING;

/* @name lockPositionByKey */
SELECT id
FROM inventory.positions
WHERE workspace_id = :workspaceId!
  AND item_id = :itemId!
  AND lot_id = :lotId!
  AND location_id = :locationId!
  AND disposition = 'usable'
FOR UPDATE;

/* @name lockPosition */
-- Bloquea la posición antes de leer su saldo: salidas y ajustes descuentan bajo el mismo bloqueo.
SELECT p.id, p.location_id, p.disposition, l.condition, i.base_unit
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!
FOR UPDATE OF p;

/* @name insertOperation */
-- La fecha efectiva la fija la base (el runtime no puede escribirla).
INSERT INTO inventory.operations
  (workspace_id, type, actor_principal_id, reason, destination, reference, correlation_id)
VALUES
  (:workspaceId!, :type!, :principalId!, :reason, :destination, :reference, :correlationId!)
RETURNING id, effective_at;

/* @name applyEntry */
-- Saldo y asiento en una sola sentencia sobre la posición ya bloqueada. Si el saldo no alcanza,
-- no actualiza ni inserta nada y el comando responde stock insuficiente.
WITH moved AS (
  UPDATE inventory.positions
  SET balance = balance + :sign! * :quantity!::numeric, version = version + 1
  WHERE workspace_id = :workspaceId!
    AND id = :positionId!
    AND balance + :sign! * :quantity!::numeric >= 0
  RETURNING id, balance
)
INSERT INTO inventory.entries
  (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
SELECT :workspaceId!, :operationId!, moved.id, :sign! * :quantity!::numeric,
       :sign! * :quantity!::numeric, :unit!, moved.balance
FROM moved
RETURNING trim_scale(quantity) AS "quantity!", trim_scale(balance_after) AS "balance_after!";

/* @name listPositions */
SELECT
  p.id,
  i.id AS item_id,
  i.code AS item_code,
  i.name AS item_name,
  l.id AS lot_id,
  l.code AS lot_code,
  l.expires_on,
  loc.id AS location_id,
  loc.code AS location_code,
  loc.name AS location_name,
  trim_scale(p.balance) AS "balance!",
  i.base_unit,
  lower(i.code) AS "sort_item!",
  lower(l.code) AS "sort_lot!",
  lower(loc.code) AS "sort_location!"
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
WHERE p.workspace_id = :workspaceId!
  AND i.kind = :kind!
  AND p.location_id = ANY (:locationIds!::uuid[])
  AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)
  AND (
    :afterId::uuid IS NULL
    OR (lower(i.code), lower(l.code), lower(loc.code), p.id)
       > (:afterItem::text, :afterLot::text, :afterLocation::text, :afterId::uuid)
  )
ORDER BY lower(i.code), lower(l.code), lower(loc.code), p.id
LIMIT :limit!;

/* @name listOperations */
-- En R-00 cada operación tiene un solo asiento; las de varios asientos llegan con los traslados.
SELECT
  o.id,
  o.type,
  o.effective_at,
  -- Marca exacta (microsegundos, UTC) para el cursor; un Date de JavaScript la redondearía.
  to_char(o.effective_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursor_at!",
  o.reason,
  o.destination,
  o.reference,
  o.actor_principal_id,
  ident.display_name AS actor_name,
  e.position_id,
  trim_scale(e.quantity) AS "quantity!",
  trim_scale(e.balance_after) AS "balance_after!",
  i.code AS item_code,
  i.name AS item_name,
  l.code AS lot_code,
  loc.code AS location_code,
  i.base_unit
FROM inventory.operations AS o
JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
LEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
WHERE o.workspace_id = :workspaceId!
  AND i.kind = :kind!
  AND p.location_id = ANY (:locationIds!::uuid[])
  AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)
  AND (:locationId::uuid IS NULL OR p.location_id = :locationId::uuid)
  AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)
  AND (
    :beforeId::uuid IS NULL
    OR (o.effective_at, o.id) < (:beforeAt::timestamptz, :beforeId::uuid)
  )
ORDER BY o.effective_at DESC, o.id DESC
LIMIT :limit!;
