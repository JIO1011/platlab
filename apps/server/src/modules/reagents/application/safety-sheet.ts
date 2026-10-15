import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { SAFETY_SHEET_MAX_BYTES, type Product } from '@platlab/contracts';
import { lockItem } from '../../../capabilities/inventory/index.js';
import { AppError } from '../../../platform/errors.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import { recordAudit, withModuleAccess } from '../../core/index.js';
import { insertSafetySheet, pointProductSheet } from '../infrastructure/products.queries.js';
import { productDetailOf, toProduct } from './catalog.js';
import { CATALOG, inventoryContext, requires, runCommand, type CommandRequest } from './command.js';

/** El PDF tal como llegó: se reconoce por su contenido (`%PDF-`), nunca por el tipo que declara el cliente. */
function safetySheetPdf(body: unknown): Buffer {
  const valid =
    Buffer.isBuffer(body) &&
    body.byteLength <= SAFETY_SHEET_MAX_BYTES &&
    body.subarray(0, 5).toString('latin1') === '%PDF-';
  if (!valid) throw new AppError('VALIDATION_FAILED', 'La ficha de seguridad debe ser un PDF de hasta 6 MiB');
  return body;
}

/**
 * Sube el PDF de la ficha de seguridad y lo deja como vigente (ADR 0017). Nada externo ocurre con la
 * transacción abierta: una primera autoriza, el archivo se sube fuera y otra vuelve a autorizar y lo
 * registra. Si el registro falla, el archivo queda sin referencia en el bucket público.
 */
export async function uploadSafetySheet(
  pool: pg.Pool,
  files: PublicFiles,
  request: CommandRequest,
  productId: string,
  body: unknown,
): Promise<Product> {
  const pdf = safetySheetPdf(body);
  const authorize = requires(CATALOG);
  // Sin el permiso de catálogo o sin el reactivo, nada llega al bucket.
  await withModuleAccess(
    pool,
    { subject: request.subject, workspaceId: request.workspaceId, moduleCode: 'reagents', actionClass: 'new_operation' },
    async (access) => {
      await authorize(access);
      await productDetailOf(access, productId);
    },
  );
  const sheetId = randomUUID();
  const objectPath = `${request.workspaceId}/sds/${sheetId}.pdf`;
  const url = await files.put(objectPath, pdf, 'application/pdf');
  const sha256 = createHash('sha256').update(pdf).digest('hex');

  return runCommand(pool, request, 'reagents.product.safety_sheet', { productId, sha256 }, authorize, async (access) => {
    const item = await lockItem(inventoryContext(access), productId);
    const before = toProduct(item, await productDetailOf(access, productId));
    await insertSafetySheet.run(
      {
        workspaceId: access.workspace.id,
        id: sheetId,
        productId,
        objectPath,
        url,
        byteSize: pdf.byteLength,
        sha256,
        uploadedBy: access.principalId,
      },
      access.client,
    );
    const [pointed] = await pointProductSheet.run(
      { workspaceId: access.workspace.id, itemId: productId, sheetId },
      access.client,
    );
    if (!pointed) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    const after: Product = { ...before, sdsKind: 'digital', sdsUrl: null, sdsFileUrl: url };
    await recordAudit(access, {
      action: 'reagents.product.safety_sheet',
      entityType: 'inventory.item',
      entityId: productId,
      changes: {
        sdsKind: { from: before.sdsKind, to: after.sdsKind },
        sdsUrl: { from: before.sdsUrl, to: null },
        sdsFileUrl: { from: before.sdsFileUrl, to: url },
        sha256,
        byteSize: pdf.byteLength,
      },
    });
    return after;
  });
}
