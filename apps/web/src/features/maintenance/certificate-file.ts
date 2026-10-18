import { ASSET_DOCUMENT_MAX_BYTES } from '@platlab/contracts';

const MIB = 1024 * 1024;

/** El límite en palabras, «20 MiB», para la ayuda y el error del campo. */
export const certificateLimitText = `${ASSET_DOCUMENT_MAX_BYTES / MIB} MiB`;

const size = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 });

/** El peso de un archivo para leerlo: «850 KB», «1,2 MB». */
export function formatFileSize(bytes: number): string {
  return bytes < MIB ? `${size.format(Math.max(1, Math.round(bytes / 1024)))} KB` : `${size.format(bytes / MIB)} MB`;
}

/**
 * Lo que impide subir el certificado elegido, dicho con cómo resolverlo; null si puede subirse. El servidor lo
 * vuelve a comprobar por su contenido: esto solo evita esperar a que suba para enterarse.
 */
export function certificateFileError(file: Pick<File, 'type' | 'size'>): string | null {
  if (file.type !== 'application/pdf') return 'Solo se admite PDF: elige otro archivo o expórtalo a PDF.';
  if (file.size === 0) return 'El archivo está vacío: elige otro PDF.';
  if (file.size > ASSET_DOCUMENT_MAX_BYTES) return `El PDF supera ${certificateLimitText}: comprímelo o elige otro.`;
  return null;
}
