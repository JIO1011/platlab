/** Interfaz pública de Core: los módulos solo importan desde aquí (02 §3). */
export {
  hasPermissionAt,
  listEffectivePermissions,
  withWorkspaceAccess,
  type WorkspaceAccess,
} from './application/access.js';
export { coreRoutes } from './http/routes.js';
