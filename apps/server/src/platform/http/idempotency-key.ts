import type { FastifyRequest } from 'fastify';
import { AppError } from '../errors.js';

/** Cabecera Idempotency-Key opcional (02 §7); con formato inválido, la petición se rechaza. */
export function idempotencyKey(request: FastifyRequest): string | undefined {
  const value = request.headers['idempotency-key'];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
    throw new AppError('VALIDATION_FAILED', 'Idempotency-Key inválida');
  }
  return value;
}
