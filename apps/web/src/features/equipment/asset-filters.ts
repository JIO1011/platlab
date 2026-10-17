import type { AssetCondition, AssetConservation, usefulLifeState, warrantyState } from '@platlab/contracts';
import type { z } from 'zod';

/**
 * Filtros del Inventario de Equipos (ADR 0019): viven en la URL, en español, y se envían a la API con
 * sus códigos. Varios valores por filtro, en parámetros repetidos.
 */
export interface AssetQuery {
  q: string;
  conditions: AssetCondition[];
  types: string[];
  locations: string[];
  /** Ids de miembros; `none` es «sin responsable» (E-01c). */
  responsibles: string[];
  conservations: Array<AssetConservation | 'none'>;
  warranties: Array<z.infer<typeof warrantyState>>;
  usefulLives: Array<z.infer<typeof usefulLifeState>>;
}

/** Sin filtros: la base de cada consulta que solo fija algunos. */
export const emptyAssetQuery: AssetQuery = {
  q: '',
  conditions: [],
  types: [],
  locations: [],
  responsibles: [],
  conservations: [],
  warranties: [],
  usefulLives: [],
};

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

/** Filtros del Informe en la URL (E-01c): palabras legibles por código de la API; `sin-dato` es `none`. */
const conservationSlugs: Record<AssetQuery['conservations'][number], string> = { good: 'bueno', fair: 'regular', poor: 'malo', none: 'sin-dato' };
const warrantySlugs: Record<AssetQuery['warranties'][number], string> = {
  active: 'vigente',
  expiring: 'por-vencer',
  expired: 'vencida',
  none: 'sin-dato',
};
const usefulLifeSlugs: Record<AssetQuery['usefulLives'][number], string> = { reached: 'cumplida', current: 'vigente', none: 'sin-dato' };
const NO_RESPONSIBLE = 'sin';

const reverse = <T extends string>(slugs: Record<T, string>) =>
  Object.fromEntries(Object.entries(slugs).map(([code, slug]) => [slug, code])) as Record<string, T>;
const conservationOf = reverse(conservationSlugs);
const warrantyOf = reverse(warrantySlugs);
const usefulLifeOf = reverse(usefulLifeSlugs);

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
    responsibles: unique(
      search.getAll('responsable').flatMap((value) => (value === NO_RESPONSIBLE ? ['none'] : uuid.test(value) ? [value] : [])),
    ),
    conservations: unique(search.getAll('estado-fisico').flatMap((slug) => conservationOf[slug] ?? [])),
    warranties: unique(search.getAll('garantia').flatMap((slug) => warrantyOf[slug] ?? [])),
    usefulLives: unique(search.getAll('vida-util').flatMap((slug) => usefulLifeOf[slug] ?? [])),
  };
}

/** La URL del Inventario con estos filtros (para enlaces como los de las cifras del Resumen). */
export function assetSearch(query: Partial<AssetQuery>): URLSearchParams {
  const search = new URLSearchParams();
  if (query.q) search.set('q', query.q);
  for (const condition of query.conditions ?? []) search.append('condicion', conditionSlugs[condition]);
  for (const type of query.types ?? []) search.append('tipo', type);
  for (const location of query.locations ?? []) search.append('ubicacion', location);
  for (const id of query.responsibles ?? []) search.append('responsable', id === 'none' ? NO_RESPONSIBLE : id);
  for (const value of query.conservations ?? []) search.append('estado-fisico', conservationSlugs[value]);
  for (const value of query.warranties ?? []) search.append('garantia', warrantySlugs[value]);
  for (const value of query.usefulLives ?? []) search.append('vida-util', usefulLifeSlugs[value]);
  return search;
}

/** Los mismos filtros en los parámetros de la API: GET /assets, los indicadores (/assets/totals) y el Excel (/assets/export). */
export function assetFilterSearch(query: AssetQuery): URLSearchParams {
  const search = new URLSearchParams();
  if (query.q) search.set('q', query.q);
  for (const condition of query.conditions) search.append('condition', condition);
  for (const type of query.types) search.append('type', type);
  for (const location of query.locations) search.append('location', location);
  for (const id of query.responsibles) search.append('responsible', id);
  for (const value of query.conservations) search.append('conservation', value);
  for (const value of query.warranties) search.append('warranty', value);
  for (const value of query.usefulLives) search.append('usefulLife', value);
  return search;
}

/** Una página de GET /assets con esos filtros. */
export function assetApiSearch(query: AssetQuery, cursor?: string, limit = 50): URLSearchParams {
  const search = assetFilterSearch(query);
  search.set('limit', String(limit));
  if (cursor) search.set('cursor', cursor);
  return search;
}

/** ¿Hay algún filtro aplicado? Decide entre «Sin equipos» y «Sin resultados con estos filtros». */
export const isFiltered = (query: AssetQuery) =>
  query.q !== '' ||
  [query.conditions, query.types, query.locations, query.responsibles, query.conservations, query.warranties, query.usefulLives].some(
    (values) => values.length > 0,
  );
