import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type pg from 'pg';
import {
  agendaQuery,
  areaParams,
  assignAreaManagerRequest,
  calendarQuery,
  changeMemberRoleRequest,
  createLocationRequest,
  departmentParams,
  departmentRequest,
  invitationParams,
  inviteMemberRequest,
  locationParams,
  memberParams,
  renameLocationRequest,
  workspaceParams,
  type HomeAgendaResponse,
  type HomeCalendarResponse,
  type HomeResponse,
  type HomeTasksResponse,
  type MyWorkspacesResponse,
  type WorkspaceMeResponse,
} from '@platlab/contracts';
import { verifiedEmail, verifiedSubject } from '../../../platform/http/auth.js';
import { commandRequest, queryRequest } from '../../../platform/http/module-request.js';
import { listActiveMembers, listMemberRoles, listMyWorkspaces, withWorkspaceAccess, type WorkspaceAccess } from '../application/access.js';
import { activeDepartments, archiveDepartment, createDepartment, renameDepartment } from '../application/departments.js';
import { archiveLocation, assignAreaManager, createLocation, renameLocation } from '../application/locations.js';
import {
  areasCommand,
  areasOverview,
  areasQuery,
  occupantsFrom,
  type AreaContributions,
} from '../application/organization.js';
import { homeAgenda, homeCalendar, homeCards, homeTasks, type HomeModules } from '../application/home.js';
import {
  acceptInvitation,
  changeMemberRole,
  inviteMember,
  listMyInvitations,
  memberDirectory,
  recordPresence,
  revokeInvitation,
  revokeMember,
} from '../application/members.js';
import { describeWorkspace, type WorkspaceView } from '../application/workspace-view.js';

/** Rutas de Core bajo /v1; la autenticación la exige el ámbito que las registra. */
export function coreRoutes({
  pool,
  home = {},
  areaContributions = {},
}: {
  pool: pg.Pool;
  home?: HomeModules;
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
        async (access) => {
          // Abrir el espacio es su último acceso (ADR 0027).
          await recordPresence(access);
          return {
            workspace: access.workspace,
            member: { principalId: access.principalId, displayName: access.displayName, isOwner: access.isOwner, roles: await listMemberRoles(access) },
            ...(await describeWorkspace(access)),
          };
        },
      );
    });

    // Usuarios (ADR 0027): quien fue invitado ve y acepta sus invitaciones por el correo de su sesión.
    app.get('/me/invitations', async (request) => listMyInvitations(pool, verifiedSubject(request), verifiedEmail(request)));

    app.post('/workspaces/:workspaceId/invitations/:invitationId/accept', async (request) => {
      const { workspaceId, invitationId } = invitationParams.parse(request.params);
      return acceptInvitation(pool, { subject: verifiedSubject(request), workspaceId, email: verifiedEmail(request) }, invitationId);
    });

    // Inicio (ADR 0026): cada panel es una consulta aparte, para que cargue y falle por separado.
    const homeQuery = <T>(request: FastifyRequest, read: (access: WorkspaceAccess, view: WorkspaceView) => Promise<T>) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      return withWorkspaceAccess(pool, { subject: verifiedSubject(request), workspaceId, actionClass: 'read_export' }, async (access) =>
        read(access, await describeWorkspace(access)),
      );
    };

    app.get('/workspaces/:workspaceId/home', async (request): Promise<HomeResponse> =>
      homeQuery(request, async (access, view) => ({ cards: await homeCards(access, view, home) })),
    );

    app.get('/workspaces/:workspaceId/home/agenda', async (request): Promise<HomeAgendaResponse> => {
      const { date } = agendaQuery.parse(request.query);
      return homeQuery(request, (access, view) => homeAgenda(access, view, home, date));
    });

    app.get('/workspaces/:workspaceId/home/calendar', async (request): Promise<HomeCalendarResponse> => {
      const { month } = calendarQuery.parse(request.query);
      return homeQuery(request, (access, view) => homeCalendar(access, view, home, month));
    });

    app.get('/workspaces/:workspaceId/home/tasks', async (request): Promise<HomeTasksResponse> =>
      homeQuery(request, async (access, view) => ({ tasks: await homeTasks(access, view, home) })),
    );

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

    // Usuarios (ADR 0027): solo el Propietario.
    app.get(`${workspace}/members`, async (request) => memberDirectory(pool, queryRequest(request)));

    app.post(`${workspace}/members`, async (request, reply) => {
      const input = inviteMemberRequest.parse(request.body);
      return reply.status(201).send(await inviteMember(pool, commandRequest(request), input));
    });

    app.patch(`${workspace}/members/:membershipId`, async (request) => {
      const { membershipId } = memberParams.parse(request.params);
      const { role } = changeMemberRoleRequest.parse(request.body);
      return changeMemberRole(pool, commandRequest(request), membershipId, role);
    });

    app.post(`${workspace}/members/:membershipId/revoke`, async (request) => {
      const { membershipId } = memberParams.parse(request.params);
      return revokeMember(pool, commandRequest(request), membershipId);
    });

    app.post(`${workspace}/invitations/:invitationId/revoke`, async (request) => {
      const { invitationId } = invitationParams.parse(request.params);
      return revokeInvitation(pool, commandRequest(request), invitationId);
    });

    app.post(`${workspace}/departments/:departmentId/archive`, async (request) => {
      const { departmentId } = departmentParams.parse(request.params);
      return areasCommand(pool, commandRequest(request), 'core.department.archive', { departmentId }, (access) =>
        archiveDepartment(access, departmentId),
      );
    });
  };
}
