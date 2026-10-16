import { AppError } from '../errors.js';

/** Cursor opaco para paginar por clave: el cliente no elige orden ni filtros arbitrarios. */
export function encodeCursor(values: string[]): string {
  return Buffer.from(JSON.stringify(values)).toString('base64url');
}

/** Valores de un cursor de `size` claves; uno manipulado o de otra lista es VALIDATION_FAILED. */
export function decodeCursor(cursor: string | undefined, size: number): string[] | null {
  if (cursor === undefined) return null;
  try {
    const values: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(values) && values.length === size && values.every((v) => typeof v === 'string')) {
      return values as string[];
    }
  } catch {
    // Se responde abajo como datos inválidos.
  }
  throw new AppError('VALIDATION_FAILED', 'Cursor inválido');
}
