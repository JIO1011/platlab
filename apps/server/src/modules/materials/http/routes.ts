import type pg from 'pg';
import type { FastifyPluginAsync } from 'fastify';
import {
  lendRequest,
  loanListQuery,
  loanParams,
  materialAdjustmentRequest,
  materialIssueRequest,
  materialListQuery,
  materialParams,
  materialReceiptRequest,
  materialStockQuery,
  newMaterial,
  returnRequest,
  setMaterialMinimumRequest,
  updateMaterialRequest,
} from '@platlab/contracts';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import { getLoan, listBorrowers, listLoanPage } from '../application/loan-views.js';
import { lendMaterial, returnMaterial } from '../application/loans.js';
import { createMaterial, setMaterialMinimum, updateMaterial } from '../application/catalog.js';
import { getProduct, getSummary, listAreas, listProducts, listReceiptLocations, listStock } from '../application/queries.js';
import { registerAdjustment, registerIssue, registerReceipt } from '../application/stock.js';

/**
 * Rutas de Materiales bajo /v1/workspaces/:workspaceId/materials (ADR 0025). Las operaciones de inventario
 * se exponen aquí, con permisos `materials.*`, nunca bajo /inventory.
 */
export function materialsRoutes({ pool }: { pool: pg.Pool }): FastifyPluginAsync {
  return async (app) => {
    app.get('/summary', async (request) => getSummary(pool, queryRequest(request)));

    app.get('/areas', async (request) => listAreas(pool, queryRequest(request)));

    app.get('/receipt-locations', async (request) => listReceiptLocations(pool, queryRequest(request)));

    app.get('/products', async (request) => listProducts(pool, queryRequest(request), materialListQuery.parse(request.query)));

    app.post('/products', async (request, reply) =>
      reply.status(201).send(await createMaterial(pool, commandRequest(request), newMaterial.parse(request.body))),
    );

    app.get('/products/:productId', async (request) =>
      getProduct(pool, queryRequest(request), materialParams.parse(request.params).productId),
    );

    app.patch('/products/:productId', async (request) =>
      updateMaterial(pool, commandRequest(request), materialParams.parse(request.params).productId, updateMaterialRequest.parse(request.body)),
    );

    app.put('/products/:productId/minimum', async (request) =>
      setMaterialMinimum(
        pool,
        commandRequest(request),
        materialParams.parse(request.params).productId,
        setMaterialMinimumRequest.parse(request.body).minimum,
      ),
    );

    app.get('/stock', async (request) => listStock(pool, queryRequest(request), materialStockQuery.parse(request.query)));

    app.post('/receipts', async (request, reply) =>
      reply.status(201).send(await registerReceipt(pool, commandRequest(request), materialReceiptRequest.parse(request.body))),
    );

    app.post('/issues', async (request, reply) =>
      reply.status(201).send(await registerIssue(pool, commandRequest(request), materialIssueRequest.parse(request.body))),
    );

    // Préstamos (ADR 0025): el vale, sus devoluciones parciales y a quién se puede prestar.
    app.get('/borrowers', async (request) => listBorrowers(pool, queryRequest(request)));

    app.get('/loans', async (request) => listLoanPage(pool, queryRequest(request), loanListQuery.parse(request.query)));

    app.post('/loans', async (request, reply) =>
      reply.status(201).send(await lendMaterial(pool, commandRequest(request), lendRequest.parse(request.body))),
    );

    app.get('/loans/:loanId', async (request) => getLoan(pool, queryRequest(request), loanParams.parse(request.params).loanId));

    app.post('/loans/:loanId/returns', async (request) =>
      returnMaterial(pool, commandRequest(request), loanParams.parse(request.params).loanId, returnRequest.parse(request.body)),
    );

    app.post('/adjustments', async (request, reply) =>
      reply.status(201).send(await registerAdjustment(pool, commandRequest(request), materialAdjustmentRequest.parse(request.body))),
    );
  };
}
