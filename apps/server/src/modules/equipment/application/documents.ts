import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { z } from 'zod';
import { ASSET_DOCUMENT_MAX_BYTES, type AssetDocument, type AssetDocumentList, type uploadAssetDocumentQuery } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { pdfBody } from '../../../platform/storage/pdf.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import { recordAudit, requires, withModuleAccess, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  archiveAssetDocument as archiveAssetDocumentQuery,
  insertAssetDocument,
  listAssetDocuments as listAssetDocumentsQuery,
  type IListAssetDocumentsResult,
} from '../infrastructure/documents.queries.js';
import { CATALOG, lockActiveAsset, runCommand, runQuery } from './command.js';
import { assetById } from './queries.js';

/** Documentos del equipo (ADR 0019, E-01e): los sube y los quita el Administrador; el Operador los ve. */

const toDocument = (row: IListAssetDocumentsResult): AssetDocument => ({
  id: row.id,
  kind: row.kind as AssetDocument['kind'],
  title: row.title,
  url: row.url,
  byteSize: row.byte_size,
  uploadedAt: row.uploaded_at.toISOString(),
  uploadedBy: row.uploaded_by_name ? { name: row.uploaded_by_name } : null,
});

/** Un documento del equipo, vigente o recién archivado: la respuesta de subir y de archivar. */
async function documentById(access: WorkspaceAccess, assetId: string, documentId: string): Promise<AssetDocument> {
  const [row] = await listAssetDocumentsQuery.run({ workspaceId: access.workspace.id, assetId, documentId }, access.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toDocument(row);
}

/**
 * Sube un documento del equipo, como la ficha de seguridad (ADR 0017): nada externo ocurre con la
 * transacción abierta. Una primera autoriza y comprueba el equipo, el archivo se sube fuera y otra
 * vuelve a autorizar y lo registra. Si el registro falla, el archivo queda sin referencia en el bucket público.
 */
export async function uploadAssetDocument(
  pool: pg.Pool,
  files: PublicFiles,
  request: CommandRequest,
  assetId: string,
  input: z.infer<typeof uploadAssetDocumentQuery>,
  body: unknown,
): Promise<AssetDocument> {
  const pdf = pdfBody(body, ASSET_DOCUMENT_MAX_BYTES, 'El documento debe ser un PDF de hasta 20 MiB');
  const authorize = requires(CATALOG);
  // Sin el permiso de catálogo, sin el equipo o con el equipo dado de baja, nada llega al bucket.
  await withModuleAccess(
    pool,
    { subject: request.subject, workspaceId: request.workspaceId, moduleCode: 'equipment', actionClass: 'new_operation' },
    async (access) => {
      await authorize(access);
      await lockActiveAsset(access, assetId);
    },
  );
  const documentId = randomUUID();
  const objectPath = `${request.workspaceId}/equipment/documents/${documentId}.pdf`;
  const url = await files.put(objectPath, pdf, 'application/pdf');
  const sha256 = createHash('sha256').update(pdf).digest('hex');

  return runCommand(pool, request, 'equipment.asset.document.add', { assetId, ...input, sha256 }, authorize, async (access) => {
    await lockActiveAsset(access, assetId);
    await insertAssetDocument.run(
      {
        workspaceId: access.workspace.id,
        id: documentId,
        assetId,
        kind: input.kind,
        title: input.title,
        objectPath,
        url,
        byteSize: pdf.byteLength,
        sha256,
        uploadedBy: access.principalId,
      },
      access.client,
    );
    await recordAudit(access, {
      action: 'equipment.asset.document.add',
      entityType: 'equipment.asset_document',
      entityId: documentId,
      changes: { assetId, kind: input.kind, title: input.title, sha256, byteSize: pdf.byteLength },
    });
    return documentById(access, assetId, documentId);
  });
}

/**
 * Quita un documento vigente del equipo: lo archiva y su archivo público se conserva. Un equipo dado de baja
 * queda como estaba, también sus documentos.
 */
export function archiveAssetDocument(pool: pg.Pool, request: CommandRequest, assetId: string, documentId: string): Promise<AssetDocument> {
  return runCommand(pool, request, 'equipment.asset.document.archive', { assetId, documentId }, requires(CATALOG), async (access) => {
    await lockActiveAsset(access, assetId);
    const [archived] = await archiveAssetDocumentQuery.run(
      { workspaceId: access.workspace.id, assetId, documentId, archivedBy: access.principalId },
      access.client,
    );
    if (!archived) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    await recordAudit(access, {
      action: 'equipment.asset.document.archive',
      entityType: 'equipment.asset_document',
      entityId: documentId,
      changes: { assetId, archived: true },
    });
    return documentById(access, assetId, documentId);
  });
}

/** Los documentos vigentes del equipo, también de uno dado de baja. */
export function listAssetDocuments(pool: pg.Pool, request: QueryRequest, assetId: string): Promise<AssetDocumentList> {
  return runQuery(pool, request, async (access) => {
    await assetById(access, assetId);
    const rows = await listAssetDocumentsQuery.run({ workspaceId: access.workspace.id, assetId }, access.client);
    return { items: rows.map(toDocument) };
  });
}
