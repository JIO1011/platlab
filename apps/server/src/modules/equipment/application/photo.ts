import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { ASSET_PHOTO_MAX_BYTES, type Asset } from '@platlab/contracts';
import { imageBody } from '../../../platform/storage/image.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import { recordAudit, requires, withModuleAccess, type CommandRequest } from '../../core/index.js';
import { insertAssetPhoto, pointAssetPhoto } from '../infrastructure/assets.queries.js';
import { CATALOG, lockActiveAsset, runCommand } from './command.js';
import { assetById } from './queries.js';

/**
 * Sube la foto del equipo y la deja como vigente (ADR 0019), como la ficha de seguridad (ADR 0017):
 * nada externo ocurre con la transacción abierta. Una primera autoriza y comprueba el equipo, el
 * archivo se sube fuera y otra vuelve a autorizar y lo registra. Si el registro falla, el archivo
 * queda sin referencia en el bucket público.
 */
export async function uploadAssetPhoto(
  pool: pg.Pool,
  files: PublicFiles,
  request: CommandRequest,
  assetId: string,
  body: unknown,
): Promise<Asset> {
  const { image, format } = imageBody(body, ASSET_PHOTO_MAX_BYTES, 'La foto debe ser una imagen JPEG, PNG o WebP de hasta 2 MiB');
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
  const photoId = randomUUID();
  const objectPath = `${request.workspaceId}/equipment/${photoId}.${format.extension}`;
  const url = await files.put(objectPath, image, format.type);
  const sha256 = createHash('sha256').update(image).digest('hex');

  return runCommand(pool, request, 'equipment.asset.photo', { assetId, sha256 }, authorize, async (access) => {
    const before = await lockActiveAsset(access, assetId);
    await insertAssetPhoto.run(
      {
        workspaceId: access.workspace.id,
        id: photoId,
        assetId,
        objectPath,
        url,
        contentType: format.type,
        byteSize: image.byteLength,
        sha256,
        uploadedBy: access.principalId,
      },
      access.client,
    );
    await pointAssetPhoto.run({ workspaceId: access.workspace.id, assetId, photoId }, access.client);
    await recordAudit(access, {
      action: 'equipment.asset.photo',
      entityType: 'equipment.asset',
      entityId: assetId,
      changes: { photo: { from: before.photo_id, to: photoId }, sha256, byteSize: image.byteLength },
    });
    return assetById(access, assetId);
  });
}
