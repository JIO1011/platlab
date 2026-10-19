import {
  assetMaintenance,
  dueList,
  maintenanceAreaList,
  maintenanceAssetList,
  maintenanceIndicators,
  maintenanceSummary,
  nextDueList,
  planAssetList,
  planList,
  providerList,
  recordList,
} from '@platlab/contracts';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../../app/api';
import { jitteredPoll, useUserKey, workspaceKey } from '../../app/queries';
import { historyApiSearch, type HistoryFilters } from './history-filters';

const maintenanceKey = (user: string, workspaceId: string) => [...workspaceKey(user, workspaceId), 'maintenance'] as const;

/** La caché de Mantenimiento del espacio: un comando confirmado la refresca entera. */
export function useMaintenanceKey(workspaceId: string) {
  return maintenanceKey(useUserKey(), workspaceId);
}

const base = (workspaceId: string) => `/workspaces/${workspaceId}/maintenance`;

/** NEXT_DUE acepta hasta 100 equipos por consulta (`nextDueQuery`). */
const NEXT_DUE_BATCH = 100;

/** Cifras de Por hacer (ADR 0020): vencidos (con los no conformes), próximos 30 días, sin plan y, para el Administrador, «Evaluar reemplazo». */
export function useMaintenanceSummary(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'summary'],
    queryFn: () => api(`${base(workspaceId)}/summary`, { schema: maintenanceSummary }),
    refetchInterval: jitteredPoll,
  });
}

/** Indicadores (M-01c): los 12 meses de calendario hasta el actual, calculados al consultar. */
export function useIndicators(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'indicators'],
    queryFn: () => api(`${base(workspaceId)}/indicators`, { schema: maintenanceIndicators }),
  });
}

/** «Por hacer»: los no conformes y lo que vence hasta dentro de 30 días, calculado al consultar. */
export function useDue(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'due'],
    queryFn: () => api(`${base(workspaceId)}/due`, { schema: dueList }),
    refetchInterval: jitteredPoll,
  });
}

/** Proveedores activos, en orden alfabético: «Planes · Proveedores» y el selector de la hoja. */
export function useProviders(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'providers'],
    queryFn: () => api(`${base(workspaceId)}/providers`, { schema: providerList }),
    enabled,
  });
}

/** Planes activos con su cobertura; la hoja toma de aquí la lista y la versión del plan elegido. */
export function usePlans(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'plans'],
    queryFn: () => api(`${base(workspaceId)}/plans`, { schema: planList }),
    enabled,
  });
}

/** Los equipos de un plan con «Incluido», su fecha o su motivo; solo mientras el plan está abierto. */
export function usePlanAssets(workspaceId: string, planId: string | null) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'plans', planId, 'assets'],
    queryFn: () => api(`${base(workspaceId)}/plans/${planId}/assets`, { schema: planAssetList }),
    enabled: planId !== null,
  });
}

/** Historial (ADR 0020): por páginas, del más reciente al más antiguo, con sus filtros (M-01d). */
export function useRecords(workspaceId: string, filters: HistoryFilters) {
  const user = useUserKey();
  const search = historyApiSearch(filters).toString();
  return useInfiniteQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'records', search],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams(search);
      if (pageParam) params.set('cursor', pageParam);
      return api(`${base(workspaceId)}/records?${params}`, { schema: recordList });
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
  });
}

/** Las áreas del filtro del Historial (M-01d): las que tienen algún equipo. */
export function useMaintenanceAreas(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'areas'],
    queryFn: () => api(`${base(workspaceId)}/areas`, { schema: maintenanceAreaList }),
    staleTime: 60_000,
  });
}

/** Equipos para registrar: por texto (2 letras o más) o por el código exacto de su etiqueta. */
export function useMaintenanceAssets(workspaceId: string, search: { q: string } | { code: string } | null) {
  const user = useUserKey();
  const params = search && 'q' in search ? { q: search.q.trim() } : search;
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'assets', params],
    queryFn: () => api(`${base(workspaceId)}/assets?${new URLSearchParams(params ?? {})}`, { schema: maintenanceAssetList }),
    enabled: params !== null && ('code' in params || params.q.length >= 2),
    placeholderData: (previous) => previous,
  });
}

/** La pestaña Mantenimiento de la ficha: sus planes con su fecha, sus exclusiones y sus últimos registros. */
export function useAssetMaintenance(workspaceId: string, assetId: string | null) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'asset', assetId],
    queryFn: () => api(`${base(workspaceId)}/assets/${assetId ?? ''}`, { schema: assetMaintenance }),
    enabled: assetId !== null,
  });
}

/**
 * La columna «Próximo mantenimiento»: las filas visibles van en tandas de 100 y cada celda pide la suya,
 * así todas las de una tanda comparten una sola consulta.
 */
export function useNextDue(workspaceId: string, assetId: string, assetIds: string[]) {
  const user = useUserKey();
  const start = Math.max(0, Math.floor(assetIds.indexOf(assetId) / NEXT_DUE_BATCH) * NEXT_DUE_BATCH);
  const batch = assetIds.slice(start, start + NEXT_DUE_BATCH);
  return useQuery({
    queryKey: [...maintenanceKey(user, workspaceId), 'next-due', batch],
    queryFn: () => api(`${base(workspaceId)}/next-due?${new URLSearchParams({ assetIds: batch.join(',') })}`, { schema: nextDueList }),
    enabled: batch.length > 0,
    select: (data) => data.items.find((item) => item.assetId === assetId) ?? null,
    refetchInterval: jitteredPoll,
  });
}
