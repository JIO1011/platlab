/*
  Departamentos (ADR 0024): lista del Núcleo con los dueños y las carreras del espacio. El lote y el equipo
  la guardan enlazada; archivar solo la deja de ofrecer. Altas y nombres nuevos se comprueban bajo el
  bloqueo de departamentos del espacio.
*/

/* @name listActiveDepartments */
SELECT id, name
FROM core.departments
WHERE workspace_id = :workspaceId! AND archived_at IS NULL
ORDER BY lower(name), id;

/* @name insertDepartment */
-- Un nombre activo repetido (departments_name) no inserta nada: el comando responde NAME_TAKEN.
INSERT INTO core.departments (workspace_id, name)
VALUES (:workspaceId!, :name!)
ON CONFLICT (workspace_id, lower(name)) WHERE archived_at IS NULL DO NOTHING
RETURNING id, name;

/* @name departmentNamed */
-- El departamento activo con el mismo nombre, sin mayúsculas, para nombrarlo en el error.
SELECT name
FROM core.departments
WHERE workspace_id = :workspaceId! AND lower(name) = lower(:name!) AND archived_at IS NULL
  AND id IS DISTINCT FROM :exceptId::uuid;

/* @name lockDepartment */
-- El departamento activo del espacio, bloqueado: exclusivo para renombrarlo o archivarlo, compartido para
-- enlazarlo a un lote o un equipo.
SELECT id, name
FROM core.departments
WHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL
FOR UPDATE;

/* @name shareDepartment */
SELECT id, name
FROM core.departments
WHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL
FOR SHARE;

/* @name setDepartmentName */
UPDATE core.departments
SET name = :name!
WHERE workspace_id = :workspaceId! AND id = :departmentId!;

/* @name archiveDepartment */
UPDATE core.departments
SET archived_at = now()
WHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL
RETURNING id;
