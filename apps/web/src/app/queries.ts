import { areasOverview, departmentList, homeResponse, myWorkspacesResponse, workspaceMeResponse } from '@platlab/contracts';
import { useQuery, type Query } from '@tanstack/react-query';
import { api } from './api';
import { useSession } from './session';

/**
 * Claves con identidad y espacio: nada se reutiliza entre usuarios ni entre espacios (02 §8).
 * El tablero operativo se refresca cada 30 s solo con la pestaña visible, con variación (02 §12).
 */
const POLL_MS = 30_000;
export const jitteredPoll = () => POLL_MS + Math.floor(Math.random() * 5_000);

export function useUserKey(): string {
  return useSession().session?.user.id ?? 'anónimo';
}

export const workspaceKey = (user: string, workspaceId: string) => ['user', user, 'ws', workspaceId] as const;

export function useMyWorkspaces() {
  const user = useUserKey();
  return useQuery({
    queryKey: ['user', user, 'workspaces'],
    queryFn: () => api('/me/workspaces', { schema: myWorkspacesResponse }),
  });
}

export function useWorkspaceMe(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...workspaceKey(user, workspaceId), 'me'],
    queryFn: () => api(`/workspaces/${workspaceId}/me`, { schema: workspaceMeResponse }),
  });
}

export function useHome(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...workspaceKey(user, workspaceId), 'home'],
    queryFn: () => api(`/workspaces/${workspaceId}/home`, { schema: homeResponse }),
  });
}

/** Departamentos activos del espacio (ADR 0024), para elegir en los formularios; se administran en Áreas. */
export function useDepartments(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...workspaceKey(user, workspaceId), 'departments'],
    queryFn: () => api(`/workspaces/${workspaceId}/departments`, { schema: departmentList }),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Áreas y departamentos con sus cifras por módulo (ADR 0024): la sección Áreas, y el nombre de la ficha de
 * filtro que Reactivos muestra al llegar desde ella.
 */
export function useAreasOverview(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...workspaceKey(user, workspaceId), 'areas-overview'],
    queryFn: () => api(`/workspaces/${workspaceId}/areas`, { schema: areasOverview }),
    enabled,
    refetchInterval: jitteredPoll,
  });
}

/**
 * `placeholderData` de una consulta con filtros: mientras llega la nueva se conserva la anterior, solo
 * si es de la misma persona y el mismo espacio (claves de `workspaceKey`).
 */
export function keepWithinWorkspace<T>(user: string, workspaceId: string) {
  return (previous: T | undefined, previousQuery: Query<T, Error, T, readonly unknown[]> | undefined) =>
    previousQuery?.queryKey[1] === user && previousQuery.queryKey[3] === workspaceId ? previous : undefined;
}
