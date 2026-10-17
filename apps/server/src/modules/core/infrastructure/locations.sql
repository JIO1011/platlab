/* Ubicaciones creadas desde la API (ADR 0015): Core es su dueño; las piden los módulos con su permiso. */

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
SELECT id, kind
FROM core.locations
WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL;

/* @name locationCodesLike */
-- Códigos del espacio iguales al propuesto o con un sufijo «-N».
SELECT code
FROM core.locations
WHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'));

/* @name insertLocation */
-- Un nombre activo repetido bajo el mismo padre, sin distinguir tildes ni mayúsculas, no crea otra:
-- devuelve la existente. Se ejecuta bajo el
-- bloqueo de códigos del espacio, así que la existente ya es visible para esta sentencia.
WITH inserted AS (
  INSERT INTO core.locations (workspace_id, parent_id, kind, code, name)
  VALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)
  ON CONFLICT (workspace_id, parent_id, core.fold_text(name)) WHERE archived_at IS NULL DO NOTHING
  RETURNING id, code, name, kind, parent_id
)
SELECT id AS "id!", code AS "code!", name AS "name!", kind AS "kind!", parent_id, true AS "created!" FROM inserted
UNION ALL
SELECT id, code, name, kind, parent_id, false FROM core.locations
WHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid
  AND core.fold_text(name) = core.fold_text(:name!)
  AND archived_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM inserted);

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
