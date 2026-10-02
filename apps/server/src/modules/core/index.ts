/** Interfaz pública de Core: los módulos solo importan desde aquí (02 §3). */
export {
  hasPermissionAt,
  permissionScope,
  requirePermission,
  requirePermissionAt,
  requireWorkspacePermission,
  withModuleAccess,
  withWorkspaceAccess,
  type WorkspaceAccess,
} from './application/access.js';
export { recordAudit, type AuditEntry } from './application/audit.js';
export type { HomeContribution } from './application/workspace-view.js';
export { coreRoutes } from './http/routes.js';
