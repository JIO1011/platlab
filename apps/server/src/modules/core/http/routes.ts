import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  areaParams,
  assignAreaManagerRequest,
  createLocationRequest,
  departmentParams,
  departmentRequest,
  locationParams,
  renameLocationRequest,
  workspaceParams,
  type HomeResponse,
  type MyWorkspacesResponse,
  type WorkspaceMeResponse,
} from '@platlab/contracts';
import { verifiedSubject } from '../../../platform/http/auth.js';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import { listActiveMembers, listMemberRoles, listMyWorkspaces, withWorkspaceAccess } from '../application/access.js';
import { activeDepartments, archiveDepartment, createDepartment, renameDepartment } from '../application/departments.js';
import { archiveLocation, assignAreaManager, createLocation, renameLocation } from '../application/locations.js';
import {
  areasCommand,
  areasOverview,
  areasQuery,
  occupantsFrom,
  type AreaContributions,
} from '../application/organization.js';
import { describeWorkspace, homeCards, type HomeSummaries } from '../application/workspace-view.js';

/** Rutas de Core bajo /v1; la autenticación la exige el ámbito que las registra. */
export function coreRoutes({
  pool,
  homeSummaries = {},
  areaContributions = {},
}: {
  pool: pg.Pool;
  homeSummaries?: HomeSummaries;
  areaContributions?: AreaContributions;
}): FastifyPluginAsync {
  const occupantsOf = occupantsFrom(areaContributions);
  return async (app) => {
    app.get('/me/workspaces', async (request): Promise<MyWorkspacesResponse> => ({
      workspaces: await listMyWorkspaces(pool, verifiedSubject(request)),
    }));

    app.get('/workspaces/:workspaceId/me', async (request): Promise<WorkspaceMeResponse> => {
      const { workspaceId } = workspaceParams.parse(request.params);
      return withWorkspaceAccess(
        pool,
        { subject: verifiedSubject(request), workspaceId, actionClass: 'read_export' },
        async (access) => ({
          workspace: access.workspace,
          member: { displayName: access.displayName, isOwner: access.isOwner, roles: await listMemberRoles(access) },
          ...(await describeWorkspace(access)),
        }),
      );
    });

    app.get('/workspaces/:workspaceId/home', async (request): Promise<HomeResponse> => {
      const { workspaceId } = workspaceParams.parse(request.params);
      return withWorkspaceAccess(
        pool,
        { subject: verifiedSubject(request), workspaceId, actionClass: 'read_export' },
        async (access) => ({ cards: await homeCards(access, await describeWorkspace(access), homeSummaries) }),
      );
    });

    // Áreas y departamentos (ADR 0024): sin permisos propios, con los del módulo que los declara.
    const workspace = '/workspaces/:workspaceId';

    app.get(`${workspace}/areas`, async (request) =>
      areasQuery(pool, queryRequest(request), (access, modules) => areasOverview(access, modules, areaContributions)),
    );

    app.get(`${workspace}/departments`, async (request) =>
      areasQuery(pool, queryRequest(request), async (access) => ({ items: await activeDepartments(access) })),
    );

    app.post(`${workspace}/locations`, async (request, reply) => {
      const input = createLocationRequest.parse(request.body);
      return reply
        .status(201)
        .send(await areasCommand(pool, commandRequest(request), 'core.location.create', input, (access) => createLocation(access, input)));
    });

    app.patch(`${workspace}/locations/:locationId`, async (request) => {
      const { locationId } = locationParams.parse(request.params);
      const { name } = renameLocationRequest.parse(request.body);
      return areasCommand(pool, commandRequest(request), 'core.location.rename', { locationId, name }, (access) =>
        renameLocation(access, locationId, name),
      );
    });

    app.post(`${workspace}/locations/:locationId/archive`, async (request) => {
      const { locationId } = locationParams.parse(request.params);
      return areasCommand(pool, commandRequest(request), 'core.location.archive', { locationId }, (access) =>
        archiveLocation(access, locationId, occupantsOf),
      );
    });

    app.get(`${workspace}/areas/managers`, async (request) =>
      areasQuery(pool, queryRequest(request), async (access) => ({ items: await listActiveMembers(access) })),
    );

    app.put(`${workspace}/areas/:areaId/manager`, async (request) => {
      const { areaId } = areaParams.parse(request.params);
      const { managerId } = assignAreaManagerRequest.parse(request.body);
      return areasCommand(pool, commandRequest(request), 'core.area.manager', { areaId, managerId }, (access) =>
        assignAreaManager(access, { areaId, managerId }),
      );
    });

    app.post(`${workspace}/departments`, async (request, reply) => {
      const { name } = departmentRequest.parse(request.body);
      return reply
        .status(201)
        .send(await areasCommand(pool, commandRequest(request), 'core.department.create', { name }, (access) => createDepartment(access, name)));
    });

    app.patch(`${workspace}/departments/:departmentId`, async (request) => {
      const { departmentId } = departmentParams.parse(request.params);
      const { name } = departmentRequest.parse(request.body);
      return areasCommand(pool, commandRequest(request), 'core.department.rename', { departmentId, name }, (access) =>
        renameDepartment(access, departmentId, name),
      );
    });

    app.post(`${workspace}/departments/:departmentId/archive`, async (request) => {
      const { departmentId } = departmentParams.parse(request.params);
      return areasCommand(pool, commandRequest(request), 'core.department.archive', { departmentId }, (access) =>
        archiveDepartment(access, departmentId),
      );
    });
  };
}
