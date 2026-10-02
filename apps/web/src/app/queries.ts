import {
  homeResponse,
  locationList,
  lotList,
  myWorkspacesResponse,
  operationList,
  positionList,
  productList,
  workspaceMeResponse,
} from '@platlab/contracts';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useSession } from './session';

/**
 * Claves con identidad y espacio: nada se reutiliza entre usuarios ni entre espacios (02 §8).
 * El tablero operativo se refresca cada 30 s solo con la pestaña visible, con variación (02 §12).
 */
const POLL_MS = 30_000;
const jitteredPoll = () => POLL_MS + Math.floor(Math.random() * 5_000);

function useUserKey(): string {
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

const reagentsKey = (user: string, workspaceId: string) => [...workspaceKey(user, workspaceId), 'reagents'] as const;

export function useReagentsKey(workspaceId: string) {
  return reagentsKey(useUserKey(), workspaceId);
}

export function useProducts(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'products'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/products?limit=100`, { schema: productList }),
    refetchInterval: jitteredPoll,
  });
}

export function usePositions(workspaceId: string) {
  const user = useUserKey();
  return useInfiniteQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'positions'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api(
        `/workspaces/${workspaceId}/reagents/positions?limit=100${pageParam ? `&cursor=${pageParam}` : ''}`,
        { schema: positionList },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: jitteredPoll,
  });
}

export function useOperations(workspaceId: string) {
  const user = useUserKey();
  return useInfiniteQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'operations'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api(
        `/workspaces/${workspaceId}/reagents/operations?limit=50${pageParam ? `&cursor=${pageParam}` : ''}`,
        { schema: operationList },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: jitteredPoll,
  });
}

export function useLots(workspaceId: string, productId: string | undefined) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'lots', productId],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/products/${productId}/lots`, { schema: lotList }),
    enabled: Boolean(productId),
  });
}

export function useReceiptLocations(workspaceId: string, enabled: boolean) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'receipt-locations'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/receipt-locations`, { schema: locationList }),
    enabled,
  });
}
