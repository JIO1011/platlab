/* Lo que cada bloque apartó (ADR 0023, L-01d): reservas de reactivos en la capacidad inventario y equipos concretos. */

/* @name insertActivityAllocation */
INSERT INTO labs.activity_allocations (workspace_id, activity_id, line, allocation_id)
VALUES (:workspaceId!, :activityId!, :line!, :allocationId!);

/* @name bookActivityAsset */
-- Un equipo ocupado en la franja (activity_assets_no_overlap) no se aparta: no devuelve fila y se prueba el siguiente.
INSERT INTO labs.activity_assets (workspace_id, activity_id, line, asset_id, during)
VALUES (:workspaceId!, :activityId!, :line!, :assetId!, tsrange(:date!::date + :startsAt!::time, :date!::date + :endsAt!::time))
ON CONFLICT DO NOTHING
RETURNING id;

/* @name activityAllocations */
SELECT activity_id, line, allocation_id
FROM labs.activity_allocations
WHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[]);

/* @name activityAssets */
-- Los equipos apartados vigentes de los bloques.
SELECT activity_id, line, asset_id
FROM labs.activity_assets
WHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[]) AND released_at IS NULL
ORDER BY created_at;

/* @name releaseActivityAssets */
UPDATE labs.activity_assets
SET released_at = now()
WHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[]) AND released_at IS NULL;

/* @name activeRequestActivities */
-- Los bloques activos de una solicitud, con su fecha, hora y área: lo que se aparta o se libera.
SELECT a.id, a.stage, a.on_date::text AS "date!", to_char(a.starts_at, 'HH24:MI') AS "starts_at!", to_char(a.ends_at, 'HH24:MI') AS "ends_at!",
  area.name AS area_name
FROM labs.activities AS a
JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
WHERE a.workspace_id = :workspaceId! AND a.request_id = :requestId! AND a.cancelled_at IS NULL
  AND (:activityId::uuid IS NULL OR a.id = :activityId::uuid);

/* @name assetBookingsOn */
-- Las franjas ya apartadas de esos equipos ese día: lo que la revisión antes de enviar descuenta para ver qué hay libre.
SELECT asset_id, to_char(lower(during), 'HH24:MI') AS "starts_at!", to_char(upper(during), 'HH24:MI') AS "ends_at!"
FROM labs.activity_assets
WHERE workspace_id = :workspaceId! AND asset_id = ANY (:assetIds!::uuid[]) AND released_at IS NULL
  AND during && tsrange(:date!::date, :date!::date + 1);

/* @name activityReagentLine */
-- Una línea de reactivo del catálogo de un bloque (ADR 0023, «Cierre de Laboratorios»): su ítem, lo pedido, el código de
-- la solicitud y el área del bloque, que es el destino de lo apartado.
SELECT r.number AS request_number, area.name AS area_name, l.item_id AS "item_id!", trim_scale(l.quantity)::text AS "quantity!",
  l.unit AS "unit!"
FROM labs.activities AS a
JOIN labs.requests AS r ON r.workspace_id = a.workspace_id AND r.id = a.request_id
JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
JOIN labs.request_lines AS l ON l.workspace_id = a.workspace_id AND l.request_id = a.request_id AND l.line = :line!
WHERE a.workspace_id = :workspaceId! AND a.id = :activityId! AND l.kind = 'reagent' AND l.item_id IS NOT NULL;

/* @name touchActivity */
-- Lo apartado de un bloque cambió: su versión también, para quien lo tenga abierto.
UPDATE labs.activities
SET version = version + 1
WHERE workspace_id = :workspaceId! AND id = :activityId!;
