import type { AssetCondition } from '@platlab/contracts';

/**
 * Filtros del Inventario de Equipos (ADR 0019): viven en la URL, en español, y se envían a la API con
 * sus códigos. Varios valores por filtro, en parámetros repetidos.
 */
export interface AssetQuery {
  q: string;
  conditions: AssetCondition[];
  types: string[];
  locations: string[];
}

/** Condición en la URL: una palabra legible por código de la API. */
const conditionSlugs: Record<AssetCondition, string> = {
  operational: 'operativo',
  restricted: 'restringido',
  faulted: 'fuera-de-servicio',
  retired: 'baja',
};
const conditionOf = Object.fromEntries(Object.entries(conditionSlugs).map(([code, slug]) => [slug, code])) as Record<
  string,
  AssetCondition
>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unique = <T>(values: T[]) => [...new Set(values)];

/** Lo que se lee de la URL; lo desconocido o mal formado se ignora (un enlace viejo nunca rompe). */
export function assetQueryFrom(search: URLSearchParams): AssetQuery {
  const q = (search.get('q') ?? '').trim();
  return {
    q: q.length >= 2 ? q.slice(0, 100) : '',
    conditions: unique(search.getAll('condicion').flatMap((slug) => conditionOf[slug] ?? [])),
    types: unique(search.getAll('tipo').filter((id) => uuid.test(id))),
    locations: unique(search.getAll('ubicacion').filter((id) => uuid.test(id))),
  };
}

/** La URL del Inventario con estos filtros (para enlaces como los de las cifras del Resumen). */
export function assetSearch(query: Partial<AssetQuery>): URLSearchParams {
  const search = new URLSearchParams();
  if (query.q) search.set('q', query.q);
  for (const condition of query.conditions ?? []) search.append('condicion', conditionSlugs[condition]);
  for (const type of query.types ?? []) search.append('tipo', type);
  for (const location of query.locations ?? []) search.append('ubicacion', location);
  return search;
}

/** Los mismos filtros en los parámetros de GET /assets. */
export function assetApiSearch(query: AssetQuery, cursor?: string, limit = 50): URLSearchParams {
  const search = new URLSearchParams({ limit: String(limit) });
  if (query.q) search.set('q', query.q);
  for (const condition of query.conditions) search.append('condition', condition);
  for (const type of query.types) search.append('type', type);
  for (const location of query.locations) search.append('location', location);
  if (cursor) search.set('cursor', cursor);
  return search;
}

/** ¿Hay algún filtro aplicado? Decide entre «Sin equipos» y «Sin resultados con estos filtros». */
export const isFiltered = (query: AssetQuery) =>
  query.q !== '' || query.conditions.length > 0 || query.types.length > 0 || query.locations.length > 0;
