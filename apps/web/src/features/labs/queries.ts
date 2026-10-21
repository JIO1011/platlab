import { closureList, labsForm, labsSettings, spaceList } from '@platlab/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/api';
import { jitteredPoll, useUserKey, workspaceKey } from '../../app/queries';

const labsKey = (user: string, workspaceId: string) => [...workspaceKey(user, workspaceId), 'labs'] as const;

/** La caché de Laboratorios del espacio: un comando confirmado la refresca entera. */
export function useLabsKey(workspaceId: string) {
  return labsKey(useUserKey(), workspaceId);
}

const base = (workspaceId: string) => `/workspaces/${workspaceId}/labs`;

/** La anticipación del espacio de trabajo; sin ajustes guardados, la de por defecto con la versión 0. */
export function useLabsSettings(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'settings'],
    queryFn: () => api(`${base(workspaceId)}/settings`, { schema: labsSettings }),
  });
}

/** Los espacios, activos y archivados, por sede o edificio y nombre del área. */
export function useSpaces(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'spaces'],
    queryFn: () => api(`${base(workspaceId)}/spaces`, { schema: spaceList }),
    refetchInterval: jitteredPoll,
  });
}

/** Los cierres y feriados que tocan el rango de fechas (AAAA-MM-DD), sin los anulados. */
export function useClosures(workspaceId: string, from: string, to: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'closures', from, to],
    queryFn: () => api(`${base(workspaceId)}/closures?${new URLSearchParams({ from, to })}`, { schema: closureList }),
    refetchInterval: jitteredPoll,
  });
}

/** La versión vigente del Formato; sin ninguna publicada, la versión 0 sin título ni campos. */
export function useLabsForm(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'form'],
    queryFn: () => api(`${base(workspaceId)}/form`, { schema: labsForm }),
  });
}
