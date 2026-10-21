/* Formato de Laboratorios (ADR 0023): versiones inmutables, una por guardado. */

/* @name latestForm */
-- La versión vigente: la más alta.
SELECT version, title, document_code, subject_label, unit_label, fields, published_at
FROM labs.form_versions
WHERE workspace_id = :workspaceId!
ORDER BY version DESC
LIMIT 1;

/* @name insertFormVersion */
-- La versión siguiente a la vista; si otra persona la publicó a la vez, la clave ya está tomada y no
-- inserta nada: el comando responde VERSION_CONFLICT.
INSERT INTO labs.form_versions
  (workspace_id, version, title, document_code, subject_label, unit_label, fields, published_by_principal_id)
VALUES (:workspaceId!, :version!, :title!, :documentCode, :subjectLabel!, :unitLabel!, :fields!::jsonb, :publishedBy!)
ON CONFLICT (workspace_id, version) DO NOTHING
RETURNING version, title, document_code, subject_label, unit_label, fields, published_at;
