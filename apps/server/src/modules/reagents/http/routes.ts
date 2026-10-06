import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type pg from 'pg';
import {
  adjustmentRequest,
  containerParams,
  countRequest,
  createDestinationRequest,
  createLotRequest,
  createReasonRequest,
  entryParams,
  issueRequestListQuery,
  issueRequestParams,
  rejectIssueRequest,
  createProductRequest,
  issueRequest,
  operationListQuery,
  positionListQuery,
  productListQuery,
  productParams,
  reasonListQuery,
  receiptRequest,
  setMinimumRequest,
  transferRequest,
  workspaceParams,
} from '@platlab/contracts';
import { verifiedSubject } from '../../../platform/http/auth.js';
import { idempotencyKey } from '../../../platform/http/idempotency-key.js';
import {
  approveRequest,
  archiveDestination,
  archiveReason,
  cancelRequest,
  createDestination,
  createLot,
  createProduct,
  createReason,
  rejectRequest,
  registerAdjustment,
  registerCount,
  registerIssue,
  registerReceipt,
  registerTransfer,
  setProductMinimum,
  type CommandRequest,
} from '../application/commands.js';
import {
  getContainer,
  getProduct,
  listCountLocations,
  getSummary,
  listDestinations,
  listLots,
  listOperations,
  listPositions,
  listProducts,
  listReasons,
  listReceiptLocations,
  listRequests,
  listTransferLocations,
} from '../application/queries.js';

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
    app.get('/summary', async (request) => getSummary(pool, queryRequest(request)));

    app.get('/products', async (request) =>
      listProducts(pool, queryRequest(request), productListQuery.parse(request.query)),
    );

    app.post('/products', async (request, reply) => {
      const input = createProductRequest.parse(request.body);
      return reply.status(201).send(await createProduct(pool, commandRequest(request), input));
    });

    app.get('/products/:productId', async (request) =>
      getProduct(pool, queryRequest(request), productParams.parse(request.params).productId),
    );

    // Mínimo (ADR 0012, 05-10-2026): lo fija el Administrador.
    app.put('/products/:productId/minimum', async (request) =>
      setProductMinimum(
        pool,
        commandRequest(request),
        productParams.parse(request.params).productId,
        setMinimumRequest.parse(request.body).minimum,
      ),
    );

    app.get('/products/:productId/lots', async (request) =>
      listLots(pool, queryRequest(request), productParams.parse(request.params).productId),
    );

    app.get('/receipt-locations', async (request) => listReceiptLocations(pool, queryRequest(request)));

    app.get('/containers/:containerId', async (request) =>
      getContainer(pool, queryRequest(request), containerParams.parse(request.params).containerId),
    );

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

    app.get('/transfer-locations', async (request) => listTransferLocations(pool, queryRequest(request)));

    app.post('/transfers', async (request, reply) => {
      const input = transferRequest.parse(request.body);
      return reply.status(201).send(await registerTransfer(pool, commandRequest(request), input));
    });

    app.get('/count-locations', async (request) => listCountLocations(pool, queryRequest(request)));

    app.post('/counts', async (request, reply) => {
      const input = countRequest.parse(request.body);
      const result = await registerCount(pool, commandRequest(request), input);
      // Con ajustes hay movimiento nuevo (201); si todo cuadró, solo queda la auditoría (200).
      return reply.status(result.operationId ? 201 : 200).send(result);
    });

    app.post('/adjustments', async (request, reply) => {
      const input = adjustmentRequest.parse(request.body);
      return reply.status(201).send(await registerAdjustment(pool, commandRequest(request), input));
    });

    // Motivos y destinos (ADR 0012): los consulta quien registra; los administra el Administrador.
    app.get('/reasons', async (request) =>
      listReasons(pool, queryRequest(request), reasonListQuery.parse(request.query).kind),
    );

    app.post('/reasons', async (request, reply) => {
      const input = createReasonRequest.parse(request.body);
      return reply.status(201).send(await createReason(pool, commandRequest(request), input));
    });

    app.post('/reasons/:entryId/archive', async (request) =>
      archiveReason(pool, commandRequest(request), entryParams.parse(request.params).entryId),
    );

    app.get('/destinations', async (request) => listDestinations(pool, queryRequest(request)));

    app.post('/destinations', async (request, reply) => {
      const input = createDestinationRequest.parse(request.body);
      return reply.status(201).send(await createDestination(pool, commandRequest(request), input));
    });

    app.post('/destinations/:entryId/archive', async (request) =>
      archiveDestination(pool, commandRequest(request), entryParams.parse(request.params).entryId),
    );

    // Solicitudes de salida (ADR 0012): bandeja de quien aprueba o «mis solicitudes».
    app.get('/issue-requests', async (request) =>
      listRequests(pool, queryRequest(request), issueRequestListQuery.parse(request.query).estado === 'pendientes'),
    );

    // Aprobar crea el movimiento (201); rechazar o cancelar solo deciden la solicitud (200).
    app.post('/issue-requests/:requestId/approve', async (request, reply) =>
      reply
        .status(201)
        .send(await approveRequest(pool, commandRequest(request), issueRequestParams.parse(request.params).requestId)),
    );

    app.post('/issue-requests/:requestId/reject', async (request) =>
      rejectRequest(
        pool,
        commandRequest(request),
        issueRequestParams.parse(request.params).requestId,
        rejectIssueRequest.parse(request.body).reason,
      ),
    );

    app.post('/issue-requests/:requestId/cancel', async (request) =>
      cancelRequest(pool, commandRequest(request), issueRequestParams.parse(request.params).requestId),
    );

    app.get('/operations', async (request) =>
      listOperations(pool, queryRequest(request), operationListQuery.parse(request.query)),
    );
  };
}
