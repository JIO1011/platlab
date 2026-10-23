import { closureList, formList, labsForm, labsRequest, labsSettings, periodList, requestList, requestOptions, spaceList } from '@platlab/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../app/api';
import { jitteredPoll, useUserKey, workspaceKey } from '../../app/queries';
import { viewOf } from './request-draft';

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

/** Los períodos: los activos por fecha de inicio y después los archivados. */
export function usePeriods(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'periods'],
    queryFn: () => api(`${base(workspaceId)}/periods`, { schema: periodList }),
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

/** Los formatos del espacio de trabajo, activos primero y luego los archivados, con su última revisión. */
export function useLabsForms(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'forms'],
    queryFn: () => api(`${base(workspaceId)}/forms`, { schema: formList }),
    refetchInterval: jitteredPoll,
  });
}

/** Un formato con su última revisión completa: la hoja. */
export function useLabsForm(workspaceId: string, formId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'forms', formId],
    queryFn: () => api(`${base(workspaceId)}/forms/${formId}`, { schema: labsForm }),
  });
}

/** Las solicitudes: `mine`, las propias; `inbox`, las recibidas (para quien las consulta). */
export function useRequests(workspaceId: string, scope: 'mine' | 'inbox') {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'requests', scope],
    queryFn: () => api(`${base(workspaceId)}/requests?${new URLSearchParams({ scope })}`, { schema: requestList }),
    refetchInterval: jitteredPoll,
  });
}

/** Una solicitud con la hoja de su revisión. No se vuelve a pedir sola: lo que se edita parte de la versión que se vio. */
export function useRequest(workspaceId: string, requestId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'requests', 'one', requestId],
    queryFn: () => api(`${base(workspaceId)}/requests/${requestId}`, { schema: labsRequest }),
    select: viewOf,
  });
}

/** Lo que se puede pedir y las listas de asignaturas y carreras, con lo disponible hoy. */
export function useRequestOptions(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...labsKey(user, workspaceId), 'request-options'],
    queryFn: () => api(`${base(workspaceId)}/request-options`, { schema: requestOptions }),
  });
}
