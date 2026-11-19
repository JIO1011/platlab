import type { AreasAccess, ModuleAccess } from '@platlab/contracts';
import { actionClass } from '@platlab/contracts';
import { moduleRegistry } from '@platlab/modules';
import { listModuleAccess } from '../infrastructure/access.queries.js';
import { listGrantedPermissions, type WorkspaceAccess } from './access.js';

export interface WorkspaceView {
  modules: ModuleAccess[];
  permissions: string[];
  areas: AreasAccess;
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
          .map(({ path, label, sections }) => ({
            path,
            label,
            sections: sections
              .filter((section) => permissions.includes(section.permission))
              .map((section) => ({ path: section.path, label: section.label })),
          })),
      },
    ];
  });
  return { modules, permissions, areas: areasAccess(modules, permissions) };
}

/**
 * Qué puede hacer el miembro en Áreas (ADR 0024), con la misma regla que la API: consultar si un módulo que las
 * declara admite consulta y le da su permiso de lectura; cambiarlas si uno admite operación nueva y le da el de
 * administrarlas. Sirve para el menú; el servidor vuelve a decidir en cada petición.
 */
function areasAccess(modules: ModuleAccess[], permissions: string[]): AreasAccess {
  const grants = (actionClass: ModuleAccess['access'][number], kind: 'read' | 'manage') =>
    modules.some((module) => {
      const manifest = moduleRegistry.find((entry) => entry.code === module.code);
      const areas = manifest && 'areas' in manifest ? manifest.areas : undefined;
      return areas !== undefined && module.access.includes(actionClass) && permissions.includes(areas[kind]);
    });
  if (grants('new_operation', 'manage')) return 'manage';
  return grants('read_export', 'read') ? 'read' : 'none';
}
