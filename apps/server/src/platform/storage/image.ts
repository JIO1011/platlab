import { AppError } from '../errors.js';

/** Las imágenes que se aceptan, reconocidas por su contenido y nunca por el tipo que declara el cliente. */
const formats = [
  { type: 'image/jpeg', extension: 'jpg', matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: 'image/png',
    extension: 'png',
    matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    type: 'image/webp',
    extension: 'webp',
    matches: (b: Buffer) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
] as const;

export type ImageFormat = (typeof formats)[number];

/** Una imagen JPEG, PNG o WebP de hasta `maxBytes`, tal como llegó; si no lo es, VALIDATION_FAILED con `message`. */
export function imageBody(body: unknown, maxBytes: number, message: string): { image: Buffer; format: ImageFormat } {
  const format = Buffer.isBuffer(body) && body.byteLength <= maxBytes ? formats.find((entry) => entry.matches(body)) : undefined;
  if (!format || !Buffer.isBuffer(body)) throw new AppError('VALIDATION_FAILED', message);
  return { image: body, format };
}
