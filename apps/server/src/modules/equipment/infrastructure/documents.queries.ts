/** Types generated for queries found in "src/modules/equipment/infrastructure/documents.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListAssetDocuments' parameters type */
export interface IListAssetDocumentsParams {
  assetId: string;
  documentId?: string | null | void;
  workspaceId: string;
}

/** 'ListAssetDocuments' return type */
export interface IListAssetDocumentsResult {
  byte_size: number;
  id: string;
  kind: string;
  title: string;
  uploaded_at: Date;
  uploaded_by_name: string | null;
  url: string;
}

/** 'ListAssetDocuments' query type */
export interface IListAssetDocumentsQuery {
  params: IListAssetDocumentsParams;
  result: IListAssetDocumentsResult;
}

const listAssetDocumentsIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true,"documentId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":525,"b":537},{"a":669,"b":681}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":700,"b":708}]},{"name":"documentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":717,"b":727},{"a":779,"b":789}]}],"statement":"-- Los vigentes del equipo, del más reciente al más antiguo (índice asset_documents_current), con el\n-- nombre de quien subió cada uno. Con :documentId, solo ese, vigente o recién archivado (la respuesta\n-- de subir y de archivar).\nSELECT d.id, d.kind, d.title, d.url, d.byte_size, d.uploaded_at,\n       (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id\n          JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = d.uploaded_by_principal_id)\n         AS \"uploaded_by_name?\"\nFROM equipment.asset_documents AS d\nWHERE d.workspace_id = :workspaceId! AND d.asset_id = :assetId!\n  AND (:documentId::uuid IS NULL AND d.archived_at IS NULL OR d.id = :documentId::uuid)\nORDER BY d.uploaded_at DESC, d.id DESC"};

/**
 * Query generated from SQL:
 * ```
 * -- Los vigentes del equipo, del más reciente al más antiguo (índice asset_documents_current), con el
 * -- nombre de quien subió cada uno. Con :documentId, solo ese, vigente o recién archivado (la respuesta
 * -- de subir y de archivar).
 * SELECT d.id, d.kind, d.title, d.url, d.byte_size, d.uploaded_at,
 *        (SELECT i.display_name FROM core.principals AS p JOIN core.memberships AS m ON m.workspace_id = p.workspace_id AND m.id = p.membership_id
 *           JOIN core.identities AS i ON i.id = m.identity_id WHERE p.workspace_id = :workspaceId! AND p.id = d.uploaded_by_principal_id)
 *          AS "uploaded_by_name?"
 * FROM equipment.asset_documents AS d
 * WHERE d.workspace_id = :workspaceId! AND d.asset_id = :assetId!
 *   AND (:documentId::uuid IS NULL AND d.archived_at IS NULL OR d.id = :documentId::uuid)
 * ORDER BY d.uploaded_at DESC, d.id DESC
 * ```
 */
export const listAssetDocuments = new PreparedQuery<IListAssetDocumentsParams,IListAssetDocumentsResult>(listAssetDocumentsIR);


/** 'InsertAssetDocument' parameters type */
export interface IInsertAssetDocumentParams {
  assetId: string;
  byteSize: number;
  id: string;
  kind: string;
  objectPath: string;
  sha256: string;
  title: string;
  uploadedBy: string;
  url: string;
  workspaceId: string;
}

/** 'InsertAssetDocument' return type */
export interface IInsertAssetDocumentResult {
  id: string;
}

/** 'InsertAssetDocument' query type */
export interface IInsertAssetDocumentQuery {
  params: IInsertAssetDocumentParams;
  result: IInsertAssetDocumentResult;
}

const insertAssetDocumentIR: any = {"usedParamSet":{"workspaceId":true,"id":true,"assetId":true,"kind":true,"title":true,"objectPath":true,"url":true,"byteSize":true,"sha256":true,"uploadedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":213,"b":225}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":228,"b":231}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":234,"b":242}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":245,"b":250}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":253,"b":259}]},{"name":"objectPath","required":true,"transform":{"type":"scalar"},"locs":[{"a":262,"b":273}]},{"name":"url","required":true,"transform":{"type":"scalar"},"locs":[{"a":276,"b":280}]},{"name":"byteSize","required":true,"transform":{"type":"scalar"},"locs":[{"a":283,"b":292}]},{"name":"sha256","required":true,"transform":{"type":"scalar"},"locs":[{"a":295,"b":302}]},{"name":"uploadedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":305,"b":316}]}],"statement":"-- Un documento subido: fila nueva, nunca reemplaza otra.\nINSERT INTO equipment.asset_documents\n  (workspace_id, id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)\nVALUES\n  (:workspaceId!, :id!, :assetId!, :kind!, :title!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un documento subido: fila nueva, nunca reemplaza otra.
 * INSERT INTO equipment.asset_documents
 *   (workspace_id, id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)
 * VALUES
 *   (:workspaceId!, :id!, :assetId!, :kind!, :title!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)
 * RETURNING id
 * ```
 */
export const insertAssetDocument = new PreparedQuery<IInsertAssetDocumentParams,IInsertAssetDocumentResult>(insertAssetDocumentIR);


/** 'ArchiveAssetDocument' parameters type */
export interface IArchiveAssetDocumentParams {
  archivedBy: string;
  assetId: string;
  documentId: string;
  workspaceId: string;
}

/** 'ArchiveAssetDocument' return type */
export interface IArchiveAssetDocumentResult {
  id: string;
}

/** 'ArchiveAssetDocument' query type */
export interface IArchiveAssetDocumentQuery {
  params: IArchiveAssetDocumentParams;
  result: IArchiveAssetDocumentResult;
}

const archiveAssetDocumentIR: any = {"usedParamSet":{"archivedBy":true,"workspaceId":true,"assetId":true,"documentId":true},"params":[{"name":"archivedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":179}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":214}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":231,"b":239}]},{"name":"documentId","required":true,"transform":{"type":"scalar"},"locs":[{"a":250,"b":261}]}],"statement":"-- Quitar un documento vigente del equipo: deja de verse y su archivo se conserva.\nUPDATE equipment.asset_documents\nSET archived_at = now(), archived_by_principal_id = :archivedBy!\nWHERE workspace_id = :workspaceId! AND asset_id = :assetId! AND id = :documentId! AND archived_at IS NULL\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Quitar un documento vigente del equipo: deja de verse y su archivo se conserva.
 * UPDATE equipment.asset_documents
 * SET archived_at = now(), archived_by_principal_id = :archivedBy!
 * WHERE workspace_id = :workspaceId! AND asset_id = :assetId! AND id = :documentId! AND archived_at IS NULL
 * RETURNING id
 * ```
 */
export const archiveAssetDocument = new PreparedQuery<IArchiveAssetDocumentParams,IArchiveAssetDocumentResult>(archiveAssetDocumentIR);


