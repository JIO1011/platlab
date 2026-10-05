import { z } from 'zod';
import { decimalString } from './decimal.js';

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
    displayName: z.string(),
    isOwner: z.boolean(),
    /** Nombres de sus roles vigentes, solo para mostrarlos; el servidor autoriza por permisos. */
    roles: z.array(z.string()),
  }),
  modules: z.array(moduleAccess),
  permissions: z.array(z.string()),
});

/**
 * GET /v1/workspaces/:workspaceId/home: tarjetas de los módulos visibles. Cada módulo aporta
 * contadores accionables con claves propias (01 §7); null si el módulo todavía no tiene resumen.
 */
/** Movimiento reciente que un módulo muestra en Inicio, ya filtrado por el ámbito del miembro. */
export const homeActivity = z.object({
  id: z.uuid(),
  /** Tipo propio del módulo (en Reactivos: receipt, issue o adjustment). */
  type: z.string(),
  title: z.string(),
  detail: z.string(),
  quantity: decimalString,
  unit: z.string(),
  occurredAt: z.iso.datetime({ offset: true }),
  actor: z.string().nullable(),
});

/**
 * Gráfico de una tarjeta (ADR 0011): sucesos por día con ceros incluidos, nunca cantidades de
 * unidades distintas. null si el módulo no tiene una serie que mostrar.
 */
export const homeTrend = z.object({
  label: z.string(),
  points: z
    .array(z.object({ date: z.iso.date(), value: z.number().int().nonnegative() }))
    .max(90),
});

export const homeResponse = z.object({
  cards: z.array(
    z.object({
      moduleCode: z.string(),
      name: z.string(),
      summary: z.record(z.string(), z.number().int().nonnegative()).nullable(),
      activity: z.array(homeActivity).max(10),
      trend: homeTrend.nullable(),
    }),
  ),
});

export type ActionClass = z.infer<typeof actionClass>;
export type WorkspaceSummary = z.infer<typeof workspaceSummary>;
export type MyWorkspacesResponse = z.infer<typeof myWorkspacesResponse>;
export type ModuleAccess = z.infer<typeof moduleAccess>;
export type WorkspaceMeResponse = z.infer<typeof workspaceMeResponse>;
export type HomeResponse = z.infer<typeof homeResponse>;
export type HomeActivity = z.infer<typeof homeActivity>;
export type HomeTrend = z.infer<typeof homeTrend>;
