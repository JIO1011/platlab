import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { TokenVerifier, VerifiedToken } from '../auth/jwt.js';
import { AppError } from '../errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    verifiedToken: VerifiedToken | null;
  }
}

const bearer = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

/**
 * Exige un JWT válido en todas las rutas del ámbito donde se registra (02 §5, paso 1).
 * Las respuestas privadas no se guardan en caché (02 §10).
 */
export function requireAuthentication(app: FastifyInstance, verify: TokenVerifier): void {
  app.decorateRequest('verifiedToken', null);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const match = bearer.exec(request.headers.authorization ?? '');
    if (!match?.[1]) throw new AppError('IDENTITY_INVALID', 'Identidad inválida');
    request.verifiedToken = await verify(match[1]);
  });
}

export function verifiedSubject(request: FastifyRequest): string {
  if (!request.verifiedToken) throw new AppError('IDENTITY_INVALID', 'Identidad inválida');
  return request.verifiedToken.subject;
}
