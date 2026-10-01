import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type pg from 'pg';
import {
  adjustmentRequest,
  createLotRequest,
  createProductRequest,
  issueRequest,
  operationListQuery,
  positionListQuery,
  productListQuery,
  productParams,
  receiptRequest,
  workspaceParams,
} from '@platlab/contracts';
import { verifiedSubject } from '../../../platform/http/auth.js';
import { idempotencyKey } from '../../../platform/http/idempotency-key.js';
import {
  createLot,
  createProduct,
  registerAdjustment,
  registerIssue,
  registerReceipt,
  type CommandRequest,
} from '../application/commands.js';
import { listOperations, listPositions, listProducts } from '../application/queries.js';

const queryRequest = (request: FastifyRequest) => ({
  subject: verifiedSubject(request),
  workspaceId: workspaceParams.parse(request.params).workspaceId,
});

const commandRequest = (request: FastifyRequest): CommandRequest => ({
  ...queryRequest(request),
  idempotencyKey: idempotencyKey(request),
});

/**
 * Rutas de Reactivos bajo /v1/workspaces/:workspaceId/reagents (primer incremento, «Rutas»).
 * Las operaciones de inventario se exponen aquí, con permisos `reagents.*`, nunca bajo /inventory.
 */
export function reagentsRoutes({ pool }: { pool: pg.Pool }): FastifyPluginAsync {
  return async (app) => {
    app.get('/products', async (request) =>
      listProducts(pool, queryRequest(request), productListQuery.parse(request.query)),
    );

    app.post('/products', async (request, reply) => {
      const input = createProductRequest.parse(request.body);
      return reply.status(201).send(await createProduct(pool, commandRequest(request), input));
    });

    app.post('/products/:productId/lots', async (request, reply) => {
      const { productId } = productParams.parse(request.params);
      const input = createLotRequest.parse(request.body);
      return reply.status(201).send(await createLot(pool, commandRequest(request), productId, input));
    });

    app.get('/positions', async (request) =>
      listPositions(pool, queryRequest(request), positionListQuery.parse(request.query)),
    );

    app.post('/receipts', async (request, reply) => {
      const input = receiptRequest.parse(request.body);
      return reply.status(201).send(await registerReceipt(pool, commandRequest(request), input));
    });

    app.post('/issues', async (request, reply) => {
      const input = issueRequest.parse(request.body);
      return reply.status(201).send(await registerIssue(pool, commandRequest(request), input));
    });

    app.post('/adjustments', async (request, reply) => {
      const input = adjustmentRequest.parse(request.body);
      return reply.status(201).send(await registerAdjustment(pool, commandRequest(request), input));
    });

    app.get('/operations', async (request) =>
      listOperations(pool, queryRequest(request), operationListQuery.parse(request.query)),
    );
  };
}
