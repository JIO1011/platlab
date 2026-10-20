import { pdfFileError } from '../../app/pdf-file';

/** Lo más largo que puede ser el nombre del documento (el contrato de la API). */
export const DOCUMENT_TITLE_MAX = 120;

/** El nombre que se propone para el documento: el del archivo sin «.pdf», recortado al máximo del nombre. */
export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').slice(0, DOCUMENT_TITLE_MAX).trim();
}

/** Lo que impide subir el archivo elegido, o pedirlo si falta; null si puede subirse (ADR 0019, E-01e). */
export function documentFileError(file: Pick<File, 'type' | 'size'> | null): string | null {
  return file ? pdfFileError(file) : 'Elige el PDF del documento.';
}
