/*
  Capacidad inventario (03 §4). Toda consulta filtra el espacio y el tipo de ítem del módulo que
  la invoca: una ruta de Reactivos nunca ve ni opera un ítem de otro tipo (02 §4).
  La aritmética de cantidades ocurre aquí, en numeric; el servidor solo transporta cadenas.
*/

/* @name insertItem */
-- El código lo genera el servidor a partir del nombre (ADR 0015), bajo el bloqueo de códigos.
INSERT INTO inventory.items (workspace_id, kind, code, name, base_unit)
VALUES (:workspaceId!, :kind!, :code!, :name!, :baseUnit!)
RETURNING id, code, name, base_unit, trim_scale(minimum_quantity) AS minimum;

/* @name itemNameTaken */
-- Otro ítem activo del mismo tipo con el mismo nombre plegado (ADR 0015). Se consulta bajo el
-- bloqueo del catálogo del espacio, que serializa altas y cambios de nombre.
SELECT name
FROM inventory.items
WHERE workspace_id = :workspaceId!
  AND kind = :kind!
  AND archived_at IS NULL
  AND inventory.fold_text(name) = inventory.fold_text(:name!)
  AND (:exceptId::uuid IS NULL OR id <> :exceptId::uuid)
LIMIT 1;

/* @name itemCodesLike */
-- Códigos del espacio, de cualquier tipo, iguales al propuesto o con un sufijo «-N».
SELECT code
FROM inventory.items
WHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'));

/* @name setItemMinimum */
-- Mínimo para todo el espacio, en la unidad base (ADR 0012, 05-10-2026); null lo quita.
UPDATE inventory.items
SET minimum_quantity = :minimum::numeric, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL
RETURNING id, trim_scale(minimum_quantity) AS minimum;

/* @name lockItem */
-- Antes de editar la ficha (ADR 0015): un ingreso, que también bloquea el ítem, espera.
SELECT id, code, name, base_unit, trim_scale(minimum_quantity) AS minimum
FROM inventory.items
WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL
FOR UPDATE;

/* @name itemHasMovements */
-- Con algún asiento, la unidad ya no cambia (ADR 0015; lo respalda items_protect_base_unit).
SELECT EXISTS (
  SELECT 1
  FROM inventory.positions AS p
  JOIN inventory.entries AS e ON e.workspace_id = p.workspace_id AND e.position_id = p.id
  WHERE p.workspace_id = :workspaceId! AND p.item_id = :itemId!
) AS "has_movements!";

/* @name updateItem */
UPDATE inventory.items
SET name = :name!, base_unit = :baseUnit!, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind!
RETURNING id;

/* @name reserveLotSeq */
-- Número del lote automático (ADR 0015): el UPDATE bloquea el ítem, así que dos ingresos
-- simultáneos reciben números distintos y la unidad no cambia mientras dura el ingreso. Orden de
-- bloqueo dentro de «datos» (02 §6): ítem → lote → posición.
UPDATE inventory.items
SET lot_seq = lot_seq + 1
WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL
RETURNING lot_seq, code, name, base_unit;

/* @name insertLot */
-- Si el código automático ya lo tiene un lote anterior del ítem, no inserta y se prueba el siguiente.
INSERT INTO inventory.lots (workspace_id, item_id, code, brand, area, expires_on)
VALUES (:workspaceId!, :itemId!, :code!, :brand, :area, :expiresOn)
ON CONFLICT (workspace_id, item_id, lower(code)) DO NOTHING
RETURNING id, code;

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
-- Un frasco por código, numerados desde :firstSeq en el orden recibido (ADR 0015). Un código ya usado
-- en el espacio choca con containers_code.
INSERT INTO inventory.containers (workspace_id, item_id, lot_id, seq, code, initial_quantity, tare, density)
SELECT :workspaceId!, :itemId!, :lotId!, :firstSeq!::int + c.n::int - 1, c.code, :quantity!::numeric,
       :tare::numeric, :density::numeric
FROM unnest(:codes!::text[]) WITH ORDINALITY AS c (code, n)
ORDER BY c.n
RETURNING id, code, trim_scale(tare) AS tare;

/* @name takenContainerCode */
-- Cuál de los códigos ya existe en el espacio: el detalle del choque no muestra la clave bajo RLS.
SELECT lower(code) AS "code!"
FROM inventory.containers
WHERE workspace_id = :workspaceId! AND lower(code) = ANY (SELECT lower(c) FROM unnest(:codes!::text[]) AS c)
LIMIT 1;

/* @name computeTare */
-- Tara de un frasco (ADR 0015): su peso en g menos lo que contiene, pasado a gramos. Nula si la unidad
-- no se pesa o, en volumen, falta la densidad; la densidad solo se guarda en volumen.
WITH t AS (
  SELECT round(:grossWeight!::numeric - :quantity!::numeric * inventory.grams_per_unit(u.code, :density::numeric), 9) AS tare,
         u.dimension
  FROM inventory.units AS u
  WHERE u.code = :unit!
)
SELECT trim_scale(tare) AS tare,
       coalesce(tare > 0, false) AS "positive!",
       dimension AS "dimension!",
       CASE WHEN dimension = 'volume' THEN trim_scale(:density::numeric) END AS density
FROM t;

/* @name lockContainerStock */
-- Antes de fijar la tara (ADR 0015) se bloquean, en modo compartido y en orden estable, todas las
-- posiciones del frasco: ningún movimiento ni traslado cambia su saldo entretanto. Devuelve la que
-- tiene saldo o, si está vacío, la última que ocupó.
WITH locked AS (
  SELECT p.id, p.location_id, p.balance, p.updated_at
  FROM inventory.positions AS p
  WHERE p.workspace_id = :workspaceId! AND p.container_id = :containerId!
  ORDER BY p.id
  FOR SHARE
)
SELECT c.id, c.item_id, locked.location_id, trim_scale(locked.balance) AS "balance!", i.base_unit,
       trim_scale(c.tare) AS tare, trim_scale(c.density) AS density
FROM inventory.containers AS c
JOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id
JOIN locked ON true
WHERE c.workspace_id = :workspaceId! AND c.id = :containerId! AND i.kind = :kind!
ORDER BY (locked.balance > 0) DESC, locked.updated_at DESC
LIMIT 1;

/* @name setContainerTare */
UPDATE inventory.containers
SET tare = :tare!::numeric, density = :density::numeric
WHERE workspace_id = :workspaceId! AND id = :containerId!
RETURNING trim_scale(tare) AS "tare!", trim_scale(density) AS density;

/* @name weighPosition */
-- Ajuste por peso (ADR 0015) sobre la posición ya bloqueada: el saldo que marca la balanza,
-- redondeado a centésimas, y su diferencia con el saldo actual. La aritmética ocurre aquí, en numeric.
SELECT trim_scale(c.tare) AS tare,
       (:grossWeight!::numeric < c.tare) AS below_tare,
       trim_scale(round((:grossWeight!::numeric - c.tare) / f.factor, 2) - p.balance) AS delta
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
CROSS JOIN LATERAL (SELECT inventory.grams_per_unit(i.base_unit, c.density) AS factor) AS f
WHERE p.workspace_id = :workspaceId! AND p.id = :positionId!;

/* @name findItemName */
SELECT name
FROM inventory.items
WHERE workspace_id = :workspaceId! AND id = :itemId! AND kind = :kind! AND archived_at IS NULL;

/* @name lastNumberedContainerCode */
-- El código del reactivo con el número final más alto: de él sigue su serie (ADR 0015).
SELECT c.code
FROM inventory.containers AS c
JOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id
WHERE c.workspace_id = :workspaceId! AND c.item_id = :itemId! AND i.kind = :kind! AND c.code ~ '[0-9]$'
ORDER BY substring(c.code FROM '([0-9]+)$')::numeric DESC, c.created_at DESC, c.id
LIMIT 1;

/* @name containerCodesLike */
-- Códigos de frasco del espacio, de cualquier tipo, que empiezan por el prefijo de la serie.
SELECT code
FROM inventory.containers
WHERE workspace_id = :workspaceId! AND starts_with(lower(code), lower(:prefix!));

/* @name insertContainerPosition */
-- La posición de un frasco recién creado: nace con saldo cero y el asiento del ingreso la llena.
INSERT INTO inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition)
VALUES (:workspaceId!, :itemId!, :lotId!, :containerId!, :locationId!, 'usable')
RETURNING id;

/* @name lockPosition */
-- Bloquea la posición antes de leer su saldo: salidas y ajustes descuentan bajo el mismo bloqueo.
SELECT p.id, p.location_id, p.disposition, l.expires_on, i.base_unit
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!
FOR UPDATE OF p;

/* @name findContainerItem */
-- De qué ítem es un frasco del espacio: lo que necesita el enlace corto de su etiqueta QR.
SELECT c.id, c.item_id
FROM inventory.containers AS c
JOIN inventory.items AS i ON i.workspace_id = c.workspace_id AND i.id = c.item_id
WHERE c.workspace_id = :workspaceId! AND c.id = :containerId! AND i.kind = :kind!;

/* @name lockTransferPosition */
-- El frasco que se traslada, bloqueado antes de leer su saldo (posición de origen primero, 02 §6).
SELECT p.id, p.item_id, p.lot_id, p.container_id, p.location_id, p.disposition,
       trim_scale(p.balance) AS "balance!", trim_scale(p.reserved) AS "reserved!", i.base_unit
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!
FOR UPDATE OF p;

/* @name ensureContainerPosition */
-- La posición del frasco en el destino: la de un traslado anterior o una nueva con saldo cero.
INSERT INTO inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition)
VALUES (:workspaceId!, :itemId!, :lotId!, :containerId!, :locationId!, :disposition!)
ON CONFLICT (workspace_id, item_id, lot_id, container_id, location_id, disposition) DO NOTHING;

/* @name lockContainerPositionAt */
SELECT id
FROM inventory.positions
WHERE workspace_id = :workspaceId! AND item_id = :itemId! AND lot_id = :lotId! AND container_id = :containerId!
  AND location_id = :locationId! AND disposition = :disposition!
FOR UPDATE;

/* @name lockCountPosition */
-- Una línea del conteo (ADR 0012, entrega 4) bajo el bloqueo del frasco: si su saldo sigue siendo
-- el que se vio al contar, la diferencia con lo contado, y si lo contado queda bajo lo apartado.
-- La aritmética ocurre aquí, en numeric.
SELECT p.id, p.location_id,
       (p.balance = :expected!::numeric) AS "unchanged!",
       trim_scale(:counted!::numeric - p.balance) AS "delta!",
       (:counted!::numeric < p.reserved) AS "below_reserved!",
       coalesce(c.code, l.code) AS "code!",
       i.base_unit
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
WHERE p.workspace_id = :workspaceId! AND p.id = :positionId! AND i.kind = :kind!
FOR UPDATE OF p;

/* @name insertOperation */
-- La fecha efectiva la fija la base (el runtime no puede escribirla).
INSERT INTO inventory.operations
  (workspace_id, type, actor_principal_id, reason, destination, reference, correlation_id, requested_by_principal_id)
VALUES
  (:workspaceId!, :type!, :principalId!, :reason, :destination, :reference, :correlationId!, :requestedBy)
RETURNING id, effective_at;

/* @name applyEntry */
-- Saldo y asiento en una sola sentencia sobre la posición ya bloqueada. Si lo disponible no
-- alcanza (el saldo nunca baja de lo reservado, ADR 0012), no actualiza ni inserta nada y el
-- comando responde stock insuficiente.
WITH moved AS (
  UPDATE inventory.positions
  SET balance = balance + :sign! * :quantity!::numeric, version = version + 1
  WHERE workspace_id = :workspaceId!
    AND id = :positionId!
    AND balance + :sign! * :quantity!::numeric >= reserved
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
  l.brand,
  l.area,
  p.disposition,
  c.id AS "container_id?",
  c.code AS container_code,
  trim_scale(c.initial_quantity) AS container_initial_quantity,
  c.created_at AS "container_received_at?",
  -- Quién lo ingresó: el actor del ingreso que llenó su primera posición; nadie si no hubo ingreso.
  receipt.operation_id IS NOT NULL AS "container_has_receipt!",
  receipt.actor_name AS "container_received_by_name?",
  trim_scale(c.tare) AS container_tare,
  trim_scale(c.density) AS container_density,
  loc.id AS location_id,
  loc.code AS location_code,
  loc.name AS location_name,
  -- Ruta desde el primer nivel bajo la sede (sin ella, salvo que sea la propia), hasta 6 niveles.
  (
    WITH RECURSIVE up AS (
      SELECT loc.parent_id, loc.kind, loc.name, 0 AS depth
      UNION ALL
      SELECT parent.parent_id, parent.kind, parent.name, up.depth + 1
      FROM up
      JOIN core.locations AS parent ON parent.workspace_id = loc.workspace_id AND parent.id = up.parent_id
      WHERE up.depth < 5
    )
    SELECT array_agg(up.name ORDER BY up.depth DESC) FILTER (WHERE up.depth = 0 OR up.kind <> 'site')
    FROM up
  ) AS "location_path!",
  trim_scale(p.balance) AS "balance!",
  trim_scale(p.reserved) AS "reserved!",
  i.base_unit,
  lower(i.code) AS "sort_item!",
  lower(l.code) AS "sort_lot!",
  coalesce(c.seq, 0) AS "sort_seq!",
  lower(loc.code) AS "sort_location!"
FROM inventory.positions AS p
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
-- El nombre sale de la misma cadena que el actor de listOperations.
LEFT JOIN LATERAL (
  SELECT o.id AS operation_id, ident.display_name AS actor_name
  FROM inventory.positions AS cp
  JOIN inventory.entries AS e ON e.workspace_id = cp.workspace_id AND e.position_id = cp.id
  JOIN inventory.operations AS o ON o.workspace_id = e.workspace_id AND o.id = e.operation_id
  LEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id
  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
  WHERE cp.workspace_id = c.workspace_id AND cp.container_id = c.id AND o.type = 'receipt'
  ORDER BY o.effective_at, o.id
  LIMIT 1
) AS receipt ON true
JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
WHERE p.workspace_id = :workspaceId!
  AND i.kind = :kind!
  AND p.location_id = ANY (:locationIds!::uuid[])
  AND (:itemId::uuid IS NULL OR p.item_id = :itemId::uuid)
  AND (:locationId::uuid IS NULL OR p.location_id = :locationId::uuid)
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
-- cursor incluye el asiento para que una página nunca corte una operación a medias. La ruta de la
-- ubicación se calcula fuera de `page`, solo para las filas de la página.
WITH page AS (
  SELECT
    o.id,
    e.id AS entry_id,
    o.type,
    o.effective_at,
    -- Marca exacta (microsegundos, UTC) para el cursor; un Date de JavaScript la redondearía.
    to_char(o.effective_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at,
    o.reason,
    o.destination,
    o.reference,
    o.requested_by_principal_id,
    o.actor_principal_id,
    ident.display_name AS actor_name,
    requester.display_name AS requester_name,
    e.position_id,
    trim_scale(e.quantity) AS quantity,
    trim_scale(e.balance_after) AS balance_after,
    p.item_id,
    i.code AS item_code,
    i.name AS item_name,
    l.code AS lot_code,
    c.code AS container_code,
    p.location_id,
    i.base_unit
  FROM inventory.operations AS o
  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
  JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
  LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
  LEFT JOIN core.principals AS pr ON pr.workspace_id = o.workspace_id AND pr.id = o.actor_principal_id
  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
  LEFT JOIN core.principals AS rqp ON rqp.workspace_id = o.workspace_id AND rqp.id = o.requested_by_principal_id
  LEFT JOIN core.memberships AS rqm ON rqm.workspace_id = rqp.workspace_id AND rqm.id = rqp.membership_id
  LEFT JOIN core.identities AS requester ON requester.id = rqm.identity_id
  -- Filtros del libro (ADR 0014), los mismos en operationFacets y operationTotals: si cambian aquí,
  -- cambian allí. `locationIds` es el ámbito del miembro; `filterLocationIds` solo lo estrecha.
  WHERE o.workspace_id = :workspaceId!
    AND i.kind = :kind!
    AND p.location_id = ANY (:locationIds!::uuid[])
    AND (:types::text[] IS NULL OR o.type = ANY (:types::text[]))
    AND (:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]))
    AND (
      :responsibleIds::uuid[] IS NULL
      OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[])
    )
    AND (:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]))
    AND (:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]))
    AND (:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]))
    AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)
    -- Misma ventana que countOperationsByDay: desde la medianoche local de hace N - 1 días.
    AND (
      :days::int IS NULL
      OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
    )
    -- Desde la medianoche local de `fromDate` hasta antes de la del día siguiente a `toDate`.
    AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))
    AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))
    AND (
      :beforeId::uuid IS NULL
      OR (o.effective_at, o.id, e.id) < (:beforeAt::timestamptz, :beforeId::uuid, :beforeEntryId::uuid)
    )
  ORDER BY o.effective_at DESC, o.id DESC, e.id DESC
  LIMIT :limit!
)
SELECT
  page.id,
  page.entry_id,
  page.type,
  page.effective_at,
  page.cursor_at AS "cursor_at!",
  page.reason,
  page.destination,
  page.reference,
  page.requested_by_principal_id,
  page.actor_principal_id,
  page.actor_name,
  page.requester_name,
  page.position_id,
  page.quantity AS "quantity!",
  page.balance_after AS "balance_after!",
  page.item_id,
  page.item_code,
  page.item_name,
  page.lot_code,
  page.container_code,
  loc.code AS location_code,
  loc.name AS location_name,
  -- La misma ruta que listPositions: desde el primer nivel bajo la sede, hasta 6 niveles.
  (
    WITH RECURSIVE up AS (
      SELECT loc.parent_id, loc.kind, loc.name, 0 AS depth
      UNION ALL
      SELECT parent.parent_id, parent.kind, parent.name, up.depth + 1
      FROM up
      JOIN core.locations AS parent ON parent.workspace_id = loc.workspace_id AND parent.id = up.parent_id
      WHERE up.depth < 5
    )
    SELECT array_agg(up.name ORDER BY up.depth DESC) FILTER (WHERE up.depth = 0 OR up.kind <> 'site')
    FROM up
  ) AS "location_path!",
  page.base_unit
FROM page
JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = page.location_id
ORDER BY page.effective_at DESC, page.id DESC, page.entry_id DESC;

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

/* @name operationFacets */
-- Asientos por opción de cada filtro de Movimientos (ADR 0014), en una sola lectura del libro para que
-- el total y los grupos salgan de la misma instantánea. Faceta disyuntiva: cada grupo aplica todos los
-- filtros menos el suyo, así marcar «Salidas» sigue contando los ingresos. Llegan las opciones con
-- asientos y las elegidas aunque queden en cero (para poder quitarlas), pero nunca un reactivo de otro
-- tipo, un principal de otro espacio ni una ubicación fuera del ámbito.
WITH scoped AS MATERIALIZED (
  SELECT
    o.type,
    p.item_id,
    coalesce(o.requested_by_principal_id, o.actor_principal_id) AS responsible_id,
    o.destination,
    o.reason,
    p.location_id,
    coalesce(:types::text[] IS NULL OR o.type = ANY (:types::text[]), false) AS by_type,
    coalesce(:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]), false) AS by_item,
    coalesce(
      :responsibleIds::uuid[] IS NULL
      OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[]),
      false
    ) AS by_responsible,
    coalesce(:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]), false) AS by_destination,
    coalesce(:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]), false) AS by_reason,
    coalesce(:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]), false) AS by_location
  FROM inventory.operations AS o
  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
  WHERE o.workspace_id = :workspaceId!
    AND i.kind = :kind!
    AND p.location_id = ANY (:locationIds!::uuid[])
    AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)
    AND (
      :days::int IS NULL
      OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
    )
    AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))
    AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))
),
counted AS (
  SELECT 'total' AS facet, NULL::uuid AS id, NULL::text AS value, count(*) AS n
  FROM scoped
  WHERE by_type AND by_item AND by_responsible AND by_destination AND by_reason AND by_location
  UNION ALL
  SELECT 'type', NULL, type, count(*)
  FROM scoped
  WHERE by_item AND by_responsible AND by_destination AND by_reason AND by_location
  GROUP BY type
  UNION ALL
  SELECT 'product', item_id, NULL, count(*)
  FROM scoped
  WHERE by_type AND by_responsible AND by_destination AND by_reason AND by_location
  GROUP BY item_id
  UNION ALL
  SELECT 'responsible', responsible_id, NULL, count(*)
  FROM scoped
  WHERE by_type AND by_item AND by_destination AND by_reason AND by_location
  GROUP BY responsible_id
  UNION ALL
  SELECT 'destination', NULL, destination, count(*)
  FROM scoped
  WHERE destination IS NOT NULL AND by_type AND by_item AND by_responsible AND by_reason AND by_location
  GROUP BY destination
  UNION ALL
  SELECT 'reason', NULL, reason, count(*)
  FROM scoped
  WHERE reason IS NOT NULL AND by_type AND by_item AND by_responsible AND by_destination AND by_location
  GROUP BY reason
  UNION ALL
  SELECT 'location', location_id, NULL, count(*)
  FROM scoped
  WHERE by_type AND by_item AND by_responsible AND by_destination AND by_reason
  GROUP BY location_id
),
selected AS (
  SELECT 'type' AS facet, NULL::uuid AS id, v AS value FROM unnest(:types::text[]) AS v
  UNION ALL SELECT 'product', v, NULL FROM unnest(:itemIds::uuid[]) AS v
  UNION ALL SELECT 'responsible', v, NULL FROM unnest(:responsibleIds::uuid[]) AS v
  UNION ALL SELECT 'destination', NULL, v FROM unnest(:destinations::text[]) AS v
  UNION ALL SELECT 'reason', NULL, v FROM unnest(:reasons::text[]) AS v
  UNION ALL SELECT 'location', v, NULL FROM unnest(:filterLocationIds::uuid[]) AS v
),
options AS (
  SELECT
    coalesce(c.facet, s.facet) AS facet,
    coalesce(c.id, s.id) AS id,
    coalesce(c.value, s.value) AS value,
    coalesce(c.n, 0) AS n,
    s.facet IS NOT NULL AS selected
  FROM counted AS c
  FULL JOIN selected AS s
    ON s.facet = c.facet AND s.id IS NOT DISTINCT FROM c.id AND s.value IS NOT DISTINCT FROM c.value
),
named AS (
  SELECT
    op.facet,
    op.id,
    op.value,
    op.n,
    op.selected,
    coalesce(item.code, loc.code) AS code,
    CASE op.facet
      WHEN 'product' THEN item.name
      WHEN 'location' THEN loc.name
      WHEN 'responsible' THEN ident.display_name
      ELSE op.value
    END AS name
  FROM options AS op
  LEFT JOIN inventory.items AS item
    ON op.facet = 'product' AND item.workspace_id = :workspaceId! AND item.kind = :kind! AND item.id = op.id
  LEFT JOIN core.locations AS loc
    ON op.facet = 'location' AND loc.workspace_id = :workspaceId! AND loc.id = op.id
       AND loc.id = ANY (:locationIds!::uuid[])
  LEFT JOIN core.principals AS pr
    ON op.facet = 'responsible' AND pr.workspace_id = :workspaceId! AND pr.id = op.id
  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
  WHERE (op.facet <> 'product' OR item.id IS NOT NULL)
    AND (op.facet <> 'location' OR loc.id IS NOT NULL)
    AND (op.facet <> 'responsible' OR pr.id IS NOT NULL)
),
ranked AS (
  -- Reactivos: los elegidos siempre; de los demás, los que coinciden con la búsqueda, uno más del
  -- límite para saber si hay más.
  SELECT
    nd.*,
    CASE WHEN nd.facet = 'product' AND NOT nd.selected THEN
      row_number() OVER (PARTITION BY nd.facet, nd.selected ORDER BY nd.n DESC, lower(nd.name), nd.id)
    END AS product_rank
  FROM named AS nd
  WHERE nd.facet <> 'product'
     OR nd.selected
     OR :productQuery::text IS NULL
     OR strpos(lower(nd.code), lower(:productQuery::text)) > 0
     OR strpos(lower(nd.name), lower(:productQuery::text)) > 0
)
SELECT
  facet AS "facet!",
  id,
  value,
  code,
  name,
  n::int AS "count!",
  selected AS "selected!"
FROM ranked
WHERE product_rank IS NULL OR product_rank <= :productLimit!::int + 1
ORDER BY facet, n DESC, lower(name), id, value;

/* @name operationTotals */
-- Totales del libro filtrado (ADR 0014), por reactivo, responsable, destino o mes en la zona del
-- espacio. Cada fila es un reactivo dentro de su grupo, en su unidad base: nunca suma unidades
-- distintas. Las sumas llevan signo y son exactas (numeric); un traslado se cuenta, pero no suma
-- cantidad. Llegan los primeros `maxGroups` grupos y `groups_total` dice cuántos hay.
WITH scoped AS (
  SELECT
    CASE :groupBy!::text
      WHEN 'product' THEN p.item_id
      WHEN 'responsible' THEN coalesce(o.requested_by_principal_id, o.actor_principal_id)
    END AS group_id,
    CASE :groupBy!::text
      WHEN 'destination' THEN o.destination
      WHEN 'month' THEN to_char(o.effective_at AT TIME ZONE :timeZone!, 'YYYY-MM')
    END AS group_text,
    p.item_id,
    o.id AS operation_id,
    o.type,
    e.quantity
  FROM inventory.operations AS o
  JOIN inventory.entries AS e ON e.workspace_id = o.workspace_id AND e.operation_id = o.id
  JOIN inventory.positions AS p ON p.workspace_id = e.workspace_id AND p.id = e.position_id
  JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
  WHERE o.workspace_id = :workspaceId!
    AND i.kind = :kind!
    AND p.location_id = ANY (:locationIds!::uuid[])
    AND (:types::text[] IS NULL OR o.type = ANY (:types::text[]))
    AND (:itemIds::uuid[] IS NULL OR p.item_id = ANY (:itemIds::uuid[]))
    AND (
      :responsibleIds::uuid[] IS NULL
      OR coalesce(o.requested_by_principal_id, o.actor_principal_id) = ANY (:responsibleIds::uuid[])
    )
    AND (:destinations::text[] IS NULL OR o.destination = ANY (:destinations::text[]))
    AND (:reasons::text[] IS NULL OR o.reason = ANY (:reasons::text[]))
    AND (:filterLocationIds::uuid[] IS NULL OR p.location_id = ANY (:filterLocationIds::uuid[]))
    AND (:positionId::uuid IS NULL OR p.id = :positionId::uuid)
    AND (
      :days::int IS NULL
      OR o.effective_at >= (((now() AT TIME ZONE :timeZone!)::date - (:days::int - 1))::timestamp AT TIME ZONE :timeZone!)
    )
    AND (:fromDate::date IS NULL OR o.effective_at >= (:fromDate::date::timestamp AT TIME ZONE :timeZone!))
    AND (:toDate::date IS NULL OR o.effective_at < ((:toDate::date + 1)::timestamp AT TIME ZONE :timeZone!))
),
per_item AS (
  SELECT
    group_id,
    group_text,
    item_id,
    count(*) AS n,
    sum(quantity) FILTER (WHERE type = 'receipt') AS receipts,
    sum(quantity) FILTER (WHERE type = 'issue') AS issues,
    sum(quantity) FILTER (WHERE type = 'adjustment') AS adjustments,
    coalesce(sum(quantity) FILTER (WHERE type <> 'transfer'), 0) AS net,
    -- Un traslado son dos asientos (sale y entra) de una operación: se cuenta una vez (ADR 0014).
    count(DISTINCT operation_id) FILTER (WHERE type = 'transfer') AS transfers
  FROM scoped
  GROUP BY group_id, group_text, item_id
),
labelled AS (
  -- PARTITION BY agrupa los nulos juntos: las operaciones sin destino forman un solo grupo.
  SELECT
    pi.*,
    sum(pi.n) OVER (PARTITION BY pi.group_id, pi.group_text) AS group_n,
    CASE :groupBy!::text
      WHEN 'product' THEN gi.name
      WHEN 'responsible' THEN ident.display_name
      WHEN 'destination' THEN coalesce(pi.group_text, 'Sin destino')
      ELSE pi.group_text
    END AS label
  FROM per_item AS pi
  LEFT JOIN inventory.items AS gi
    ON :groupBy!::text = 'product' AND gi.workspace_id = :workspaceId! AND gi.id = pi.group_id
  LEFT JOIN core.principals AS pr
    ON :groupBy!::text = 'responsible' AND pr.workspace_id = :workspaceId! AND pr.id = pi.group_id
  LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
  LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
),
ranked AS (
  SELECT
    l.*,
    dense_rank() OVER (
      ORDER BY
        CASE WHEN :groupBy!::text = 'month' THEN l.group_text END DESC,
        l.group_n DESC,
        lower(l.label),
        l.group_id,
        l.group_text
    ) AS group_rank
  FROM labelled AS l
),
counted AS (
  SELECT r.*, max(r.group_rank) OVER () AS groups_total FROM ranked AS r
)
SELECT
  c.group_rank::int AS "group_rank!",
  c.group_id,
  c.group_text,
  c.label,
  c.group_n::int AS "group_count!",
  c.groups_total::int AS "groups_total!",
  i.id AS item_id,
  i.code AS item_code,
  i.name AS item_name,
  i.base_unit,
  c.n::int AS "count!",
  trim_scale(c.receipts) AS receipts,
  trim_scale(c.issues) AS issues,
  trim_scale(c.adjustments) AS adjustments,
  trim_scale(c.net) AS "net!",
  c.transfers::int AS "transfers!"
FROM counted AS c
JOIN inventory.items AS i ON i.workspace_id = :workspaceId! AND i.id = c.item_id
WHERE c.group_rank <= :maxGroups!::int
ORDER BY c.group_rank, c.n DESC, lower(i.code), i.id;

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

/* @name listAreas */
SELECT id, name
FROM inventory.areas
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND archived_at IS NULL
ORDER BY lower(name), id;

/* @name insertArea */
WITH inserted AS (
  INSERT INTO inventory.areas (workspace_id, item_kind, name)
  VALUES (:workspaceId!, :itemKind!, :name!)
  ON CONFLICT (workspace_id, item_kind, lower(name)) WHERE archived_at IS NULL DO NOTHING
  RETURNING id, name
)
SELECT id AS "id!", name AS "name!" FROM inserted
UNION ALL
SELECT id, name FROM inventory.areas
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND lower(name) = lower(:name!) AND archived_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM inserted);

/* @name archiveArea */
UPDATE inventory.areas
SET archived_at = now()
WHERE workspace_id = :workspaceId! AND item_kind = :itemKind! AND id = :id! AND archived_at IS NULL
RETURNING id;

/* @name listBrands */
-- Marcas ya usadas en lotes del tipo del módulo (ADR 0015): una por nombre, la más reciente primero.
SELECT brand AS "brand!"
FROM (
  SELECT DISTINCT ON (lower(l.brand)) l.brand, l.created_at
  FROM inventory.lots AS l
  JOIN inventory.items AS i ON i.workspace_id = l.workspace_id AND i.id = l.item_id
  WHERE l.workspace_id = :workspaceId! AND i.kind = :kind! AND l.brand IS NOT NULL
  ORDER BY lower(l.brand), l.created_at DESC
) AS brands
ORDER BY created_at DESC, lower(brand)
LIMIT 50;

/* @name reserveQuantity */
-- Aparta cantidad del frasco ya bloqueado para una solicitud: solo si lo disponible alcanza.
UPDATE inventory.positions
SET reserved = reserved + :quantity!::numeric, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :positionId! AND balance - reserved >= :quantity!::numeric
RETURNING trim_scale(balance - reserved) AS "available!";

/* @name releaseReserved */
UPDATE inventory.positions
SET reserved = reserved - :quantity!::numeric, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :positionId! AND reserved >= :quantity!::numeric
RETURNING id;

/* @name fulfillEntry */
-- Aprobar: lo reservado sale del saldo y de la reserva a la vez, con su asiento.
WITH moved AS (
  UPDATE inventory.positions
  SET balance = balance - :quantity!::numeric, reserved = reserved - :quantity!::numeric, version = version + 1
  WHERE workspace_id = :workspaceId!
    AND id = :positionId!
    AND reserved >= :quantity!::numeric
  RETURNING id, balance
)
INSERT INTO inventory.entries
  (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
SELECT :workspaceId!, :operationId!, moved.id, -1 * :quantity!::numeric, -1 * :quantity!::numeric, :unit!, moved.balance
FROM moved
RETURNING trim_scale(quantity) AS "quantity!", trim_scale(balance_after) AS "balance_after!";

/* @name insertAllocation */
INSERT INTO inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id)
VALUES (:workspaceId!, :positionId!, :quantity!::numeric, :reason!, :destination!, :principalId!)
RETURNING id, created_at;

/* @name findAllocation */
-- Sin bloqueo: solo para conocer el frasco, que se bloquea antes que la reserva.
SELECT a.id, a.position_id
FROM inventory.allocations AS a
JOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
WHERE a.workspace_id = :workspaceId! AND a.id = :allocationId! AND i.kind = :kind!;

/* @name lockAllocation */
SELECT id, position_id, status, trim_scale(quantity) AS "quantity!", reason, destination, requested_by_principal_id
FROM inventory.allocations
WHERE workspace_id = :workspaceId! AND id = :allocationId!
FOR UPDATE;

/* @name decideAllocation */
UPDATE inventory.allocations
SET status = :status!, decided_by_principal_id = :principalId!, decided_at = now(),
    decision_reason = :decisionReason, operation_id = :operationId, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :allocationId! AND status = 'held'
RETURNING id, decided_at;

/* @name listAllocations */
-- Solicitudes en las ubicaciones autorizadas; `requestedBy` acota a las propias.
SELECT
  a.id,
  a.status,
  trim_scale(a.quantity) AS "quantity!",
  a.reason,
  a.destination,
  a.decision_reason,
  a.created_at,
  a.decided_at,
  a.position_id,
  a.requested_by_principal_id,
  a.decided_by_principal_id,
  requester.display_name AS requester_name,
  decider.display_name AS decider_name,
  i.id AS item_id,
  i.name AS item_name,
  i.base_unit,
  l.code AS lot_code,
  c.code AS container_code,
  loc.code AS location_code,
  loc.name AS location_name
FROM inventory.allocations AS a
JOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
JOIN core.locations AS loc ON loc.workspace_id = p.workspace_id AND loc.id = p.location_id
LEFT JOIN core.principals AS rp ON rp.workspace_id = a.workspace_id AND rp.id = a.requested_by_principal_id
LEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id
LEFT JOIN core.identities AS requester ON requester.id = rm.identity_id
LEFT JOIN core.principals AS dp ON dp.workspace_id = a.workspace_id AND dp.id = a.decided_by_principal_id
LEFT JOIN core.memberships AS dm ON dm.workspace_id = dp.workspace_id AND dm.id = dp.membership_id
LEFT JOIN core.identities AS decider ON decider.id = dm.identity_id
WHERE a.workspace_id = :workspaceId!
  AND i.kind = :kind!
  AND p.location_id = ANY (:locationIds!::uuid[])
  AND (:status::text IS NULL OR a.status = :status::text)
  AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid)
ORDER BY (a.status = 'held') DESC, a.created_at DESC, a.id DESC
LIMIT :limit!;

/* @name countPendingAllocations */
SELECT count(*)::int AS "count!"
FROM inventory.allocations AS a
JOIN inventory.positions AS p ON p.workspace_id = a.workspace_id AND p.id = a.position_id
JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
WHERE a.workspace_id = :workspaceId!
  AND i.kind = :kind!
  AND a.status = 'held'
  AND p.location_id = ANY (:locationIds!::uuid[])
  AND (:requestedBy::uuid IS NULL OR a.requested_by_principal_id = :requestedBy::uuid);
