/* Espacios de Laboratorios (ADR 0023): áreas del Núcleo con aforo y horario semanal; se archivan, no se borran. */

/* @name listSpaces */
-- Activos primero, por sede o edificio y nombre del área, con si el área se archivó en «Áreas»; con
-- :areaId, ese espacio (la respuesta de un comando).
SELECT s.area_id, a.name AS area_name, g.name AS "group_name?", (a.archived_at IS NOT NULL) AS "area_archived!",
       s.capacity, s.weekly_hours, s.version, s.archived_at
FROM labs.spaces AS s
JOIN core.locations AS a ON a.workspace_id = s.workspace_id AND a.id = s.area_id
LEFT JOIN core.locations AS g ON g.workspace_id = a.workspace_id AND g.id = a.parent_id AND g.kind IN ('site', 'building')
WHERE s.workspace_id = :workspaceId!
  AND (:areaId::uuid IS NULL OR s.area_id = :areaId::uuid)
ORDER BY s.archived_at IS NOT NULL, g.name IS NOT NULL, core.fold_text(coalesce(g.name, '')), core.fold_text(a.name), s.area_id;

/* @name shareActiveArea */
-- El área activa del Núcleo (ADR 0024: primer nivel bajo la sede o el edificio, o la raíz), bloqueada
-- compartida hasta el final, como quien coloca algo en ella: no se archiva mientras se habilita. Sin
-- fila si no es un área, está archivada o es de otro espacio (RLS).
SELECT l.id
FROM core.locations AS l
WHERE l.workspace_id = :workspaceId! AND l.id = :areaId! AND l.archived_at IS NULL
  AND l.kind NOT IN ('site', 'building')
  AND EXISTS (
    SELECT 1 FROM core.location_areas AS la
    WHERE la.workspace_id = l.workspace_id AND la.location_id = l.id AND la.area_id = l.id
  )
FOR SHARE OF l;

/* @name lockSpace */
-- Lo último del orden de bloqueo (02 §6): el espacio que se habilita, se edita o se archiva.
SELECT capacity, weekly_hours, archived_at, version
FROM labs.spaces
WHERE workspace_id = :workspaceId! AND area_id = :areaId!
FOR UPDATE;

/* @name shareSpace */
-- El espacio de un cierre nuevo, bloqueado compartido: no se archiva mientras tanto.
SELECT archived_at, version
FROM labs.spaces
WHERE workspace_id = :workspaceId! AND area_id = :areaId!
FOR SHARE;

/* @name insertSpace */
-- Si otra persona habilitó la misma área a la vez, no inserta nada y el comando responde que ya está
-- habilitada.
INSERT INTO labs.spaces (workspace_id, area_id, capacity, weekly_hours, created_by_principal_id)
VALUES (:workspaceId!, :areaId!, :capacity!, :weeklyHours!::jsonb, :createdBy!)
ON CONFLICT (workspace_id, area_id) DO NOTHING
RETURNING area_id;

/* @name writeSpace */
-- Escribe aforo y horario ya combinados, reactiva si estaba archivado y sube la versión; el comando lo
-- hace con el espacio bloqueado.
UPDATE labs.spaces
SET capacity = :capacity!, weekly_hours = :weeklyHours!::jsonb, archived_at = NULL, version = version + 1
WHERE workspace_id = :workspaceId! AND area_id = :areaId!;

/* @name archiveSpace */
-- Deja de agendarse; sus cierres se conservan.
UPDATE labs.spaces
SET archived_at = now(), version = version + 1
WHERE workspace_id = :workspaceId! AND area_id = :areaId!;
