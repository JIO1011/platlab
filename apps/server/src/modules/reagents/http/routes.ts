import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  adjustmentRequest,
  containerCodeSuggestionQuery,
  containerParams,
  countRequest,
  createReasonRequest,
  entryParams,
  issueRequestListQuery,
  issueRequestParams,
  rejectIssueRequest,
  issueRequest,
  newProduct,
  operationExportQuery,
  operationFacetsQuery,
  operationListQuery,
  operationTotalsQuery,
  positionListQuery,
  productListQuery,
  productParams,
  reasonListQuery,
  receiptRequest,
  SAFETY_SHEET_MAX_BYTES,
  setMinimumRequest,
  setTareRequest,
  transferRequest,
  updateProductRequest,
  weightAdjustmentRequest,
} from '@platlab/contracts';
import { sendXlsx } from '../../../platform/http/download.js';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import { createProduct, setProductMinimum, updateProduct } from '../application/catalog.js';
import { exportOperations } from '../application/export.js';
import { approveRequest, cancelRequest, registerIssue, rejectRequest } from '../application/issues.js';
import { archiveReason, createReason } from '../application/lists.js';
import {
  registerAdjustment,
  registerCount,
  registerReceipt,
  registerTransfer,
  registerWeightAdjustment,
  setContainerTare,
} from '../application/movements.js';
import {
  getContainer,
  getProduct,
  listBrands,
  listCountLocations,
  getSummary,
  listOperationFacets,
  listOperations,
  listOperationTotals,
  listPositions,
  listProducts,
  listReasons,
  listReceiptLocations,
  listRequests,
  listTransferLocations,
  suggestCodes,
} from '../application/queries.js';
import { uploadSafetySheet } from '../application/safety-sheet.js';

/**
 * Rutas de Reactivos bajo /v1/workspaces/:workspaceId/reagents (primer incremento, «Rutas»).
 * Las operaciones de inventario se exponen aquí, con permisos `reagents.*`, nunca bajo /inventory.
 */
export function reagentsRoutes({ pool, publicFiles }: { pool: pg.Pool; publicFiles: PublicFiles }): FastifyPluginAsync {
  return async (app) => {
    // La ficha de seguridad en PDF llega como cuerpo binario, con su propio límite (ADR 0017, 02 §12).
    app.addContentTypeParser('application/pdf', { parseAs: 'buffer', bodyLimit: SAFETY_SHEET_MAX_BYTES }, (_request, body, done) =>
      done(null, body),
    );

    app.get('/summary', async (request) => getSummary(pool, queryRequest(request)));

    app.get('/products', async (request) =>
      listProducts(pool, queryRequest(request), productListQuery.parse(request.query)),
    );

    app.post('/products', async (request, reply) => {
      const input = newProduct.parse(request.body);
      return reply.status(201).send(await createProduct(pool, commandRequest(request), input));
    });

    app.get('/products/:productId', async (request) =>
      getProduct(pool, queryRequest(request), productParams.parse(request.params).productId),
    );

    // Ficha editable (ADR 0015): la edita el Administrador; la unidad, solo sin movimientos.
    app.patch('/products/:productId', async (request) =>
      updateProduct(
        pool,
        commandRequest(request),
        productParams.parse(request.params).productId,
        updateProductRequest.parse(request.body),
      ),
    );

    // Ficha de seguridad en PDF (ADR 0017): la sube el Administrador y reemplaza a la vigente.
    app.put('/products/:productId/safety-sheet', async (request) =>
      uploadSafetySheet(pool, publicFiles, commandRequest(request), productParams.parse(request.params).productId, request.body),
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

    app.get('/receipt-locations', async (request) => listReceiptLocations(pool, queryRequest(request)));

    app.get('/container-codes/suggestion', async (request) =>
      suggestCodes(pool, queryRequest(request), containerCodeSuggestionQuery.parse(request.query)),
    );

    app.get('/brands', async (request) => listBrands(pool, queryRequest(request)));

    app.get('/containers/:containerId', async (request) =>
      getContainer(pool, queryRequest(request), containerParams.parse(request.params).containerId),
    );

    // Tara del frasco (ADR 0015): la fija quien ajusta, con el peso que marca la balanza.
    app.put('/containers/:containerId/tare', async (request) =>
      setContainerTare(
        pool,
        commandRequest(request),
        containerParams.parse(request.params).containerId,
        setTareRequest.parse(request.body),
      ),
    );

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

    app.post('/adjustments/by-weight', async (request, reply) => {
      const input = weightAdjustmentRequest.parse(request.body);
      return reply.status(201).send(await registerWeightAdjustment(pool, commandRequest(request), input));
    });

    // Motivos (ADR 0012): los consulta quien registra; los administra el Administrador. Destinos y áreas
    // pasaron a los departamentos del Núcleo (ADR 0024).
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

    // Movimientos como informe (ADR 0014): conteo por opción de cada filtro y totales (reporte).
    app.get('/operations/facets', async (request) =>
      listOperationFacets(pool, queryRequest(request), operationFacetsQuery.parse(request.query)),
    );

    app.get('/operations/totals', async (request) =>
      listOperationTotals(pool, queryRequest(request), operationTotalsQuery.parse(request.query)),
    );

    // Excel de Movimientos (ADR 0021), como el del Historial de Mantenimiento.
    app.get('/operations/export', async (request, reply) => {
      const query = operationExportQuery.parse(request.query);
      return sendXlsx(reply, (open) => exportOperations(pool, queryRequest(request), query, open));
    });
  };
}
