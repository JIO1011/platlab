import { areaManager, department, location } from '@platlab/contracts';
import { z } from 'zod';
import { commonErrorMessage, useModuleCommand } from '../../app/commands';
import { isApiError } from '../../app/api';
import { useUserKey, workspaceKey } from '../../app/queries';

/**
 * Comandos de Áreas y Departamentos del Núcleo (ADR 0024): cada hoja abre el suyo, con su clave idempotente, y la
 * pantalla cambia solo con lo que el servidor confirmó. Renombrar o archivar cambia nombres en los módulos y en las
 * listas de los formularios (`areas-overview`, `departments`…), así que se refresca todo lo del espacio.
 */
function useAreasCommand<S extends z.ZodType>(workspaceId: string, path: string, schema: S, method: 'POST' | 'PUT' | 'PATCH' = 'POST') {
  return useModuleCommand(workspaceId, path, schema, workspaceKey(useUserKey(), workspaceId), method);
}

/** Lo que se renombra o se archiva desde Áreas: un área, un estante o un departamento. */
export interface AreaTarget {
  kind: 'area' | 'shelf' | 'department';
  id: string;
  name: string;
}

const routeOf = (target: AreaTarget) => `${target.kind === 'department' ? '/departments' : '/locations'}/${target.id}`;

const renamed = z.object({ id: z.uuid(), name: z.string() });

/** «+ Nueva área» y «+ Estante»: una ubicación bajo la sede, el edificio o el área (`parentId`), o en la raíz. */
export const useCreateLocation = (workspaceId: string) => useAreasCommand(workspaceId, '/locations', location);

export const useCreateDepartment = (workspaceId: string) => useAreasCommand(workspaceId, '/departments', department);

/** Renombrar: solo el nombre; repetido bajo el mismo padre responde NAME_TAKEN. */
export const useRename = (workspaceId: string, target: AreaTarget) => useAreasCommand(workspaceId, routeOf(target), renamed, 'PATCH');

/** Archivar un área o un estante con su descendencia, o un departamento. Con algo dentro, el servidor lo rechaza y lo explica. */
export const useArchive = (workspaceId: string, target: AreaTarget) =>
  useAreasCommand(workspaceId, `${routeOf(target)}/archive`, z.unknown());

/** Asigna el encargado del área o lo quita con `managerId: null`. */
export const useAssignManager = (workspaceId: string, areaId: string) =>
  useAreasCommand(workspaceId, `/areas/${areaId}/manager`, areaManager, 'PUT');

/** Mensaje para la persona según el código estable del error (02 §7). Un nombre repetido lo trata el campo. */
export function areasErrorMessage(error: unknown): string {
  if (isApiError(error, 'ACCESS_DENIED')) return 'No tienes permiso para esta acción.';
  if (isApiError(error, 'NOT_FOUND')) return 'Ya no existe: actualiza la página para ver el estado actual.';
  if (isApiError(error, 'MODULE_READ_ONLY', 'MODULE_UNAVAILABLE', 'WORKSPACE_RESTRICTED')) {
    return 'El espacio no admite cambios en este momento. Puedes consultar las áreas.';
  }
  if (isApiError(error, 'TRANSIENT_CONFLICT')) return 'Otra persona está cambiando lo mismo. Vuelve a intentarlo: no se duplicará.';
  return commonErrorMessage(error);
}
