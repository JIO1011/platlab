import { z } from 'zod';

/**
 * Errores tipados de la API (primer incremento, «Rutas»). Cada entrega añade los suyos.
 * Una denegación nunca revela si el recurso existe en otro espacio.
 */
export const errorCodes = [
  'IDENTITY_INVALID',
  'ACCESS_DENIED',
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'TRANSIENT_CONFLICT',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export const errorResponse = z.object({
  error: z.object({
    code: z.enum(errorCodes),
    message: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponse>;
