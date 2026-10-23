import Fastify, { type FastifyInstance } from 'fastify';
import type pg from 'pg';
import type { HealthResponse } from '@platlab/contracts';
import { coreRoutes } from './modules/core/index.js';
import { equipmentAreaContribution, equipmentHomeSummary, equipmentRoutes } from './modules/equipment/index.js';
import { labsRoutes } from './modules/labs/index.js';
import { maintenanceHomeSummary, maintenanceRoutes } from './modules/maintenance/index.js';
import { reagentsAreaContribution, reagentsHomeSummary, reagentsRoutes } from './modules/reagents/index.js';
import type { TokenVerifier } from './platform/auth/jwt.js';
import { requireAuthentication } from './platform/http/auth.js';
import { registerErrorHandling } from './platform/http/errors.js';
import type { PublicFiles } from './platform/storage/public-files.js';

export interface AppDependencies {
  /** Pool del rol de runtime: sin propiedad de tablas ni BYPASSRLS (02 §5). */
  pool: pg.Pool;
  verifyToken: TokenVerifier;
  /** Bucket público de las fichas de seguridad (ADR 0017). */
  publicFiles: PublicFiles;
}

export function buildApp({ pool, verifyToken, publicFiles }: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  registerErrorHandling(app);

  app.get('/health', async (): Promise<HealthResponse> => ({ status: 'ok', service: 'api' }));

  // Todo lo que está bajo /v1 exige un JWT válido.
  app.register(
    async (v1) => {
      requireAuthentication(v1, verifyToken);
      await v1.register(
        coreRoutes({
          pool,
          homeSummaries: { reagents: reagentsHomeSummary, equipment: equipmentHomeSummary, maintenance: maintenanceHomeSummary },
          areaContributions: { reagents: reagentsAreaContribution, equipment: equipmentAreaContribution },
        }),
      );
      await v1.register(reagentsRoutes({ pool, publicFiles }), { prefix: '/workspaces/:workspaceId/reagents' });
      await v1.register(equipmentRoutes({ pool, publicFiles }), { prefix: '/workspaces/:workspaceId/equipment' });
      await v1.register(maintenanceRoutes({ pool, publicFiles }), { prefix: '/workspaces/:workspaceId/maintenance' });
      await v1.register(labsRoutes({ pool }), { prefix: '/workspaces/:workspaceId/labs' });
    },
    { prefix: '/v1' },
  );

  return app;
}
