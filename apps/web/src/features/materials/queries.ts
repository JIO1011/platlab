import {
  loan,
  loanList,
  locationList,
  materialAreaList,
  materialDetail,
  materialList,
  materialsDashboard,
  materialsSummary,
  materialStockList,
  memberList,
  type DashboardPeriod,
  type MaterialClass,
} from '@platlab/contracts';
import { queryOptions, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../app/api';
import { jitteredPoll, useUserKey, workspaceKey } from '../../app/queries';

const materialsKey = (user: string, workspaceId: string) => [...workspaceKey(user, workspaceId), 'materials'] as const;

/** La caché de Materiales del espacio: un comando confirmado la refresca entera. */
export function useMaterialsKey(workspaceId: string) {
  return materialsKey(useUserKey(), workspaceId);
}

const base = (workspaceId: string) => `/workspaces/${workspaceId}/materials`;

/** Las cifras del Resumen: materiales, bajo mínimo y préstamos abiertos y atrasados. */
export function useMaterialsSummary(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...materialsKey(user, workspaceId), 'summary'],
    queryFn: () => api(`${base(workspaceId)}/summary`, { schema: materialsSummary }),
    refetchInterval: jitteredPoll,
  });
}

/** El tablero del Resumen para un periodo; al cambiar de periodo conserva el anterior hasta que llega el nuevo. */
export function useMaterialsDashboard(workspaceId: string, days: DashboardPeriod) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...materialsKey(user, workspaceId), 'dashboard', days],
    queryFn: () => api(`${base(workspaceId)}/dashboard?days=${days}`, { schema: materialsDashboard }),
    placeholderData: (previous) => previous,
    refetchInterval: jitteredPoll,
  });
}

export interface MaterialFilters {
  q: string;
  materialClass: MaterialClass | null;
  /** Solo lo que tiene existencia en esa área (ubicación de primer nivel). */
  areaId: string | null;
  /** `below-minimum`: solo lo que está bajo su mínimo. */
  stock: 'below-minimum' | null;
}

/** El catálogo con sus existencias, por páginas; `q` busca desde 2 letras. */
export function useMaterialPage(workspaceId: string, filters: MaterialFilters, enabled = true) {
  const user = useUserKey();
  const q = filters.q.trim().length >= 2 ? filters.q.trim() : '';
  return useInfiniteQuery({
    queryKey: [...materialsKey(user, workspaceId), 'products', q, filters.materialClass, filters.areaId, filters.stock],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (filters.materialClass) params.set('class', filters.materialClass);
      if (filters.areaId) params.set('areaId', filters.areaId);
      if (filters.stock) params.set('stock', filters.stock);
      if (pageParam) params.set('cursor', pageParam);
      return api(`${base(workspaceId)}/products?${params}`, { schema: materialList });
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
    refetchInterval: jitteredPoll,
    enabled,
  });
}

/** Las áreas con material en existencia, con cuántos materiales hay en cada una. */
export function useMaterialAreas(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...materialsKey(user, workspaceId), 'areas'],
    queryFn: () => api(`${base(workspaceId)}/areas`, { schema: materialAreaList }),
    refetchInterval: jitteredPoll,
  });
}

/** La ficha de un material: sus totales y si su unidad aún puede cambiar. */
export function useMaterial(workspaceId: string, productId: string | null) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...materialsKey(user, workspaceId), 'product', productId],
    queryFn: () => api(`${base(workspaceId)}/products/${productId ?? ''}`, { schema: materialDetail }),
    enabled: productId !== null,
  });
}

const stockOptions = (user: string, workspaceId: string, productId: string) =>
  queryOptions({
    queryKey: [...materialsKey(user, workspaceId), 'stock', productId],
    queryFn: () => api(`${base(workspaceId)}/stock?productId=${productId}&limit=100`, { schema: materialStockList }),
  });

/** Lo que un material tiene en cada ubicación: de aquí salen las posiciones de salidas, ajustes y préstamos. */
export function useStock(workspaceId: string, productId: string | null) {
  const user = useUserKey();
  return useQuery({ ...stockOptions(user, workspaceId, productId ?? ''), enabled: productId !== null });
}

/** Pide las existencias por ubicación de un material justo cuando se necesitan (tocar su mosaico en «Nuevo préstamo»). */
export function useFetchStock(workspaceId: string) {
  const user = useUserKey();
  const client = useQueryClient();
  return (productId: string) => client.fetchQuery({ ...stockOptions(user, workspaceId, productId), staleTime: 5_000 });
}

/** Ubicaciones activas donde el miembro puede ingresar. */
export function useReceiptLocations(workspaceId: string, enabled: boolean) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...materialsKey(user, workspaceId), 'receipt-locations'],
    queryFn: () => api(`${base(workspaceId)}/receipt-locations`, { schema: locationList }),
    enabled,
    staleTime: 60_000,
  });
}

/** Los vales del espacio, del más nuevo al más viejo, con el filtro de estado. */
export function useLoanPage(workspaceId: string, filter: 'open' | 'overdue' | 'closed') {
  const user = useUserKey();
  return useInfiniteQuery({
    queryKey: [...materialsKey(user, workspaceId), 'loans', filter],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ filter });
      if (pageParam) params.set('cursor', pageParam);
      return api(`${base(workspaceId)}/loans?${params}`, { schema: loanList });
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
    refetchInterval: jitteredPoll,
  });
}

/** La ficha de un vale con sus líneas. */
export function useLoan(workspaceId: string, loanId: string | null) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...materialsKey(user, workspaceId), 'loan', loanId],
    queryFn: () => api(`${base(workspaceId)}/loans/${loanId ?? ''}`, { schema: loan }),
    enabled: loanId !== null,
  });
}

/** A quién se puede prestar: los miembros activos del espacio. */
export function useBorrowers(workspaceId: string, enabled: boolean) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...materialsKey(user, workspaceId), 'borrowers'],
    queryFn: () => api(`${base(workspaceId)}/borrowers`, { schema: memberList }),
    enabled,
    staleTime: 60_000,
  });
}
