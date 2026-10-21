import { memberList } from '@platlab/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/api';
import { useUserKey, workspaceKey } from '../../app/queries';

/** Miembros activos que pueden ser encargados de un área (ADR 0024); se piden al abrir la hoja del encargado. */
export function useAreaManagers(workspaceId: string, enabled: boolean) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...workspaceKey(user, workspaceId), 'area-managers'],
    queryFn: () => api(`/workspaces/${workspaceId}/areas/managers`, { schema: memberList }),
    enabled,
  });
}
