import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  workspaceParams,
  type HomeResponse,
  type MyWorkspacesResponse,
  type WorkspaceMeResponse,
} from '@platlab/contracts';
import { verifiedSubject } from '../../../platform/http/auth.js';
import { listMyWorkspaces, withWorkspaceAccess } from '../application/access.js';
import { describeWorkspace, homeCards, type HomeSummaries } from '../application/workspace-view.js';

/** Rutas de Core bajo /v1; la autenticación la exige el ámbito que las registra. */
export function coreRoutes({
  pool,
  homeSummaries = {},
}: {
  pool: pg.Pool;
  homeSummaries?: HomeSummaries;
}): FastifyPluginAsync {
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
          member: { displayName: access.displayName, isOwner: access.isOwner },
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
  };
}
