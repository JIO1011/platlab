import { AppError } from '../errors.js';

/**
 * Un PDF tal como llegó, de hasta `maxBytes` (02 §12): se reconoce por su contenido (`%PDF-`), nunca por
 * el tipo que declara el cliente.
 */
export function pdfBody(body: unknown, maxBytes: number, message: string): Buffer {
  const valid = Buffer.isBuffer(body) && body.byteLength <= maxBytes && body.subarray(0, 5).toString('latin1') === '%PDF-';
  if (!valid) throw new AppError('VALIDATION_FAILED', message);
  return body;
}
