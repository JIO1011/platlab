import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  closureListQuery,
  closureParams,
  createClosureRequest,
  createFormRequest,
  createPeriodRequest,
  activityParams,
  createRequestRequest,
  labCancelRequest as labCancelRequestSchema,
  scheduleActivityRequest,
  scheduleQuery,
  updateActivityRequest,
  createSpaceRequest,
  FORM_LOGO_MAX_BYTES,
  formParams,
  imageTypes,
  periodParams,
  publishFormRequest,
  requestListQuery,
  requestParams,
  requestReasonRequest,
  requestVersionRequest,
  saveRequestRequest,
  spaceParams,
  updateFormRequest,
  updatePeriodRequest,
  updateLabsSettingsRequest,
  updateSpaceRequest,
} from '@platlab/contracts';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import { createClosure, listClosures, voidClosure } from '../application/closures.js';
import { archiveForm, createForm, getForm, listForms, publishForm, updateForm, uploadFormLogo } from '../application/form.js';
import { archivePeriod, createPeriod, listPeriods, updatePeriod } from '../application/periods.js';
import {
  cancelRequest,
  createRequest,
  getRequest,
  getRequestOptions,
  labCancelRequest,
  listRequests,
  rejectRequest,
  requestChanges,
  saveRequest,
  submitRequest,
} from '../application/requests.js';
import { listResponsibles, listSchedule, moveActivity, scheduleActivity } from '../application/schedule.js';
import { getSettings, updateSettings } from '../application/settings.js';
import { archiveSpace, createSpace, listSpaces, updateSpace } from '../application/spaces.js';

/**
 * Rutas de Laboratorios bajo /v1/workspaces/:workspaceId/labs (ADR 0023), con permisos `labs.*`. Las
 * áreas son del Núcleo: Espacios solo les agrega aforo, horario y cierres.
 */
export function labsRoutes({ pool, publicFiles }: { pool: pg.Pool; publicFiles: PublicFiles }): FastifyPluginAsync {
  return async (app) => {
    // El logo del membrete llega como cuerpo binario, con su propio límite.
    app.addContentTypeParser([...imageTypes], { parseAs: 'buffer', bodyLimit: FORM_LOGO_MAX_BYTES }, (_request, body, done) => done(null, body));

    // Solicitudes (L-01b): quien pide las suyas; el Operador y el Administrador, las recibidas.
    app.get('/requests', async (request) => listRequests(pool, queryRequest(request), requestListQuery.parse(request.query)));

    app.get('/request-options', async (request) => getRequestOptions(pool, queryRequest(request)));

    app.post('/requests', async (request, reply) => {
      const input = createRequestRequest.parse(request.body);
      return reply.status(201).send(await createRequest(pool, commandRequest(request), input));
    });

    app.get('/requests/:requestId', async (request) => getRequest(pool, queryRequest(request), requestParams.parse(request.params).requestId));

    app.put('/requests/:requestId', async (request) =>
      saveRequest(pool, commandRequest(request), requestParams.parse(request.params).requestId, saveRequestRequest.parse(request.body)),
    );

    app.post('/requests/:requestId/submit', async (request) =>
      submitRequest(pool, commandRequest(request), requestParams.parse(request.params).requestId, requestVersionRequest.parse(request.body)),
    );

    app.post('/requests/:requestId/cancel', async (request) =>
      cancelRequest(pool, commandRequest(request), requestParams.parse(request.params).requestId, requestVersionRequest.parse(request.body)),
    );

    app.post('/requests/:requestId/request-changes', async (request) =>
      requestChanges(pool, commandRequest(request), requestParams.parse(request.params).requestId, requestReasonRequest.parse(request.body)),
    );

    app.post('/requests/:requestId/reject', async (request) =>
      rejectRequest(pool, commandRequest(request), requestParams.parse(request.params).requestId, requestReasonRequest.parse(request.body)),
    );

    app.post('/requests/:requestId/lab-cancel', async (request) =>
      labCancelRequest(pool, commandRequest(request), requestParams.parse(request.params).requestId, labCancelRequestSchema.parse(request.body)),
    );

    // Cronograma (L-01c): todos los que consultan ven la tabla; el Administrador programa y mueve.
    app.get('/schedule', async (request) => listSchedule(pool, queryRequest(request), scheduleQuery.parse(request.query)));

    app.get('/schedule/responsibles', async (request) => listResponsibles(pool, queryRequest(request)));

    app.post('/activities', async (request, reply) => {
      const input = scheduleActivityRequest.parse(request.body);
      return reply.status(201).send(await scheduleActivity(pool, commandRequest(request), input));
    });

    app.patch('/activities/:activityId', async (request) =>
      moveActivity(pool, commandRequest(request), activityParams.parse(request.params).activityId, updateActivityRequest.parse(request.body)),
    );

    // Anticipación del espacio de trabajo.
    app.get('/settings', async (request) => getSettings(pool, queryRequest(request)));

    app.put('/settings', async (request) => updateSettings(pool, commandRequest(request), updateLabsSettingsRequest.parse(request.body)));

    // Períodos: identifican la actividad en su código; fuera de ellos no se agenda.
    app.get('/periods', async (request) => listPeriods(pool, queryRequest(request)));

    app.post('/periods', async (request, reply) => {
      const input = createPeriodRequest.parse(request.body);
      return reply.status(201).send(await createPeriod(pool, commandRequest(request), input));
    });

    app.patch('/periods/:periodId', async (request) =>
      updatePeriod(pool, commandRequest(request), periodParams.parse(request.params).periodId, updatePeriodRequest.parse(request.body)),
    );

    app.post('/periods/:periodId/archive', async (request) =>
      archivePeriod(pool, commandRequest(request), periodParams.parse(request.params).periodId),
    );

    // Espacios: los consulta quien agenda; los administra el Administrador.
    app.get('/spaces', async (request) => listSpaces(pool, queryRequest(request)));

    app.post('/spaces', async (request, reply) => {
      const input = createSpaceRequest.parse(request.body);
      return reply.status(201).send(await createSpace(pool, commandRequest(request), input));
    });

    app.patch('/spaces/:areaId', async (request) =>
      updateSpace(pool, commandRequest(request), spaceParams.parse(request.params).areaId, updateSpaceRequest.parse(request.body)),
    );

    app.post('/spaces/:areaId/archive', async (request) =>
      archiveSpace(pool, commandRequest(request), spaceParams.parse(request.params).areaId),
    );

    // Cierres y feriados comunes.
    app.get('/closures', async (request) => listClosures(pool, queryRequest(request), closureListQuery.parse(request.query)));

    app.post('/closures', async (request, reply) => {
      const input = createClosureRequest.parse(request.body);
      return reply.status(201).send(await createClosure(pool, commandRequest(request), input));
    });

    app.post('/closures/:closureId/void', async (request) =>
      voidClosure(pool, commandRequest(request), closureParams.parse(request.params).closureId),
    );

    // Formatos de solicitud: los activos los ve quien llena; cada guardado publica una revisión nueva.
    app.get('/forms', async (request) => listForms(pool, queryRequest(request)));

    app.post('/forms', async (request, reply) => {
      const input = createFormRequest.parse(request.body);
      return reply.status(201).send(await createForm(pool, commandRequest(request), input));
    });

    app.get('/forms/:formId', async (request) => getForm(pool, queryRequest(request), formParams.parse(request.params).formId));

    app.patch('/forms/:formId', async (request) =>
      updateForm(pool, commandRequest(request), formParams.parse(request.params).formId, updateFormRequest.parse(request.body)),
    );

    app.post('/forms/:formId/archive', async (request) =>
      archiveForm(pool, commandRequest(request), formParams.parse(request.params).formId),
    );

    // Logo del membrete: se sube aparte y entra en la hoja al publicar.
    app.put('/forms/:formId/logo', async (request) =>
      uploadFormLogo(pool, publicFiles, commandRequest(request), formParams.parse(request.params).formId, request.body),
    );

    app.post('/forms/:formId/revisions', async (request, reply) => {
      const { formId } = formParams.parse(request.params);
      const input = publishFormRequest.parse(request.body);
      return reply.status(201).send(await publishForm(pool, publicFiles, commandRequest(request), formId, input));
    });
  };
}
