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
  /** Nombre visible de la institución (no el jurídico); null si no está fijado. */
  institution: z.string().nullable(),
});

/** GET /v1/me/workspaces: solo los espacios accesibles para la identidad actual. */
export const myWorkspacesResponse = z.object({
  workspaces: z.array(workspaceSummary),
});

/** Módulo visible para el miembro: lo que admite ahora y sus entradas de menú permitidas. */
export const areasAccess = z.enum(['none', 'read', 'manage']);

export type AreasAccess = z.infer<typeof areasAccess>;

export const moduleAccess = z.object({
  code: z.string(),
  name: z.string(),
  access: z.array(actionClass),
  /** La app del módulo (ADR 0011): su entrada y las secciones que el miembro puede usar. */
  nav: z.array(
    z.object({
      path: z.string(),
      label: z.string(),
      sections: z.array(z.object({ path: z.string(), label: z.string() })),
    }),
  ),
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
    /** El principal del miembro en este espacio: para reconocerse en listas (p. ej., como responsable de un bloque). */
    principalId: z.uuid(),
    displayName: z.string(),
    isOwner: z.boolean(),
    /** Nombres de sus roles vigentes, solo para mostrarlos; el servidor autoriza por permisos. */
    roles: z.array(z.string()),
  }),
  modules: z.array(moduleAccess),
  permissions: z.array(z.string()),
  /** La sección Áreas (ADR 0024): `none` la oculta, `read` la muestra y `manage` además permite cambiarla. */
  areas: areasAccess,
});

export type ActionClass = z.infer<typeof actionClass>;
export type WorkspaceSummary = z.infer<typeof workspaceSummary>;
export type MyWorkspacesResponse = z.infer<typeof myWorkspacesResponse>;
export type ModuleAccess = z.infer<typeof moduleAccess>;
export type WorkspaceMeResponse = z.infer<typeof workspaceMeResponse>;
