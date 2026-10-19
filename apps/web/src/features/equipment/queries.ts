import {
  areaList,
  areaTypeList,
  asset,
  assetDocumentList,
  assetTotals,
  assetHistory,
  assetList,
  assetTypeList,
  equipmentSummary,
  fault,
  faultCounts,
  faultList,
  faultStats,
  locationList,
  reportableAsset,
  reportableAssetList,
  responsibleList,
  type AssetList,
  type FaultList,
  type FaultStatus,
} from '@platlab/contracts';
import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { api } from '../../app/api';
import { jitteredPoll, keepWithinWorkspace, useUserKey, workspaceKey } from '../../app/queries';
import { assetApiSearch, assetFilterSearch, type AssetQuery } from './asset-filters';

const equipmentKey = (user: string, workspaceId: string) => [...workspaceKey(user, workspaceId), 'equipment'] as const;

/** La caché de Equipos del espacio: un comando confirmado la refresca entera. */
export function useEquipmentKey(workspaceId: string) {
  return equipmentKey(useUserKey(), workspaceId);
}

const base = (workspaceId: string) => `/workspaces/${workspaceId}/equipment`;

/** Resumen de la app (ADR 0011): cifras por estado, sin los dados de baja. */
export function useEquipmentSummary(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'summary'],
    queryFn: () => api(`${base(workspaceId)}/summary`, { schema: equipmentSummary }),
    refetchInterval: jitteredPoll,
  });
}

/**
 * Inventario (ADR 0019): páginas por código con búsqueda y filtros; la siguiente se pide al llegar al
 * final. `limit` corto para listas de una sección (los que requieren atención en el Resumen).
 */
export function useAssets(workspaceId: string, query: AssetQuery, limit = 50) {
  const user = useUserKey();
  return useInfiniteQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'assets', query, limit],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api(`${base(workspaceId)}/assets?${assetApiSearch(query, pageParam, limit)}`, { schema: assetList }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    placeholderData: keepWithinWorkspace<InfiniteData<AssetList, string | undefined>>(user, workspaceId),
    refetchInterval: jitteredPoll,
  });
}

/**
 * Tarjetas del Inventario (ADR 0019, E-01c): áreas con equipos, en orden alfabético, con su encargado y
 * cuántos están fuera de servicio o con uso limitado.
 */
export function useAreas(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'areas'],
    queryFn: () => api(`${base(workspaceId)}/areas`, { schema: areaList }),
    refetchInterval: jitteredPoll,
  });
}

/**
 * Un área agrupada por tipo (E-01c): «Microscopio óptico ×50» con sus cifras por estado; las unidades
 * de un tipo salen de `useAssets` con `locations: [areaId]` y `types: [typeId]`.
 */
export function useAreaTypes(workspaceId: string, areaId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'areas', areaId, 'types'],
    queryFn: () => api(`${base(workspaceId)}/areas/${areaId}/types`, { schema: areaTypeList }),
    enabled,
    refetchInterval: jitteredPoll,
  });
}

/**
 * Indicadores del Informe (E-01c), con los mismos filtros que la tabla: equipos, valor de reposición,
 * sin responsable, garantía por vencer y vida útil cumplida.
 */
export function useAssetTotals(workspaceId: string, query: AssetQuery) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'asset-totals', query],
    queryFn: () => api(`${base(workspaceId)}/assets/totals?${assetFilterSearch(query)}`, { schema: assetTotals }),
    placeholderData: (previous) => previous,
    refetchInterval: jitteredPoll,
  });
}

/** Ficha del equipo, también si está dado de baja. */
export function useAsset(workspaceId: string, assetId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'asset', assetId],
    queryFn: () => api(`${base(workspaceId)}/assets/${assetId}`, { schema: asset }),
  });
}

/**
 * Historial del equipo: alta, cambios de estado y traslados, del más reciente al más antiguo. Sin `limit`, los
 * últimos que da el servidor (la ficha); la hoja de vida pide toda la vida hasta `PRINT_LIMIT`.
 */
export function useAssetHistory(workspaceId: string, assetId: string, enabled = true, limit?: number) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'asset', assetId, 'history', limit ?? null],
    queryFn: () =>
      api(`${base(workspaceId)}/assets/${assetId}/history${limit ? `?limit=${limit}` : ''}`, { schema: assetHistory }),
    enabled,
  });
}

/** Documentos vigentes del equipo (E-01e), del más reciente al más antiguo: la pestaña de la ficha y la hoja de vida. */
export function useAssetDocuments(workspaceId: string, assetId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'asset', assetId, 'documents'],
    queryFn: () => api(`${base(workspaceId)}/assets/${assetId}/documents`, { schema: assetDocumentList }),
  });
}

/** Tipos de equipo activos: el alta, la edición y el filtro «Tipo». */
export function useAssetTypes(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'asset-types'],
    queryFn: () => api(`${base(workspaceId)}/asset-types`, { schema: assetTypeList }),
  });
}

/** Miembros activos que pueden ser responsables de un equipo. */
export function useResponsibles(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'responsibles'],
    queryFn: () => api(`${base(workspaceId)}/responsibles`, { schema: responsibleList }),
    enabled,
  });
}

/**
 * Ubicaciones activas de Core con su padre: el selector por niveles y el filtro «Ubicación». Cada una
 * trae su área y, la del área, su encargado (E-01c).
 */
export function useEquipmentLocations(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'locations'],
    queryFn: () => api(`${base(workspaceId)}/locations`, { schema: locationList }),
    enabled,
  });
}

/**
 * Incidentes, que son las fallas (ADR 0019): del más reciente al más antiguo. Quien atiende ve todos; quien solo
 * reporta, los suyos (lo decide el servidor). Sin estados, todos; con `assetId`, los de un equipo.
 */
export function useFaults(workspaceId: string, filter: { statuses: FaultStatus[]; assetId?: string }, limit = 30, enabled = true) {
  const user = useUserKey();
  return useInfiniteQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'faults', filter, limit],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams({ limit: String(limit) });
      for (const status of filter.statuses) search.append('status', status);
      if (filter.assetId) search.set('asset', filter.assetId);
      if (pageParam) search.set('cursor', pageParam);
      return api(`${base(workspaceId)}/faults?${search}`, { schema: faultList });
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    placeholderData: keepWithinWorkspace<InfiniteData<FaultList, string | undefined>>(user, workspaceId),
    refetchInterval: jitteredPoll,
    enabled,
  });
}

/** Las pestañas de Incidentes: cuántos hay en cada paso, con el alcance de la lista (lo decide el servidor). */
export function useFaultCounts(workspaceId: string) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'fault-counts'],
    queryFn: () => api(`${base(workspaceId)}/faults/counts`, { schema: faultCounts }),
    refetchInterval: jitteredPoll,
  });
}

/** «Incidentes en 12 meses» del Resumen (ADR 0019): solo para quien atiende fallas (`equipment.fault.manage`). */
export function useFaultStats(workspaceId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'fault-stats'],
    queryFn: () => api(`${base(workspaceId)}/faults/stats`, { schema: faultStats }),
    enabled,
    refetchInterval: jitteredPoll,
  });
}

/** Una falla con su línea de tiempo (quién y cuándo en cada paso). */
export function useFault(workspaceId: string, faultId: string, enabled = true) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'fault', faultId],
    queryFn: () => api(`${base(workspaceId)}/faults/${faultId}`, { schema: fault }),
    enabled,
  });
}

/** Para reportar sin ver el inventario: equipos activos cuyo nombre o código contiene `q` (2 letras o más). */
export function useReportableAssets(workspaceId: string, q: string, enabled = true) {
  const user = useUserKey();
  const term = q.trim();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'reportable-assets', term],
    queryFn: () => api(`${base(workspaceId)}/faults/assets?${new URLSearchParams({ q: term })}`, { schema: reportableAssetList }),
    enabled: enabled && term.length >= 2,
    placeholderData: (previous) => previous,
  });
}

/** El equipo del QR de su etiqueta, para reportarlo (E-01d); uno dado de baja o de otro espacio da 404 sin reintentos. */
export function useReportableAsset(workspaceId: string, assetId: string | null) {
  const user = useUserKey();
  return useQuery({
    queryKey: [...equipmentKey(user, workspaceId), 'reportable-asset', assetId],
    queryFn: () => api(`${base(workspaceId)}/faults/assets/${assetId ?? ''}`, { schema: reportableAsset }),
    enabled: assetId !== null,
    retry: false,
  });
}
