/*
  Ubicaciones (ADR 0015, 0024): Core es su dueño; se crean, se renombran y se archivan desde Áreas con el
  permiso de algún módulo que las declara. Quien coloca algo en una ubicación la bloquea compartida; el
  archivo la bloquea exclusiva, así que nunca se archiva un lugar mientras alguien guarda algo en él.
*/

/* @name listActiveLocations */
-- Con su padre, para que la web arme los niveles (ADR 0015), su área y, si es un área, su encargado
-- (ADR 0019, E-01c).
SELECT l.id, l.code, l.name, l.kind, l.parent_id, la.area_id AS "area_id!", l.manager_principal_id
FROM core.locations AS l
JOIN core.location_areas AS la ON la.workspace_id = l.workspace_id AND la.location_id = l.id
WHERE l.workspace_id = :workspaceId!
  AND l.archived_at IS NULL
ORDER BY lower(l.code), l.id;

/* @name findActiveLocation */
-- El padre de una ubicación nueva, bloqueado (compartido) hasta el final: no se archiva mientras tanto.
SELECT id, kind
FROM core.locations
WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
FOR SHARE;

/* @name locationCodesLike */
-- Códigos del espacio iguales al propuesto o con un sufijo «-N».
SELECT code
FROM core.locations
WHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'));

/* @name insertLocation */
-- Un nombre activo repetido bajo el mismo padre, sin distinguir tildes ni mayúsculas, no inserta nada: el
-- comando responde NAME_TAKEN. Se ejecuta bajo el bloqueo de ubicaciones del espacio.
INSERT INTO core.locations (workspace_id, parent_id, kind, code, name)
VALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)
ON CONFLICT (workspace_id, parent_id, core.fold_text(name)) WHERE archived_at IS NULL DO NOTHING
RETURNING id, code, name, kind, parent_id;

/* @name lockLocation */
-- La ubicación activa, bloqueada para renombrarla.
SELECT id, name, kind, parent_id
FROM core.locations
WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
FOR UPDATE;

/* @name siblingNamed */
-- Otra ubicación activa con el mismo nombre plegado bajo el mismo padre, para nombrarla en el error.
SELECT name
FROM core.locations
WHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid
  AND core.fold_text(name) = core.fold_text(:name!) AND archived_at IS NULL AND id <> :exceptId!;

/* @name setLocationName */
UPDATE core.locations
SET name = :name!, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :locationId!;

/* @name lockLocationTree */
-- La ubicación activa y toda su descendencia activa, bloqueadas en orden de id para archivarlas (ADR 0024):
-- un ingreso, un traslado o un alta que esperaba la ubicación la relee archivada y no la usa.
WITH RECURSIVE tree AS (
  SELECT id FROM core.locations
  WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
  UNION ALL
  SELECT child.id
  FROM core.locations AS child
  JOIN tree ON child.parent_id = tree.id
  WHERE child.workspace_id = :workspaceId! AND child.archived_at IS NULL
)
SELECT l.id, l.kind, l.name
FROM core.locations AS l
WHERE l.workspace_id = :workspaceId! AND l.id IN (SELECT id FROM tree) AND l.archived_at IS NULL
ORDER BY l.id
FOR UPDATE OF l;

/* @name archiveLocations */
UPDATE core.locations
SET archived_at = now(), version = version + 1
WHERE workspace_id = :workspaceId! AND id = ANY (:locationIds!::uuid[]) AND archived_at IS NULL
RETURNING id;

/* @name listAreaCards */
-- Las áreas activas (ADR 0024): el primer nivel bajo la sede o el edificio, o la raíz; con su grupo (la
-- sede o el edificio que las contiene) y su encargado. Por grupo y nombre.
SELECT a.id, a.code, a.name, g.id AS group_id, g.name AS group_name,
       a.manager_principal_id, ident.display_name AS manager_name
FROM core.locations AS a
JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.id AND la.area_id = a.id
LEFT JOIN core.locations AS g ON g.workspace_id = a.workspace_id AND g.id = a.parent_id AND g.kind IN ('site', 'building')
LEFT JOIN core.principals AS pr ON pr.workspace_id = a.workspace_id AND pr.id = a.manager_principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
WHERE a.workspace_id = :workspaceId! AND a.archived_at IS NULL AND a.kind NOT IN ('site', 'building')
ORDER BY g.name IS NOT NULL, core.fold_text(coalesce(g.name, '')), core.fold_text(a.name), a.id;

/* @name listShelves */
-- Estantes y niveles activos de las áreas, con su padre para armar los niveles.
SELECT l.id, l.code, l.name, l.parent_id AS "parent_id!", la.area_id AS "area_id!"
FROM core.locations AS l
JOIN core.location_areas AS la ON la.workspace_id = l.workspace_id AND la.location_id = l.id
WHERE l.workspace_id = :workspaceId! AND l.archived_at IS NULL AND la.area_id <> l.id
  AND l.kind NOT IN ('site', 'building')
ORDER BY core.fold_text(l.name), l.id;

/* @name lockArea */
-- El área activa del espacio, bloqueada para cambiar su encargado (ADR 0019, E-01c), y si el miembro
-- propuesto está activo; sin fila si la ubicación no es un área. Un encargado nulo no se comprueba.
SELECT l.id, l.manager_principal_id,
  (:managerId::uuid IS NULL OR EXISTS (
    SELECT 1
    FROM core.principals AS pr
    JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
    WHERE pr.workspace_id = :workspaceId! AND pr.id = :managerId::uuid AND pr.kind = 'member' AND m.status = 'active'
  )) AS "manager_ok!"
FROM core.locations AS l
WHERE l.workspace_id = :workspaceId! AND l.id = :areaId! AND l.archived_at IS NULL
  AND EXISTS (
    SELECT 1 FROM core.location_areas AS la
    WHERE la.workspace_id = l.workspace_id AND la.location_id = l.id AND la.area_id = l.id
  )
FOR UPDATE OF l;

/* @name setAreaManager */
UPDATE core.locations
SET manager_principal_id = :managerId::uuid, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :areaId!;
