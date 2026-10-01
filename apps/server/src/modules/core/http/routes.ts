import type { FastifyPluginAsync } from 'fastify';
import type pg from 'pg';
import {
  workspaceParams,
  type MyWorkspacesResponse,
  type WorkspaceMeResponse,
} from '@platlab/contracts';
import { verifiedSubject } from '../../../platform/http/auth.js';
import {
  listEffectivePermissions,
  listMyWorkspaces,
  withWorkspaceAccess,
} from '../application/access.js';

/** Rutas de Core bajo /v1; la autenticación la exige el ámbito que las registra. */
export function coreRoutes({ pool }: { pool: pg.Pool }): FastifyPluginAsync {
  return async (app) => {
    app.get('/me/workspaces', async (request): Promise<MyWorkspacesResponse> => ({
      workspaces: await listMyWorkspaces(pool, verifiedSubject(request)),
    }));

    app.get('/workspaces/:workspaceId/me', async (request): Promise<WorkspaceMeResponse> => {
      const { workspaceId } = workspaceParams.parse(request.params);
      return withWorkspaceAccess(
        pool,
        { subject: verifiedSubject(request), workspaceId },
        async (access) => ({
          workspace: access.workspace,
          member: { displayName: access.displayName, isOwner: access.isOwner },
          permissions: await listEffectivePermissions(access),
        }),
      );
    });
  };
}
