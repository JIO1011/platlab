/* Proveedores de servicio de Mantenimiento (ADR 0020): se archivan, no se borran. */

/* @name listProviders */
-- Los activos en orden alfabético, sin tildes ni mayúsculas; con :providerId, ese proveedor aunque esté
-- archivado (la respuesta de un comando).
SELECT id, name, contact, archived_at, version
FROM maintenance.providers
WHERE workspace_id = :workspaceId!
  AND CASE WHEN :providerId::uuid IS NULL THEN archived_at IS NULL ELSE id = :providerId::uuid END
ORDER BY core.fold_text(name), id;

/* @name insertProvider */
-- Un nombre activo repetido (providers_name) falla y el comando responde NAME_TAKEN.
INSERT INTO maintenance.providers (workspace_id, name, contact)
VALUES (:workspaceId!, :name!, :contact)
RETURNING id;

/* @name lockProvider */
-- Lo último del orden de bloqueo (02 §6): el proveedor que se edita o se archiva.
SELECT name, contact, archived_at, version
FROM maintenance.providers
WHERE workspace_id = :workspaceId! AND id = :providerId!
FOR UPDATE;

/* @name updateProvider */
-- Escribe la ficha ya combinada y sube la versión; el comando la edita con el proveedor bloqueado.
UPDATE maintenance.providers
SET name = :name!, contact = :contact, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :providerId!;

/* @name archiveProvider */
-- Los registros hechos con él lo conservan; solo deja de ofrecerse al registrar.
UPDATE maintenance.providers
SET archived_at = now(), version = version + 1
WHERE workspace_id = :workspaceId! AND id = :providerId!;
