import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  closureListQuery,
  closureParams,
  createClosureRequest,
  createSpaceRequest,
  publishFormRequest,
  spaceParams,
  updateLabsSettingsRequest,
  updateSpaceRequest,
} from '@platlab/contracts';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import { createClosure, listClosures, voidClosure } from '../application/closures.js';
import { getForm, publishForm } from '../application/form.js';
import { getSettings, updateSettings } from '../application/settings.js';
import { archiveSpace, createSpace, listSpaces, updateSpace } from '../application/spaces.js';

/**
 * Rutas de Laboratorios bajo /v1/workspaces/:workspaceId/labs (ADR 0023), con permisos `labs.*`. Las
 * áreas son del Núcleo: Espacios solo les agrega aforo, horario y cierres.
 */
export function labsRoutes({ pool }: { pool: pg.Pool }): FastifyPluginAsync {
  return async (app) => {
    // Anticipación del espacio de trabajo.
    app.get('/settings', async (request) => getSettings(pool, queryRequest(request)));

    app.put('/settings', async (request) => updateSettings(pool, commandRequest(request), updateLabsSettingsRequest.parse(request.body)));

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

    // Formato de solicitud: cada guardado publica una versión nueva.
    app.get('/form', async (request) => getForm(pool, queryRequest(request)));

    app.post('/form', async (request, reply) => {
      const input = publishFormRequest.parse(request.body);
      return reply.status(201).send(await publishForm(pool, commandRequest(request), input));
    });
  };
}
