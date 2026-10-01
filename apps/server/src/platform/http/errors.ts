import type { FastifyError, FastifyInstance } from 'fastify';
import type { ErrorCode, ErrorResponse } from '@platlab/contracts';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';

const statusByCode: Record<ErrorCode, number> = {
  IDENTITY_INVALID: 401,
  ACCESS_DENIED: 403,
  MODULE_UNAVAILABLE: 403,
  MODULE_READ_ONLY: 403,
  WORKSPACE_RESTRICTED: 403,
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  IDEMPOTENCY_KEY_REUSED: 422,
  TRANSIENT_CONFLICT: 409,
  INTERNAL: 500,
};

// SQLSTATE de PostgreSQL que indican un conflicto que puede reintentarse: espera de bloqueo
// agotada (02 §6, §12), fallo de serialización e interbloqueo.
const transientSqlStates = new Set(['55P03', '40001', '40P01']);

const body = (code: ErrorCode, message: string): ErrorResponse => ({ error: { code, message } });

function sqlState(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

/** Traduce cualquier error al contrato de errores, sin filtrar detalles internos. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(statusByCode[error.code]).send(body(error.code, error.message));
    }
    if (error instanceof ZodError) {
      return reply.status(400).send(body('VALIDATION_FAILED', 'Datos inválidos'));
    }
    const state = sqlState(error);
    if (state && transientSqlStates.has(state)) {
      return reply
        .status(409)
        .send(body('TRANSIENT_CONFLICT', 'Conflicto transitorio; vuelve a intentarlo'));
    }
    // Errores propios de Fastify por la forma de la petición (JSON mal formado, tipo de contenido…).
    const statusCode = (error as FastifyError).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.status(400).send(body('VALIDATION_FAILED', 'Datos inválidos'));
    }
    request.log.error({ err: error }, 'error no controlado');
    return reply.status(500).send(body('INTERNAL', 'Error interno'));
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send(body('NOT_FOUND', 'Recurso no encontrado')),
  );
}
