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
SELECT l.id, l.item_id, l.code, l.condition, i.base_unit
FROM inventory.lots AS l
JOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id
WHERE l.workspace_id = :workspaceId! AND l.id = :lotId! AND i.kind = :kind! AND i.archived_at IS NULL;

/* @name findLocation */
SELECT id
FROM core.locations
WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL;

/* @name reserveContainerSeqs */
-- Reparte números de frasco del lote: el UPDATE bloquea el lote, así que dos ingresos simultáneos
-- reciben tramos distintos. Devuelve el último número del tramo reservado. Orden de bloqueo dentro
-- de «datos» (02 §6): lote antes que posición; todo comando que bloquee ambos debe seguirlo.
UPDATE inventory.lots
SET container_seq = container_seq + :count!::int
WHERE workspace_id = :workspaceId! AND id = :lotId!
RETURNING container_seq AS "last!";

/* @name insertContainers */
INSERT INTO inventory.containers (workspace_id, item_id, lot_id, seq, initial_quantity)
SELECT :workspaceId!, :itemId!, :lotId!, s.seq, :quantity!::numeric
FROM generate_series(:firstSeq!::int, :lastSeq!::int) AS s (seq)
ORDER BY s.seq
RETURNING id, seq;

/* @name insertContainerPosition */
-- La posición de un frasco recién creado: nace con saldo cero y el asiento del ingreso la llena.
INSERT INTO inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition)
VALUES (:workspaceId!, :itemId!, :lotId!, :containerId!, :locationId!, 'usable')
RETURNING id;

/* @name lockPosition */
-- Bloquea la posición antes de leer su saldo: salidas y ajustes descuentan bajo el mismo bloqueo.
SELECT p.id, p.location_id, p.disposition, l.condition, l.expires_on, i.base_unit
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
  l.condition AS lot_condition,
  p.disposition,
  c.id AS "container_id?",
  CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,
  trim_scale(c.initial_quantity) AS container_initial_quantity,
  loc.id AS location_id,
  loc.code AS location_code,
  loc.name AS location_name,
  trim_scale(p.balance) AS "balance!",
  i.base_unit,
  lower(i.code) AS "sort_item!",
  lower(l.code) AS "sort_lot!",
  coalesce(c.seq, 0) AS "sort_seq!",
  lower(loc.code) AS "sort_location!"
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
WHERE p.workspace_id = :workspaceId!
  AND i.kind = :kind!
  AND p.location_id = ANY (:locationIds!::uuid[])
  AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)
  -- Un frasco trasladado deja su posición de origen vacía: solo se muestra donde está.
  AND (p.container_id IS NULL OR p.balance > 0 OR NOT EXISTS (
    SELECT 1 FROM inventory.positions AS other
    WHERE other.workspace_id = p.workspace_id AND other.container_id = p.container_id AND other.balance > 0
  ))
  AND (
    :afterId::uuid IS NULL
    OR (lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id)
       > (:afterItem::text, :afterLot::text, :afterSeq::int, :afterLocation::text, :afterId::uuid)
  )
ORDER BY lower(i.code), lower(l.code), coalesce(c.seq, 0), lower(loc.code), p.id
LIMIT :limit!;

/* @name listOperations */
-- Un asiento por fila: un ingreso de varios frascos son varias filas de la misma operación. El
-- cursor incluye el asiento para que una página nunca corte una operación a medias.
SELECT
  o.id,
  e.id AS entry_id,
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
  CASE WHEN c.id IS NULL THEN NULL ELSE l.code || '-' || lpad(c.seq::text, 2, '0') END AS container_code,
  loc.code AS location_code,
  i.base_unit
FROM inventory.operations AS o
JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
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
  AND (:type::text IS NULL OR o.type = :type::text)
  -- Misma ventana que countOperationsByDay: desde la medianoche local de hace N - 1 días.
  AND (
    :days::int IS NULL
    OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
  )
  AND (
    :beforeId::uuid IS NULL
    OR (o.effective_at, o.id, e.id) < (:beforeAt::timestamptz, :beforeId::uuid, :beforeEntryId::uuid)
  )
ORDER BY o.effective_at DESC, o.id DESC, e.id DESC
LIMIT :limit!;

/* @name countOperationsByDay */
-- Operaciones de un tipo por día, en la zona del espacio y en las ubicaciones autorizadas, para
-- los gráficos (ADR 0011). Cuenta sucesos: nunca suma cantidades de unidades distintas. Los días
-- sin operaciones salen con cero para que el gráfico no salte fechas.
WITH bounds AS (
  SELECT (now() AT TIME ZONE :timeZone!)::date - (:days!::int - 1) AS first_day,
         (now() AT TIME ZONE :timeZone!)::date AS last_day
),
days AS (
  SELECT generate_series(b.first_day, b.last_day, interval '1 day')::date AS day
  FROM bounds AS b
),
scoped AS (
  SELECT (o.effective_at AT TIME ZONE :timeZone!)::date AS day
  FROM inventory.operations AS o
  CROSS JOIN bounds AS b
  WHERE o.workspace_id = :workspaceId!
    AND o.type = :type!
    AND o.effective_at >= (b.first_day::timestamp AT TIME ZONE :timeZone!)
    AND EXISTS (
      SELECT 1
      FROM inventory.entries AS e
      JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
      JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
      WHERE e.workspace_id = o.workspace_id
        AND e.operation_id = o.id
        AND i.kind = :kind!
        AND p.location_id = ANY (:locationIds!::uuid[])
    )
)
SELECT to_char(d.day, 'YYYY-MM-DD') AS "day!", count(s.day)::int AS "count!"
FROM days AS d
LEFT JOIN scoped AS s ON s.day = d.day
GROUP BY d.day
ORDER BY d.day;

/* @name listReasons */
SELECT id, name
FROM inventory.reasons
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND kind = :kind! AND archived_at IS NULL
ORDER BY lower(name), id;

/* @name insertReason */
-- Repetir un nombre activo no crea otro: devuelve el existente (la lista no admite duplicados).
WITH inserted AS (
  INSERT INTO inventory.reasons (workspace_id, item_kind, kind, name)
  VALUES (:workspaceId!, :itemKind!, :kind!, :name!)
  ON CONFLICT (workspace_id, item_kind, kind, lower(name)) WHERE archived_at IS NULL DO NOTHING
  RETURNING id, name
)
SELECT id AS "id!", name AS "name!" FROM inserted
UNION ALL
SELECT id, name FROM inventory.reasons
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND kind = :kind! AND lower(name) = lower(:name!)
  AND archived_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM inserted);

/* @name archiveReason */
UPDATE inventory.reasons
SET archived_at = now()
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND id = :id! AND archived_at IS NULL
RETURNING id;

/* @name listDestinations */
SELECT id, name
FROM inventory.destinations
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND archived_at IS NULL
ORDER BY lower(name), id;

/* @name insertDestination */
WITH inserted AS (
  INSERT INTO inventory.destinations (workspace_id, item_kind, name)
  VALUES (:workspaceId!, :itemKind!, :name!)
  ON CONFLICT (workspace_id, item_kind, lower(name)) WHERE archived_at IS NULL DO NOTHING
  RETURNING id, name
)
SELECT id AS "id!", name AS "name!" FROM inserted
UNION ALL
SELECT id, name FROM inventory.destinations
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND lower(name) = lower(:name!) AND archived_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM inserted);

/* @name archiveDestination */
UPDATE inventory.destinations
SET archived_at = now()
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND id = :id! AND archived_at IS NULL
RETURNING id;
