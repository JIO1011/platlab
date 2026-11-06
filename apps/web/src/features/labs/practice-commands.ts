import { activity, fault } from '@platlab/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useModuleCommand } from '../../app/commands';
import { useUserKey, workspaceKey } from '../../app/queries';
import { useLabsKey } from './queries';

/**
 * Comandos de la preparación y el cierre de cada bloque (L-01e, ADR 0023): cada uno trae su clave idempotente y la
 * pantalla cambia solo con lo que el servidor confirmó; no hay «deshacer» de lo cerrado.
 */

/** La lista de chequeo: las líneas ya preparadas, con la versión del bloque que se vio. */
export function useSaveChecklist(workspaceId: string, activityId: string) {
  return useModuleCommand(workspaceId, `/labs/activities/${activityId}/checklist`, activity, useLabsKey(workspaceId), 'PUT');
}

/** «Marcar lista» (`ready`) o «Iniciar» (`start`): un paso adelante con la versión del bloque que se vio. */
export function usePracticeStep(workspaceId: string, activityId: string, step: 'ready' | 'start') {
  return useModuleCommand(workspaceId, `/labs/activities/${activityId}/${step}`, activity, useLabsKey(workspaceId));
}

/** «Cerrar práctica»: lo utilizado de cada reactivo apartado y las observaciones. Definitivo. */
export function useClosePractice(workspaceId: string, activityId: string) {
  return useModuleCommand(workspaceId, `/labs/activities/${activityId}/close`, activity, useLabsKey(workspaceId));
}

/** «Reportar incidencia»: el incidente de un equipo apartado, que nace en Equipos con el vínculo a la práctica. */
export function useReportPracticeIncident(workspaceId: string, activityId: string) {
  return useModuleCommand(workspaceId, `/labs/activities/${activityId}/incidents`, fault, useLabsKey(workspaceId));
}

/** Vuelve a pedir lo de Equipos: el incidente nacido de una práctica cambia sus listas y la ficha del equipo. */
export function useRefreshEquipment(workspaceId: string) {
  const queryClient = useQueryClient();
  const user = useUserKey();
  return () => queryClient.invalidateQueries({ queryKey: [...workspaceKey(user, workspaceId), 'equipment'] });
}
