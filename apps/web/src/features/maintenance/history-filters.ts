import type { WorkKind, WorkResult } from '@platlab/contracts';
import { z } from 'zod';
import { invertSlugs } from '../../app/slugs';

/**
 * Filtros del Historial en la URL (M-01d), como Movimientos: lo que se filtra es lo que se imprime y se exporta,
 * y un informe es un enlace. La URL va en español y repite el parámetro para varios valores
 * (`?tipo=calibracion&tipo=limpieza`); la API, en inglés. Lo inválido se ignora: un enlace viejo o editado a mano
 * nunca rompe la página. `equipo` llega desde la ficha.
 */
export interface HistoryFilters {
  assetId: string | null;
  kinds: WorkKind[];
  results: WorkResult[];
  areas: string[];
  /** Ids de proveedores; `internal` es el trabajo sin proveedor («Interno»). */
  providers: string[];
  /** Por la fecha del trabajo, con los dos extremos incluidos; puede faltar uno. */
  from: string | null;
  to: string | null;
}

export const emptyHistoryFilters: HistoryFilters = { assetId: null, kinds: [], results: [], areas: [], providers: [], from: null, to: null };

export const INTERNAL = 'internal';

const kindSlugs: Record<WorkKind, string> = {
  preventive: 'preventivo',
  calibration: 'calibracion',
  verification: 'verificacion',
  cleaning: 'limpieza',
  corrective: 'correctivo',
};
const resultSlugs: Record<WorkResult, string> = { pass: 'conforme', pass_with_observations: 'con-observaciones', fail: 'no-conforme' };
const INTERNAL_SLUG = 'interno';

const kindOf = invertSlugs(kindSlugs);
const resultOf = invertSlugs(resultSlugs);
/** El código de la API de una palabra de la URL; ninguno si no es una de ellas. */
const lookup = <T>(map: Record<string, T>) => (slug: string): T[] => (Object.hasOwn(map, slug) ? [map[slug] as T] : []);

/** Límite de valores por filtro de la API (`many` en `packages/contracts`). */
const MAX_VALUES = 100;
const uuid = z.uuid();
const isoDate = z.iso.date();
const isUuid = (value: string) => uuid.safeParse(value).success;

/** Valores válidos y distintos de un parámetro repetido, en el orden de la URL. */
const values = <T>(params: URLSearchParams, key: string, read: (value: string) => T[]): T[] =>
  [...new Set(params.getAll(key).flatMap(read))].slice(0, MAX_VALUES);

/** Lee los filtros de la URL de la página; un periodo al revés se descarta entero. */
export function parseHistoryFilters(params: URLSearchParams): HistoryFilters {
  const date = (key: string) => {
    const value = params.get(key);
    return value !== null && isoDate.safeParse(value).success ? value : null;
  };
  const from = date('desde');
  const to = date('hasta');
  const inOrder = !(from && to && from > to);
  const asset = params.get('equipo');
  return {
    assetId: asset && isUuid(asset) ? asset : null,
    kinds: values(params, 'tipo', lookup(kindOf)),
    results: values(params, 'resultado', lookup(resultOf)),
    areas: values(params, 'area', (id) => (isUuid(id) ? [id] : [])),
    providers: values(params, 'proveedor', (value) => (value === INTERNAL_SLUG ? [INTERNAL] : isUuid(value) ? [value] : [])),
    from: inOrder ? from : null,
    to: inOrder ? to : null,
  };
}

/** Escribe los filtros en la URL de la página; lo vacío no se escribe. */
export function historySearch(filters: HistoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.assetId) params.set('equipo', filters.assetId);
  for (const kind of filters.kinds) params.append('tipo', kindSlugs[kind]);
  for (const result of filters.results) params.append('resultado', resultSlugs[result]);
  for (const area of filters.areas) params.append('area', area);
  for (const provider of filters.providers) params.append('proveedor', provider === INTERNAL ? INTERNAL_SLUG : provider);
  if (filters.from) params.set('desde', filters.from);
  if (filters.to) params.set('hasta', filters.to);
  return params;
}

/**
 * Los mismos filtros en los parámetros de la API: la lista (GET /records) y el Excel (GET /records/export). Los
 * valores van ordenados para que la misma selección comparta caché.
 */
export function historyApiSearch(filters: HistoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  const sorted = (list: readonly string[]) => [...list].sort();
  if (filters.assetId) params.set('assetId', filters.assetId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  for (const kind of sorted(filters.kinds)) params.append('kind', kind);
  for (const result of sorted(filters.results)) params.append('result', result);
  for (const area of sorted(filters.areas)) params.append('area', area);
  for (const provider of sorted(filters.providers)) params.append('provider', provider);
  return params;
}

/** ¿Hay algún filtro aplicado, sin contar el equipo? Decide entre «Sin registros» y «Sin resultados con estos filtros». */
export const isHistoryFiltered = (filters: HistoryFilters) =>
  filters.from !== null ||
  filters.to !== null ||
  [filters.kinds, filters.results, filters.areas, filters.providers].some((list) => list.length > 0);
