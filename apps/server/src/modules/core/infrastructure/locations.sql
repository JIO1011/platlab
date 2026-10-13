/* Ubicaciones creadas desde la API (ADR 0015): Core es su dueño; las piden los módulos con su permiso. */

/* @name findParentLocation */
SELECT id, kind
FROM core.locations
WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL;

/* @name locationCodesLike */
-- Códigos del espacio iguales al propuesto o con un sufijo «-N».
SELECT code
FROM core.locations
WHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'));

/* @name insertLocation */
-- Un nombre activo repetido bajo el mismo padre no crea otra: devuelve la existente. Se ejecuta bajo el
-- bloqueo de códigos del espacio, así que la existente ya es visible para esta sentencia.
WITH inserted AS (
  INSERT INTO core.locations (workspace_id, parent_id, kind, code, name)
  VALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)
  ON CONFLICT (workspace_id, parent_id, lower(name)) WHERE archived_at IS NULL DO NOTHING
  RETURNING id, code, name, kind, parent_id
)
SELECT id AS "id!", code AS "code!", name AS "name!", kind AS "kind!", parent_id, true AS "created!" FROM inserted
UNION ALL
SELECT id, code, name, kind, parent_id, false FROM core.locations
WHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid AND lower(name) = lower(:name!)
  AND archived_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM inserted);
