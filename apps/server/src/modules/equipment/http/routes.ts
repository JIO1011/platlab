import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  ASSET_PHOTO_MAX_BYTES,
  assetListQuery,
  assetParams,
  assetPhotoTypes,
  assetTypeParams,
  conditionChangeRequest,
  createAssetTypeRequest,
  createLocationRequest,
  faultListQuery,
  faultParams,
  newAsset,
  reportableAssetQuery,
  reportFaultRequest,
  resolveFaultRequest,
  transferAssetRequest,
  updateAssetRequest,
} from '@platlab/contracts';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import {
  archiveAssetType,
  createAsset,
  createAssetType,
  createEquipmentLocation,
  updateAsset,
} from '../application/catalog.js';
import {
  getAsset,
  getAssetHistory,
  getSummary,
  listAssets,
  listLocations,
  listResponsibles,
  listTypes,
} from '../application/queries.js';
import {
  attendFault,
  closeFault,
  getFault,
  listFaults,
  listReportableAssets,
  reportFault,
  resolveFault,
} from '../application/faults.js';
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

    app.get('/assets/:assetId/history', async (request) =>
      getAssetHistory(pool, queryRequest(request), assetParams.parse(request.params).assetId),
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

    // Reportes de fallas (ADR 0019): todos reportan; atender, resolver y cerrar resuelve un pendiente.
    app.get('/faults', async (request) => listFaults(pool, queryRequest(request), faultListQuery.parse(request.query)));

    app.get('/faults/assets', async (request) =>
      listReportableAssets(pool, queryRequest(request), reportableAssetQuery.parse(request.query).q),
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

    app.post('/faults/:faultId/close', async (request) =>
      closeFault(pool, commandRequest(request), faultParams.parse(request.params).faultId),
    );

    app.get('/responsibles', async (request) => listResponsibles(pool, queryRequest(request)));

    // Ubicaciones de Core (ADR 0015): las mismas de Reactivos; se crean con el permiso de catálogo.
    app.get('/locations', async (request) => listLocations(pool, queryRequest(request)));

    app.post('/locations', async (request, reply) => {
      const input = createLocationRequest.parse(request.body);
      return reply.status(201).send(await createEquipmentLocation(pool, commandRequest(request), input));
    });
  };
}
