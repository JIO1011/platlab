import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  ASSET_DOCUMENT_MAX_BYTES,
  createExclusionRequest,
  createPlanRequest,
  createProviderRequest,
  createRecordRequest,
  exclusionParams,
  maintenanceAssetParams,
  maintenanceAssetQuery,
  nextDueQuery,
  planParams,
  providerParams,
  recordListQuery,
  recordParams,
  updatePlanRequest,
  updateProviderRequest,
} from '@platlab/contracts';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import { addExclusion, archiveExclusion, archivePlan, createPlan, listPlanAssets, listPlans, updatePlan } from '../application/plans.js';
import { archiveProvider, createProvider, listProviders, updateProvider } from '../application/providers.js';
import { getAssetMaintenance, getSummary, listDue, listNextDue, searchAssets } from '../application/queries.js';
import { createRecord, listRecords, uploadRecordCertificate } from '../application/records.js';

/**
 * Rutas de Mantenimiento bajo /v1/workspaces/:workspaceId/maintenance (ADR 0020), con permisos
 * `maintenance.*`. Los equipos se leen por la vista de Equipos; el estado físico lo aplica Equipos.
 */
export function maintenanceRoutes({ pool, publicFiles }: { pool: pg.Pool; publicFiles: PublicFiles }): FastifyPluginAsync {
  return async (app) => {
    // El certificado del registro, en PDF, con el límite general de archivos (02 §12).
    app.addContentTypeParser('application/pdf', { parseAs: 'buffer', bodyLimit: ASSET_DOCUMENT_MAX_BYTES }, (_request, body, done) =>
      done(null, body),
    );

    app.get('/summary', async (request) => getSummary(pool, queryRequest(request)));

    // «Por hacer»: se calcula desde los planes al consultar.
    app.get('/due', async (request) => listDue(pool, queryRequest(request)));

    // Proveedores: los consulta quien registra; los administra el Administrador.
    app.get('/providers', async (request) => listProviders(pool, queryRequest(request)));

    app.post('/providers', async (request, reply) => {
      const input = createProviderRequest.parse(request.body);
      return reply.status(201).send(await createProvider(pool, commandRequest(request), input));
    });

    app.patch('/providers/:providerId', async (request) =>
      updateProvider(pool, commandRequest(request), providerParams.parse(request.params).providerId, updateProviderRequest.parse(request.body)),
    );

    app.post('/providers/:providerId/archive', async (request) =>
      archiveProvider(pool, commandRequest(request), providerParams.parse(request.params).providerId),
    );

    // Planes y su cobertura: los consulta quien registra; los administra el Administrador.
    app.get('/plans', async (request) => listPlans(pool, queryRequest(request)));

    app.post('/plans', async (request, reply) => {
      const input = createPlanRequest.parse(request.body);
      return reply.status(201).send(await createPlan(pool, commandRequest(request), input));
    });

    app.patch('/plans/:planId', async (request) =>
      updatePlan(pool, commandRequest(request), planParams.parse(request.params).planId, updatePlanRequest.parse(request.body)),
    );

    app.post('/plans/:planId/archive', async (request) => archivePlan(pool, commandRequest(request), planParams.parse(request.params).planId));

    // Los equipos del plan con «Incluido» (ADR 0020): los consulta quien ve los planes.
    app.get('/plans/:planId/assets', async (request) => listPlanAssets(pool, queryRequest(request), planParams.parse(request.params).planId));

    app.post('/plans/:planId/exclusions', async (request, reply) => {
      const input = createExclusionRequest.parse(request.body);
      const { planId } = planParams.parse(request.params);
      return reply.status(201).send(await addExclusion(pool, commandRequest(request), planId, input));
    });

    app.post('/plans/:planId/exclusions/:assetId/archive', async (request) => {
      const { planId, assetId } = exclusionParams.parse(request.params);
      return archiveExclusion(pool, commandRequest(request), planId, assetId);
    });

    // Registros: inmutables; el certificado se adjunta una vez.
    app.get('/records', async (request) => listRecords(pool, queryRequest(request), recordListQuery.parse(request.query)));

    app.post('/records', async (request, reply) => {
      const input = createRecordRequest.parse(request.body);
      return reply.status(201).send(await createRecord(pool, commandRequest(request), input));
    });

    app.post('/records/:recordId/certificate', async (request, reply) => {
      const { recordId } = recordParams.parse(request.params);
      return reply.status(201).send(await uploadRecordCertificate(pool, publicFiles, commandRequest(request), recordId, request.body));
    });

    // Equipos, por la vista de Equipos: búsqueda para registrar, la pestaña de la ficha y la columna del Inventario.
    app.get('/assets', async (request) => searchAssets(pool, queryRequest(request), maintenanceAssetQuery.parse(request.query)));

    app.get('/assets/:assetId', async (request) =>
      getAssetMaintenance(pool, queryRequest(request), maintenanceAssetParams.parse(request.params).assetId),
    );

    app.get('/next-due', async (request) => listNextDue(pool, queryRequest(request), nextDueQuery.parse(request.query).assetIds));
  };
}
