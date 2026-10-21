import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  areaParams,
  ASSET_DOCUMENT_MAX_BYTES,
  ASSET_PHOTO_MAX_BYTES,
  assetDocumentParams,
  assetFilterQuery,
  assetListQuery,
  assetHistoryQuery,
  assetParams,
  assetPhotoTypes,
  assetTypeParams,
  conditionChangeRequest,
  createAssetTypeRequest,
  faultListQuery,
  faultParams,
  newAsset,
  reportableAssetQuery,
  reportFaultRequest,
  resolveFaultRequest,
  transferAssetRequest,
  updateAssetRequest,
  uploadAssetDocumentQuery,
} from '@platlab/contracts';
import { sendXlsx } from '../../../platform/http/download.js';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import { listAreas, listTypesOfArea } from '../application/areas.js';
import { archiveAssetType, createAsset, createAssetType, updateAsset } from '../application/catalog.js';
import {
  getAsset,
  getAssetHistory,
  getAssetTotals,
  getSummary,
  listAssets,
  listLocations,
  listResponsibles,
  listTypes,
} from '../application/queries.js';
import {
  attendFault,
  countFaults,
  getFault,
  getFaultStats,
  getReportableAsset,
  listFaults,
  listReportableAssets,
  reportFault,
  resolveFault,
} from '../application/faults.js';
import { archiveAssetDocument, listAssetDocuments, uploadAssetDocument } from '../application/documents.js';
import { exportAssets } from '../application/export.js';
import { uploadAssetPhoto } from '../application/photo.js';
import { changeCondition, transferAsset } from '../application/status.js';

/**
 * Rutas de Equipos bajo /v1/workspaces/:workspaceId/equipment (ADR 0019), con permisos `equipment.*`.
 */
export function equipmentRoutes({ pool, publicFiles }: { pool: pg.Pool; publicFiles: PublicFiles }): FastifyPluginAsync {
  return async (app) => {
    // La foto del equipo llega como cuerpo binario, con su propio límite (ADR 0019, 02 §12).
    app.addContentTypeParser([...assetPhotoTypes], { parseAs: 'buffer', bodyLimit: ASSET_PHOTO_MAX_BYTES }, (_request, body, done) =>
      done(null, body),
    );
    // Los documentos del equipo, en PDF (E-01e), con el límite general de archivos (02 §12).
    app.addContentTypeParser('application/pdf', { parseAs: 'buffer', bodyLimit: ASSET_DOCUMENT_MAX_BYTES }, (_request, body, done) =>
      done(null, body),
    );

    app.get('/summary', async (request) => getSummary(pool, queryRequest(request)));

    // Tipos de equipo: los consulta quien registra; los administra el Administrador.
    app.get('/asset-types', async (request) => listTypes(pool, queryRequest(request)));

    app.post('/asset-types', async (request, reply) => {
      const input = createAssetTypeRequest.parse(request.body);
      return reply.status(201).send(await createAssetType(pool, commandRequest(request), input));
    });

    app.post('/asset-types/:typeId/archive', async (request) =>
      archiveAssetType(pool, commandRequest(request), assetTypeParams.parse(request.params).typeId),
    );

    app.get('/assets', async (request) => listAssets(pool, queryRequest(request), assetListQuery.parse(request.query)));

    // Indicadores del Informe (E-01c): con los mismos filtros.
    app.get('/assets/totals', async (request) => getAssetTotals(pool, queryRequest(request), assetFilterQuery.parse(request.query)));

    // Excel del Informe (ADR 0017): sale por partes mientras se lee.
    app.get('/assets/export', async (request, reply) => {
      const filters = assetFilterQuery.parse(request.query);
      return sendXlsx(reply, (open) => exportAssets(pool, queryRequest(request), filters, open));
    });

    app.post('/assets', async (request, reply) => {
      const input = newAsset.parse(request.body);
      return reply.status(201).send(await createAsset(pool, commandRequest(request), input));
    });

    app.get('/assets/:assetId', async (request) =>
      getAsset(pool, queryRequest(request), assetParams.parse(request.params).assetId),
    );

    app.patch('/assets/:assetId', async (request) =>
      updateAsset(pool, commandRequest(request), assetParams.parse(request.params).assetId, updateAssetRequest.parse(request.body)),
    );

    // Foto del equipo (ADR 0019): la sube el Administrador y reemplaza a la vigente.
    app.put('/assets/:assetId/photo', async (request) =>
      uploadAssetPhoto(pool, publicFiles, commandRequest(request), assetParams.parse(request.params).assetId, request.body),
    );

    // Documentos del equipo (E-01e): los sube y los quita el Administrador; quitar archiva.
    app.get('/assets/:assetId/documents', async (request) =>
      listAssetDocuments(pool, queryRequest(request), assetParams.parse(request.params).assetId),
    );

    app.post('/assets/:assetId/documents', async (request, reply) => {
      const input = uploadAssetDocumentQuery.parse(request.query);
      const { assetId } = assetParams.parse(request.params);
      return reply.status(201).send(await uploadAssetDocument(pool, publicFiles, commandRequest(request), assetId, input, request.body));
    });

    app.post('/assets/:assetId/documents/:documentId/archive', async (request) => {
      const { assetId, documentId } = assetDocumentParams.parse(request.params);
      return archiveAssetDocument(pool, commandRequest(request), assetId, documentId);
    });

    app.get('/assets/:assetId/history', async (request) =>
      getAssetHistory(
        pool,
        queryRequest(request),
        assetParams.parse(request.params).assetId,
        assetHistoryQuery.parse(request.query).limit,
      ),
    );

    // Condición y traslado dejan su fila de historial (201).
    app.post('/assets/:assetId/condition', async (request, reply) => {
      const input = conditionChangeRequest.parse(request.body);
      const { assetId } = assetParams.parse(request.params);
      return reply.status(201).send(await changeCondition(pool, commandRequest(request), assetId, input));
    });

    app.post('/assets/:assetId/transfers', async (request, reply) => {
      const input = transferAssetRequest.parse(request.body);
      const { assetId } = assetParams.parse(request.params);
      return reply.status(201).send(await transferAsset(pool, commandRequest(request), assetId, input));
    });

    // Incidentes, que son las fallas (ADR 0019): todos reportan; empezar la reparación y solucionar resuelven un pendiente.
    app.get('/faults', async (request) => listFaults(pool, queryRequest(request), faultListQuery.parse(request.query)));

    app.get('/faults/counts', async (request) => countFaults(pool, queryRequest(request)));

    // «Incidentes en 12 meses» del Resumen: lo de todo el espacio, para quien atiende.
    app.get('/faults/stats', async (request) => getFaultStats(pool, queryRequest(request)));

    app.get('/faults/assets', async (request) =>
      listReportableAssets(pool, queryRequest(request), reportableAssetQuery.parse(request.query).q),
    );

    // El equipo del QR de su etiqueta (E-01d): quien solo reporta lo recibe sin ver la ficha.
    app.get('/faults/assets/:assetId', async (request) =>
      getReportableAsset(pool, queryRequest(request), assetParams.parse(request.params).assetId),
    );

    app.post('/faults', async (request, reply) => {
      const input = reportFaultRequest.parse(request.body);
      return reply.status(201).send(await reportFault(pool, commandRequest(request), input));
    });

    app.get('/faults/:faultId', async (request) => getFault(pool, queryRequest(request), faultParams.parse(request.params).faultId));

    app.post('/faults/:faultId/attend', async (request) =>
      attendFault(pool, commandRequest(request), faultParams.parse(request.params).faultId),
    );

    app.post('/faults/:faultId/resolve', async (request) =>
      resolveFault(pool, commandRequest(request), faultParams.parse(request.params).faultId, resolveFaultRequest.parse(request.body)),
    );

    app.get('/responsibles', async (request) => listResponsibles(pool, queryRequest(request)));

    // Inventario por áreas (E-01c): el área es una ubicación de Core; su encargado se asigna en Áreas (ADR 0024).
    app.get('/areas', async (request) => listAreas(pool, queryRequest(request)));

    app.get('/areas/:areaId/types', async (request) =>
      listTypesOfArea(pool, queryRequest(request), areaParams.parse(request.params).areaId),
    );

    // Ubicaciones de Core (ADR 0015): las mismas de Reactivos; se crean en Áreas (ADR 0024).
    app.get('/locations', async (request) => listLocations(pool, queryRequest(request)));
  };
}
