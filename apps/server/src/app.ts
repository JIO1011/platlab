import Fastify, { type FastifyInstance } from 'fastify';
import type { HealthResponse } from '@platlab/contracts';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', async (): Promise<HealthResponse> => ({ status: 'ok', service: 'api' }));

  return app;
}
