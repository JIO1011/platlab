import { z } from 'zod';

/** Estados en los que un miembro todavía ve el espacio; la admisión completa llega en T-04 (02 §6). */
export const visibleWorkspaceStatus = z.enum(['trial', 'active', 'suspended', 'closing']);

export const workspaceParams = z.object({
  workspaceId: z.uuid(),
});

export const workspaceSummary = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: visibleWorkspaceStatus,
  isOwner: z.boolean(),
});

/** GET /v1/me/workspaces: solo los espacios accesibles para la identidad actual. */
export const myWorkspacesResponse = z.object({
  workspaces: z.array(workspaceSummary),
});

/**
 * GET /v1/workspaces/:workspaceId/me: identidad en el espacio y permisos efectivos.
 * Un permiso aparece si el miembro lo tiene en algún ámbito; el servidor vuelve a comprobar
 * el ámbito concreto en cada operación. Los módulos habilitados se añaden en T-04.
 */
export const workspaceMeResponse = z.object({
  workspace: z.object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    status: visibleWorkspaceStatus,
    timeZone: z.string(),
  }),
  member: z.object({
    displayName: z.string(),
    isOwner: z.boolean(),
  }),
  permissions: z.array(z.string()),
});

export type WorkspaceSummary = z.infer<typeof workspaceSummary>;
export type MyWorkspacesResponse = z.infer<typeof myWorkspacesResponse>;
export type WorkspaceMeResponse = z.infer<typeof workspaceMeResponse>;
