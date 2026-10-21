import type pg from 'pg';
import type { AreasOverview } from '@platlab/contracts';
import { moduleRegistry } from '@platlab/modules';
import { withIdempotency } from '../../../platform/idempotency/idempotency.js';
import { listAreaCards, listShelves } from '../infrastructure/locations.queries.js';
import { withAnyModuleAccess, type WorkspaceAccess } from './access.js';
import { activeDepartments } from './departments.js';
import type { CommandRequest, QueryRequest } from './module-operations.js';
import { describeWorkspace } from './workspace-view.js';

/**
 * Áreas y departamentos (ADR 0024): comunes a los módulos, sin permisos propios. Cada módulo que guarda
 * cosas en ellos los declara en su manifiesto (`areas`) con su permiso de consulta y de administración.
 */

/** Lo que un módulo aporta a Áreas: sus cifras y si guarda algo en unas ubicaciones. */
export interface AreaContribution {
  /** Cifra del módulo por área (id de la ubicación) y por departamento; lo que no aparece es cero. */
  counts: (access: WorkspaceAccess) => Promise<{ byArea: Record<string, number>; byDepartment: Record<string, number> }>;
  /** ¿Tiene el módulo algo en alguna de estas ubicaciones, ya bloqueadas? */
  occupies: (access: WorkspaceAccess, locationIds: string[]) => Promise<boolean>;
}

/** Core no importa módulos: la composición le pasa el aporte de cada uno (02 §3). */
export type AreaContributions = Record<string, AreaContribution>;

const declared = moduleRegistry.flatMap((module) => ('areas' in module ? [{ code: module.code, name: module.name, ...module.areas }] : []));
const readGrants = Object.fromEntries(declared.map((module) => [module.code, module.read]));
const manageGrants = Object.fromEntries(declared.map((module) => [module.code, module.manage]));

/** Consulta: la admite algún módulo admitido en consulta cuyo permiso de lectura tiene el miembro. */
export function areasQuery<T>(
  pool: pg.Pool,
  request: QueryRequest,
  work: (access: WorkspaceAccess, modules: string[]) => Promise<T>,
): Promise<T> {
  return withAnyModuleAccess(pool, { ...request, actionClass: 'read_export', grants: readGrants }, work);
}

/**
 * Comando: lo admite algún módulo admitido para operación nueva cuyo permiso de administración tiene el
 * miembro, con su derecho bloqueado. El acceso se comprueba antes de la clave idempotente.
 */
export function areasCommand<T>(
  pool: pg.Pool,
  request: CommandRequest,
  operation: string,
  input: unknown,
  work: (access: WorkspaceAccess) => Promise<T>,
): Promise<T> {
  return withAnyModuleAccess(pool, { ...request, actionClass: 'new_operation', grants: manageGrants }, (access) =>
    withIdempotency(
      access.client,
      {
        workspaceId: access.workspace.id,
        principalId: access.principalId,
        operation,
        key: request.idempotencyKey,
        input,
      },
      () => work(access),
    ),
  );
}

/** Módulos con algo en las ubicaciones, por su nombre: todos, aunque el miembro no los consulte. */
export function occupantsFrom(contributions: AreaContributions) {
  return async (access: WorkspaceAccess, locationIds: string[]): Promise<string[]> => {
    const names: string[] = [];
    for (const module of declared) {
      const contribution = contributions[module.code];
      if (contribution && (await contribution.occupies(access, locationIds))) names.push(module.name.toLowerCase());
    }
    return names;
  };
}

/** GET /areas: áreas por grupo con encargado, estantes y cifras; departamentos con cifras; y si puede cambiarlos. */
export async function areasOverview(
  access: WorkspaceAccess,
  modules: string[],
  contributions: AreaContributions,
): Promise<AreasOverview> {
  const workspaceId = access.workspace.id;
  const [areas, shelves, departments, view] = await Promise.all([
    listAreaCards.run({ workspaceId }, access.client),
    listShelves.run({ workspaceId }, access.client),
    activeDepartments(access),
    describeWorkspace(access),
  ]);
  const counted: Array<[string, Awaited<ReturnType<AreaContribution['counts']>>]> = [];
  for (const code of modules) {
    const contribution = contributions[code];
    if (contribution) counted.push([code, await contribution.counts(access)]);
  }
  const countsOf = (pick: (counts: (typeof counted)[number][1]) => Record<string, number>, id: string) =>
    Object.fromEntries(counted.map(([code, counts]) => [code, pick(counts)[id] ?? 0]));
  return {
    areas: areas.map((area) => ({
      id: area.id,
      code: area.code,
      name: area.name,
      group: area.group_id && area.group_name ? { id: area.group_id, name: area.group_name } : null,
      manager:
        area.manager_principal_id && area.manager_name ? { id: area.manager_principal_id, name: area.manager_name } : null,
      shelves: shelves
        .filter((shelf) => shelf.area_id === area.id)
        .map((shelf) => ({ id: shelf.id, code: shelf.code, name: shelf.name, parentId: shelf.parent_id })),
      counts: countsOf((counts) => counts.byArea, area.id),
    })),
    departments: departments.map((department) => ({
      ...department,
      counts: countsOf((counts) => counts.byDepartment, department.id),
    })),
    canManage: view.modules.some(
      (module) => module.access.includes('new_operation') && view.permissions.includes(manageGrants[module.code] ?? ''),
    ),
  };
}
