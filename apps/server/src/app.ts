import Fastify, { type FastifyInstance } from 'fastify';
import type pg from 'pg';
import type { HealthResponse } from '@platlab/contracts';
import { coreRoutes } from './modules/core/index.js';
import type { TokenVerifier } from './platform/auth/jwt.js';
import { requireAuthentication } from './platform/http/auth.js';
import { registerErrorHandling } from './platform/http/errors.js';

export interface AppDependencies {
  /** Pool del rol de runtime: sin propiedad de tablas ni BYPASSRLS (02 §5). */
  pool: pg.Pool;
  verifyToken: TokenVerifier;
}

export function buildApp({ pool, verifyToken }: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  registerErrorHandling(app);

  app.get('/health', async (): Promise<HealthResponse> => ({ status: 'ok', service: 'api' }));

  // Todo lo que está bajo /v1 exige un JWT válido.
  app.register(
    async (v1) => {
      requireAuthentication(v1, verifyToken);
      await v1.register(coreRoutes({ pool }));
    },
    { prefix: '/v1' },
  );

  return app;
}
