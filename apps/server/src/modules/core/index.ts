/** Interfaz pública de Core: los módulos solo importan desde aquí (02 §3). */
export {
  hasPermission,
  requirePermission,
  withModuleAccess,
  withWorkspaceAccess,
  type WorkspaceAccess,
} from './application/access.js';
export { recordAudit, type AuditEntry } from './application/audit.js';
export {
  activeLocations,
  createAuditedLocation,
  type LocationRecord,
} from './application/locations.js';
export {
  moduleCommand,
  moduleQuery,
  requires,
  type CommandRequest,
  type QueryRequest,
} from './application/module-operations.js';
export type { HomeContribution } from './application/workspace-view.js';
export { coreRoutes } from './http/routes.js';
