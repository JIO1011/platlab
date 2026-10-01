import type { HomeResponse, ModuleAccess } from '@platlab/contracts';
import { actionClass } from '@platlab/contracts';
import { moduleRegistry } from '@platlab/modules';
import { listModuleAccess } from '../infrastructure/access.queries.js';
import { listGrantedPermissions, type WorkspaceAccess } from './access.js';

export interface WorkspaceView {
  modules: ModuleAccess[];
  permissions: string[];
}

/**
 * Módulos visibles y permisos efectivos para componer menú, rutas e Inicio (02 §8).
 * Un módulo es visible si la admisión le concede alguna clase de acción; sus permisos solo
 * aparecen entonces. Un espacio sin el módulo no lo ve aunque el rol tenga sus permisos.
 */
export async function describeWorkspace(access: WorkspaceAccess): Promise<WorkspaceView> {
  const [rows, granted] = await Promise.all([
    listModuleAccess.run({ workspaceId: access.workspace.id }, access.client),
    listGrantedPermissions(access),
  ]);
  const visible = rows.filter((row) => row.access.length > 0);
  const visibleCodes = new Set(visible.map((row) => row.code));
  const permissions = granted.filter((code) => visibleCodes.has(code.split('.')[0] ?? ''));

  const modules = visible.flatMap((row): ModuleAccess[] => {
    const manifest = moduleRegistry.find((module) => module.code === row.code);
    if (!manifest) return [];
    return [
      {
        code: row.code,
        name: row.name,
        access: row.access.map((value) => actionClass.parse(value)),
        nav: manifest.nav
          .filter((entry) => permissions.includes(entry.permission))
          .map(({ path, label }) => ({ path, label })),
      },
    ];
  });
  return { modules, permissions };
}

/** Tarjetas de Inicio: módulos que se pueden consultar y cuyo permiso de tarjeta tiene el miembro. */
export function homeCards(view: WorkspaceView): HomeResponse['cards'] {
  return view.modules.flatMap((module) => {
    const manifest = moduleRegistry.find((entry) => entry.code === module.code);
    const permission = manifest && 'homeCard' in manifest ? manifest.homeCard.permission : undefined;
    if (!permission || !module.access.includes('read_export') || !view.permissions.includes(permission)) {
      return [];
    }
    return [{ moduleCode: module.code, name: module.name }];
  });
}
