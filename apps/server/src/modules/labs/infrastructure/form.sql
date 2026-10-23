/* Formatos de Laboratorios (ADR 0023): se renombran y se archivan; cada guardado publica una revisión inmutable. */

/* @name listForms */
-- Activos primero, por nombre, con su última revisión; los archivados solo con :includeArchived.
SELECT f.id, f.name, f.version, f.archived_at, r.revision, r.title, r.published_at
FROM labs.forms AS f
CROSS JOIN LATERAL (
  SELECT revision, title, published_at
  FROM labs.form_revisions
  WHERE form_id = f.id
  ORDER BY revision DESC
  LIMIT 1
) AS r
WHERE f.workspace_id = :workspaceId! AND (:includeArchived! OR f.archived_at IS NULL)
ORDER BY f.archived_at IS NOT NULL, core.fold_text(f.name), f.id;

/* @name formById */
-- El formato con su última revisión completa: la que se llena y la que se edita.
SELECT f.id, f.name, f.version, f.archived_at, r.revision, r.title, r.document_code, r.layout, r.published_at
FROM labs.forms AS f
CROSS JOIN LATERAL (
  SELECT revision, title, document_code, layout, published_at
  FROM labs.form_revisions
  WHERE form_id = f.id
  ORDER BY revision DESC
  LIMIT 1
) AS r
WHERE f.workspace_id = :workspaceId! AND f.id = :formId!;

/* @name lockForm */
-- Lo último del orden de bloqueo (02 §6): el formato que se renombra, se archiva o recibe una revisión.
SELECT archived_at, version
FROM labs.forms
WHERE workspace_id = :workspaceId! AND id = :formId!
FOR UPDATE;

/* @name lastRevision */
-- La última revisión, leída después de bloquear el formato y en otra sentencia: así ve la que otra
-- persona publicó mientras se esperaba el bloqueo.
SELECT max(revision) AS "revision!"
FROM labs.form_revisions
WHERE workspace_id = :workspaceId! AND form_id = :formId!;

/* @name insertForm */
-- Un nombre activo repetido (forms_active_name) falla y el comando responde NAME_TAKEN.
INSERT INTO labs.forms (workspace_id, name, created_by_principal_id)
VALUES (:workspaceId!, :name!, :createdBy!)
RETURNING id;

/* @name insertFormRevision */
-- La revisión siguiente a la vista, con el formato bloqueado; si aun así la clave ya está tomada, no
-- inserta nada y el comando responde VERSION_CONFLICT.
INSERT INTO labs.form_revisions (workspace_id, form_id, revision, title, document_code, layout, published_by_principal_id)
VALUES (:workspaceId!, :formId!, :revision!, :title!, :documentCode, :layout!::jsonb, :publishedBy!)
ON CONFLICT (form_id, revision) DO NOTHING
RETURNING revision;

/* @name renameForm */
-- Un nombre activo repetido falla igual que al crear.
UPDATE labs.forms
SET name = :name!, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :formId!;

/* @name archiveForm */
-- Deja de ofrecerse para llenar; las solicitudes hechas con él conservan su revisión.
UPDATE labs.forms
SET archived_at = now(), version = version + 1
WHERE workspace_id = :workspaceId! AND id = :formId!;
