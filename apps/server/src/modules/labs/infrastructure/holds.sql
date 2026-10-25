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
SELECT a.id, a.on_date::text AS "date!", to_char(a.starts_at, 'HH24:MI') AS "starts_at!", to_char(a.ends_at, 'HH24:MI') AS "ends_at!",
  area.name AS area_name
FROM labs.activities AS a
JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
WHERE a.workspace_id = :workspaceId! AND a.request_id = :requestId! AND a.cancelled_at IS NULL
  AND (:activityId::uuid IS NULL OR a.id = :activityId::uuid);
