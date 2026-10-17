import { ASSET_DOCUMENT_MAX_BYTES } from '@platlab/contracts';

const MIB = 1024 * 1024;

/** Lo más largo que puede ser el nombre del documento (el contrato de la API). */
export const DOCUMENT_TITLE_MAX = 120;

/** El límite en palabras, «20 MiB», para la ayuda y los errores del campo. */
export const documentLimitText = `${ASSET_DOCUMENT_MAX_BYTES / MIB} MiB`;

const size = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 });

/** El peso de un archivo para leerlo: «850 KB», «1,2 MB». */
export function formatFileSize(bytes: number): string {
  return bytes < MIB ? `${size.format(Math.max(1, Math.round(bytes / 1024)))} KB` : `${size.format(bytes / MIB)} MB`;
}

/** El nombre que se propone para el documento: el del archivo sin «.pdf», recortado al máximo del nombre. */
export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').slice(0, DOCUMENT_TITLE_MAX).trim();
}

/**
 * Lo que impide subir el archivo elegido, dicho con cómo resolverlo; null si puede subirse (ADR 0019, E-01e).
 * El servidor lo vuelve a comprobar por su contenido: esto solo evita esperar a que suba para enterarse.
 */
export function documentFileError(file: Pick<File, 'type' | 'size'> | null): string | null {
  if (!file) return 'Elige el PDF del documento.';
  if (file.type !== 'application/pdf') return 'Solo se admite PDF: elige otro archivo o expórtalo a PDF.';
  if (file.size === 0) return 'El archivo está vacío: elige otro PDF.';
  if (file.size > ASSET_DOCUMENT_MAX_BYTES) return `El PDF supera ${documentLimitText}: comprímelo o elige otro.`;
  return null;
}
