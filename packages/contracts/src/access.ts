import { z } from 'zod';

/** Estados en los que un miembro todavía ve el espacio (eje espacio de la admisión, 02 §6). */
export const visibleWorkspaceStatus = z.enum(['trial', 'active', 'suspended', 'closing']);

/** Clases de acción de la admisión: operación nueva, resolver pendientes, consultar y exportar. */
export const actionClass = z.enum(['new_operation', 'resolve_pending', 'read_export']);

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

/** Módulo visible para el miembro: lo que admite ahora y sus entradas de menú permitidas. */
export const moduleAccess = z.object({
  code: z.string(),
  name: z.string(),
  access: z.array(actionClass),
  nav: z.array(z.object({ path: z.string(), label: z.string() })),
});

/**
 * GET /v1/workspaces/:workspaceId/me: módulos habilitados y permisos efectivos (02 §8).
 * Un permiso aparece si el miembro lo tiene en algún ámbito y su módulo es visible; el servidor
 * vuelve a comprobar admisión, permiso y ámbito en cada operación.
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
  modules: z.array(moduleAccess),
  permissions: z.array(z.string()),
});

/** GET /v1/workspaces/:workspaceId/home: tarjetas de los módulos visibles; R-00 añade su resumen. */
export const homeResponse = z.object({
  cards: z.array(z.object({ moduleCode: z.string(), name: z.string() })),
});

export type ActionClass = z.infer<typeof actionClass>;
export type WorkspaceSummary = z.infer<typeof workspaceSummary>;
export type MyWorkspacesResponse = z.infer<typeof myWorkspacesResponse>;
export type ModuleAccess = z.infer<typeof moduleAccess>;
export type WorkspaceMeResponse = z.infer<typeof workspaceMeResponse>;
export type HomeResponse = z.infer<typeof homeResponse>;
