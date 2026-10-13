import {
  brandList,
  containerCodeSuggestion,
  entryList,
  issueRequestList,
  locationList,
  operationFacets,
  operationList,
  operationTotals,
  positionList,
  productDetail,
  productList,
  reagentsSummary,
  type OperationFacets,
  type OperationGroupBy,
  type OperationList,
  type OperationTotals,
  type ReasonKind,
  type WorkspaceMeResponse,
} from '@platlab/contracts';
import { keepPreviousData, useInfiniteQuery, useQuery, type InfiniteData, type Query } from '@tanstack/react-query';
import { api } from '../../app/api';
import { jitteredPoll, useUserKey, workspaceKey } from '../../app/queries';
import { operationSearch, type OperationQuery } from './movement-filters';

const reagentsKey = (user: string, workspaceId: string) => [...workspaceKey(user, workspaceId), 'reagents'] as const;

export function useReagentsKey(workspaceId: string) {
  return reagentsKey(useUserKey(), workspaceId);
}

/** Resumen de la app de Reactivos (ADR 0011): cifras, gráfico de salidas y actividad reciente. */
export function useReagentsSummary(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'summary'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/summary`, { schema: reagentsSummary }),
    refetchInterval: jitteredPoll,
    enabled,
  });
}

export function useProducts(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'products'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/products?limit=100`, { schema: productList }),
    refetchInterval: jitteredPoll,
  });
}

/**
 * Frascos con su ubicación; con `productId`, solo los de un reactivo (su ficha, ADR 0012), y con
 * `locationId`, solo los de una ubicación (el conteo, entrega 4).
 */
export function usePositions(workspaceId: string, productId?: string, locationId?: string, enabled = true) {
  const user = useUserKey();
  return useInfiniteQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'positions', productId ?? null, locationId ?? null],
    initialPageParam: undefined as string | undefined,
    enabled,
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams({ limit: '100' });
      if (productId) search.set('productId', productId);
      if (locationId) search.set('locationId', locationId);
      if (pageParam) search.set('cursor', pageParam);
      return api(`/workspaces/${workspaceId}/reagents/positions?${search}`, { schema: positionList });
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: jitteredPoll,
  });
}

/**
 * El libro de Movimientos con sus filtros (ADR 0014); la clave lleva la consulta entera, ya con el
 * periodo resuelto, así cada combinación tiene su caché.
 */
export function useOperations(workspaceId: string, query: OperationQuery = {}) {
  const user = useUserKey();
  return useInfiniteQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'operations', query],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const search = operationSearch(query);
      search.set('limit', '50');
      if (pageParam) search.set('cursor', pageParam);
      return api(`/workspaces/${workspaceId}/reagents/operations?${search}`, { schema: operationList });
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    // Al cambiar un filtro, la lista anterior se queda (atenuada en la interfaz) hasta que llega la nueva.
    placeholderData: keepWithinWorkspace<InfiniteData<OperationList, string | undefined>>(user, workspaceId),
    refetchInterval: jitteredPoll,
  });
}

/**
 * Conserva los datos anteriores mientras cambian los filtros, pero nunca los de otro usuario u otro
 * espacio: la clave empieza por `['user', id, 'ws', workspaceId]`.
 */
function keepWithinWorkspace<T>(user: string, workspaceId: string) {
  return (previous: T | undefined, previousQuery: Query<T, Error, T, readonly unknown[]> | undefined) =>
    previousQuery?.queryKey[1] === user && previousQuery.queryKey[3] === workspaceId ? previous : undefined;
}

/**
 * Asientos por opción de cada filtro (ADR 0014); `productQuery` busca dentro de los reactivos. Mientras
 * cambian los filtros se conservan los conteos anteriores: el panel no parpadea.
 */
export function useOperationFacets(workspaceId: string, query: OperationQuery, productQuery = '', enabled = true) {
  const user = useUserKey();
  const search = productQuery.trim();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'operation-facets', query, search],
    queryFn: () => {
      const params = operationSearch(query);
      if (search) params.set('productQuery', search);
      return api(`/workspaces/${workspaceId}/reagents/operations/facets?${params}`, { schema: operationFacets });
    },
    placeholderData: keepWithinWorkspace<OperationFacets>(user, workspaceId),
    refetchInterval: jitteredPoll,
    enabled,
  });
}

/** Totales y exportación son reportes (ADR 0014): `reagents.report.read` en los permisos efectivos. */
export const canReadReports = (me: WorkspaceMeResponse) => me.permissions.includes('reagents.report.read');

/** Totales del libro filtrado, calculados en el servidor (ADR 0014); solo se piden con el permiso. */
export function useOperationTotals(
  workspaceId: string,
  me: WorkspaceMeResponse,
  query: OperationQuery,
  groupBy: OperationGroupBy,
  enabled = true,
) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'operation-totals', query, groupBy],
    queryFn: () => {
      const params = operationSearch(query);
      params.set('groupBy', groupBy);
      return api(`/workspaces/${workspaceId}/reagents/operations/totals?${params}`, { schema: operationTotals });
    },
    placeholderData: keepWithinWorkspace<OperationTotals>(user, workspaceId),
    refetchInterval: jitteredPoll,
    enabled: enabled && canReadReports(me),
  });
}

/** Ficha de un reactivo: su total, sus frascos con saldo en el ámbito del miembro y si su unidad aún cambia. */
export function useProduct(workspaceId: string, productId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'product', productId],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/products/${productId}`, { schema: productDetail }),
  });
}

/** Motivos de salida o de ajuste y destinos del laboratorio (ADR 0012). */
export function useReasons(workspaceId: string, kind: ReasonKind, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'reasons', kind],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/reasons?kind=${kind}`, { schema: entryList }),
    enabled,
    staleTime: 60_000,
  });
}

export function useDestinations(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'destinations'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/destinations`, { schema: entryList }),
    enabled,
    staleTime: 60_000,
  });
}

/** Áreas o departamentos del espacio (ADR 0015): se guardan como texto en el lote del ingreso. */
export function useAreas(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'areas'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/areas`, { schema: entryList }),
    enabled,
    staleTime: 60_000,
  });
}

/** Marcas ya usadas en los lotes, las más recientes primero (ADR 0015). */
export function useBrands(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'brands'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/brands`, { schema: brandList }),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Ubicaciones donde el miembro registra ingresos, con su padre: la web arma los niveles (ADR 0015).
 * El árbol es el de Core; las que crea el ingreso llegan al volver a pedirlo.
 */
export function useReceiptLocations(workspaceId: string, enabled: boolean) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'receipt-locations'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/receipt-locations`, { schema: locationList }),
    enabled,
  });
}

/**
 * Códigos sugeridos para `count` frascos (ADR 0015): la serie libre del reactivo o una nueva a partir
 * del nombre. Lo decide el servidor; al cambiar el nombre o la cantidad se conserva la anterior
 * mientras llega la nueva.
 */
export function useCodeSuggestion(
  workspaceId: string,
  target: { productId: string } | { name: string } | null,
  count: number,
  enabled: boolean,
) {
  const user = useUserKey();
  const search = new URLSearchParams({ count: String(count) });
  if (target && 'productId' in target) search.set('productId', target.productId);
  else if (target) search.set('name', target.name);
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'code-suggestion', search.toString()],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/container-codes/suggestion?${search}`, { schema: containerCodeSuggestion }),
    enabled: enabled && target !== null,
    placeholderData: keepPreviousData,
  });
}

/** Ubicaciones a las que el miembro puede trasladar un frasco (ADR 0012, entrega 4). */
export function useTransferLocations(workspaceId: string, enabled: boolean) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'transfer-locations'],
    queryFn: () => api(`/workspaces/${workspaceId}/reagents/transfer-locations`, { schema: locationList }),
    enabled,
  });
}

/**
 * Solicitudes de salida (ADR 0012): la bandeja de quien aprueba o las propias del Operador; lo
 * decide el servidor. Se refresca como el resto, sin actualizaciones optimistas.
 */
export function useIssueRequests(workspaceId: string, all: boolean, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...reagentsKey(user, workspaceId), 'issue-requests', all ? 'todas' : 'pendientes'],
    queryFn: () =>
      api(`/workspaces/${workspaceId}/reagents/issue-requests?estado=${all ? 'todas' : 'pendientes'}`, {
        schema: issueRequestList,
      }),
    refetchInterval: jitteredPoll,
    enabled,
  });
}
