import { z } from 'zod';
import { text } from '../common.js';

/**
 * Documentos del equipo (ADR 0019, E-01e): PDF públicos con las reglas de la ficha de seguridad (ADR 0017).
 * Los sube y los quita el Administrador; quitar archiva y el archivo se conserva.
 */

/** El límite general de archivos (02 §12). */
export const ASSET_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const assetDocumentKind = z.enum(['manual', 'invoice', 'warranty', 'service_report', 'delivery_record']);

/** POST /assets/:assetId/documents: el PDF va en el cuerpo (`application/pdf`); su tipo y su nombre, en la consulta. */
export const uploadAssetDocumentQuery = z.object({ kind: assetDocumentKind, title: text(120) }).strict();

export const assetDocumentParams = z.object({ workspaceId: z.uuid(), assetId: z.uuid(), documentId: z.uuid() });

export const assetDocument = z.object({
  id: z.uuid(),
  kind: assetDocumentKind,
  title: z.string(),
  /** Enlace público y permanente del PDF. */
  url: z.string(),
  byteSize: z.number().int().positive(),
  uploadedAt: z.string(),
  /** Quién lo subió; null si ya no es miembro. */
  uploadedBy: z.object({ name: z.string() }).nullable(),
});

/** GET /assets/:assetId/documents: los vigentes, del más reciente al más antiguo. */
export const assetDocumentList = z.object({ items: z.array(assetDocument) });

export type AssetDocumentKind = z.infer<typeof assetDocumentKind>;
export type AssetDocument = z.infer<typeof assetDocument>;
export type AssetDocumentList = z.infer<typeof assetDocumentList>;
