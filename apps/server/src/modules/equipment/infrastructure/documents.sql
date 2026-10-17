/*
 * Documentos del equipo (ADR 0019, E-01e): PDF que la API sube; quitar uno lo archiva y el archivo se conserva.
 */

/* @name listAssetDocuments */
-- Los vigentes del equipo, del más reciente al más antiguo (índice asset_documents_current), con el
-- nombre de quien subió cada uno. Con :documentId, solo ese, vigente o recién archivado (la respuesta
-- de subir y de archivar).
SELECT d.id, d.kind, d.title, d.url, d.byte_size, d.uploaded_at,
       (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id
          JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = d.uploaded_by_principal_id)
         AS "uploaded_by_name?"
FROM equipment.asset_documents AS d
WHERE d.workspace_id = :workspaceId! AND d.asset_id = :assetId!
  AND (:documentId::uuid IS NULL AND d.archived_at IS NULL OR d.id = :documentId::uuid)
ORDER BY d.uploaded_at DESC, d.id DESC;

/* @name insertAssetDocument */
-- Un documento subido: fila nueva, nunca reemplaza otra.
INSERT INTO equipment.asset_documents
  (workspace_id, id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)
VALUES
  (:workspaceId!, :id!, :assetId!, :kind!, :title!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)
RETURNING id;

/* @name archiveAssetDocument */
-- Quitar un documento vigente del equipo: deja de verse y su archivo se conserva.
UPDATE equipment.asset_documents
SET archived_at = now(), archived_by_principal_id = :archivedBy!
WHERE workspace_id = :workspaceId! AND asset_id = :assetId! AND id = :documentId! AND archived_at IS NULL
RETURNING id;
