import type { OperationGroupBy } from '@platlab/contracts';
import { z } from 'zod';
import { addDays } from '../../app/format';

/**
 * Filtros de Movimientos en la URL (ADR 0014): lo que se filtra es lo que se exporta y un informe es
 * un enlace. La URL va en español y repite el parámetro para varios valores
 * (`?tipo=salida&tipo=ajuste`); la API, en inglés y con el periodo ya resuelto. Un valor inválido se
 * ignora: un enlace viejo o editado a mano nunca rompe la página.
 */

type OperationType = 'receipt' | 'issue' | 'adjustment' | 'transfer';

/** El Resumen enlaza `?tipo=salida&dias=30`: la misma ventana que su gráfico. */
const typeParams = { ingreso: 'receipt', salida: 'issue', ajuste: 'adjustment', traslado: 'transfer' } as const;
const groupParams = { reactivo: 'product', responsable: 'responsible', destino: 'destination', mes: 'month' } as const;

/**
 * «Este mes» y «Mes anterior» quedan simbólicos en la URL: un enlace guardado avanza con el
 * calendario. Un rango puede tener un solo extremo.
 */
type MovementPeriod =
  | { kind: 'all' }
  | { kind: 'days'; days: number }
  | { kind: 'month' }
  | { kind: 'previous-month' }
  | { kind: 'range'; from: string | null; to: string | null };

export interface MovementFilters {
  types: OperationType[];
  productIds: string[];
  responsibleIds: string[];
  destinations: string[];
  reasons: string[];
  locationIds: string[];
  period: MovementPeriod;
  view: 'detail' | 'totals';
  groupBy: OperationGroupBy;
}

/** Consulta de la API: los mismos filtros de la lista, los conteos por opción y los totales. */
export interface OperationQuery {
  type?: OperationType[];
  productId?: string[];
  responsibleId?: string[];
  destination?: string[];
  reason?: string[];
  locationId?: string[];
  days?: number;
  from?: string;
  to?: string;
}

export const emptyMovementFilters: MovementFilters = {
  types: [],
  productIds: [],
  responsibleIds: [],
  destinations: [],
  reasons: [],
  locationIds: [],
  period: { kind: 'all' },
  view: 'detail',
  groupBy: 'product',
};

/** La lista con la clave añadida, o sin ella si ya estaba: lo que cambia al marcar una casilla o pastilla. */
export const toggle = <T extends string>(list: readonly T[], key: T): T[] => (list.includes(key) ? list.filter((item) => item !== key) : [...list, key]);

/** Límite de valores por filtro de la API (`packages/contracts`, `operationFilterFields`). */
const MAX_VALUES = 100;
const uuid = z.uuid();
const isoDate = z.iso.date();

const isKey = <T extends object>(map: T, key: string): key is Extract<keyof T, string> => Object.hasOwn(map, key);

/** Valores válidos y distintos de un parámetro repetido, en el orden de la URL. */
function values(params: URLSearchParams, key: string, valid: (value: string) => boolean): string[] {
  return [...new Set(params.getAll(key).filter(valid))].slice(0, MAX_VALUES);
}

const text = (max: number) => (value: string) => value.trim().length > 0 && value.length <= max;

function readPeriod(params: URLSearchParams): MovementPeriod {
  const symbolic = params.get('periodo');
  if (symbolic === 'mes') return { kind: 'month' };
  if (symbolic === 'mes-anterior') return { kind: 'previous-month' };
  const date = (key: string) => {
    const value = params.get(key);
    return value !== null && isoDate.safeParse(value).success ? value : null;
  };
  const from = date('desde');
  const to = date('hasta');
  if ((from || to) && !(from && to && from > to)) return { kind: 'range', from, to };
  const days = Number(params.get('dias'));
  if (Number.isInteger(days) && days >= 1 && days <= 90) return { kind: 'days', days };
  return { kind: 'all' };
}

/** Lee los filtros de la URL de la página; lo inválido se descarta. */
export function parseMovementFilters(params: URLSearchParams): MovementFilters {
  const group = params.get('agrupar') ?? '';
  return {
    types: values(params, 'tipo', (value) => isKey(typeParams, value)).map(
      (value) => typeParams[value as keyof typeof typeParams],
    ),
    productIds: values(params, 'reactivo', (value) => uuid.safeParse(value).success),
    responsibleIds: values(params, 'responsable', (value) => uuid.safeParse(value).success),
    destinations: values(params, 'destino', text(200)),
    reasons: values(params, 'motivo', text(500)),
    locationIds: values(params, 'ubicacion', (value) => uuid.safeParse(value).success),
    period: readPeriod(params),
    view: params.get('vista') === 'totales' ? 'totals' : 'detail',
    groupBy: isKey(groupParams, group) ? groupParams[group] : 'product',
  };
}

const paramOf = <T extends Record<string, string>>(map: T, value: T[keyof T]) =>
  Object.entries(map).find(([, mapped]) => mapped === value)?.[0];

/** Escribe los filtros en la URL; lo que coincide con el valor por omisión no se escribe. */
export function serializeMovementFilters(filters: MovementFilters): URLSearchParams {
  const params = new URLSearchParams();
  const append = (key: string, list: readonly string[]) => list.forEach((value) => params.append(key, value));
  append('tipo', filters.types.map((type) => paramOf(typeParams, type)).filter((value) => value !== undefined));
  append('reactivo', filters.productIds);
  append('responsable', filters.responsibleIds);
  append('destino', filters.destinations);
  append('motivo', filters.reasons);
  append('ubicacion', filters.locationIds);
  const { period } = filters;
  if (period.kind === 'days') params.set('dias', String(period.days));
  else if (period.kind === 'month') params.set('periodo', 'mes');
  else if (period.kind === 'previous-month') params.set('periodo', 'mes-anterior');
  else if (period.kind === 'range') {
    if (period.from) params.set('desde', period.from);
    if (period.to) params.set('hasta', period.to);
  }
  if (filters.view === 'totals') params.set('vista', 'totales');
  if (filters.groupBy !== 'product') params.set('agrupar', paramOf(groupParams, filters.groupBy) ?? 'reactivo');
  return params;
}

/** Día civil «AAAA-MM-DD» de un instante en la zona del espacio. */
function dayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Primer y último día del mes de `day`, desplazado `offset` meses. */
function monthRange(day: string, offset: number): { from: string; to: string } {
  const [year = 1970, month = 1] = day.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
  const next = new Date(Date.UTC(year, month + offset, 1)).toISOString().slice(0, 10);
  return { from: first, to: addDays(next, -1) };
}

/**
 * Consulta de la API para unos filtros: el periodo simbólico se resuelve con el calendario de la zona
 * del espacio. Los valores se ordenan para que la misma selección comparta caché.
 */
export function toOperationQuery(filters: MovementFilters, timeZone: string, now = new Date()): OperationQuery {
  const query: OperationQuery = {};
  const sorted = (list: readonly string[]) => [...list].sort();
  if (filters.types.length) query.type = sorted(filters.types) as OperationType[];
  if (filters.productIds.length) query.productId = sorted(filters.productIds);
  if (filters.responsibleIds.length) query.responsibleId = sorted(filters.responsibleIds);
  if (filters.destinations.length) query.destination = sorted(filters.destinations);
  if (filters.reasons.length) query.reason = sorted(filters.reasons);
  if (filters.locationIds.length) query.locationId = sorted(filters.locationIds);
  const { period } = filters;
  if (period.kind === 'days') query.days = period.days;
  else if (period.kind === 'month' || period.kind === 'previous-month') {
    Object.assign(query, monthRange(dayIn(timeZone, now), period.kind === 'month' ? 0 : -1));
  } else if (period.kind === 'range') {
    if (period.from) query.from = period.from;
    if (period.to) query.to = period.to;
  }
  return query;
}

/** Parámetros de la API, repetidos para varios valores. */
export function operationSearch(query: OperationQuery): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query) as Array<[string, string | number | string[] | undefined]>) {
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
    else if (value !== undefined) search.set(key, String(value));
  }
  return search;
}
