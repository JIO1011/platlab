/** Interfaz pública de Core: los módulos solo importan desde aquí (02 §3). */
export {
  hasPermission,
  listActiveMembers,
  requirePermission,
  withModuleAccess,
  withWorkspaceAccess,
  type WorkspaceAccess,
} from './application/access.js';
export { recordAudit, type AuditEntry } from './application/audit.js';
export { activeDepartments, requireActiveDepartment } from './application/departments.js';
export { activeLocations, type ActiveLocation } from './application/locations.js';
export type { AreaContribution } from './application/organization.js';
export {
  moduleCommand,
  moduleQuery,
  requires,
  type CommandRequest,
  type QueryRequest,
} from './application/module-operations.js';
export type { HomeContribution } from './application/workspace-view.js';
export { coreRoutes } from './http/routes.js';
