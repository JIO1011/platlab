import { z } from 'zod';

/**
 * Errores tipados de la API (primer incremento, «Rutas»). Cada entrega añade los suyos.
 * Una denegación nunca revela si el recurso existe en otro espacio.
 */
export const errorCodes = [
  'IDENTITY_INVALID',
  'ACCESS_DENIED',
  // Admisión de dos ejes (02 §6): el módulo no admite nada, o un eje no admite esta clase de acción.
  'MODULE_UNAVAILABLE',
  'MODULE_READ_ONLY',
  'WORKSPACE_RESTRICTED',
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'INSUFFICIENT_STOCK',
  // El código de frasco ya existe en el espacio (ADR 0015); el mensaje lo nombra.
  'CODE_TAKEN',
  // El nombre ya es de otro reactivo activo, sin tildes ni mayúsculas (ADR 0015); el mensaje lo nombra.
  'NAME_TAKEN',
  // Otra persona ya aprobó, rechazó o canceló la solicitud (ADR 0012).
  'REQUEST_RESOLVED',
  // Otra persona cambió el recurso desde la versión que se editaba (errores estables de 02).
  'VERSION_CONFLICT',
  'IDEMPOTENCY_KEY_REUSED',
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
