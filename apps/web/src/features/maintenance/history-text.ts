import type { WorkKind } from '@platlab/contracts';
import { formatShortDate } from '../../app/format';
import { INTERNAL, type HistoryFilters } from './history-filters';
import { kindLabels, noPlanText, resultLabels, titleWithKind } from './work-text';

/** Lo que el Historial llama por su nombre, además de lo que ya dice el contrato. */
export interface HistoryNames {
  /** «CÓDIGO Nombre» del equipo del filtro `?equipo=`; sin dato mientras llega. */
  asset: string | undefined;
  /** Áreas y proveedores por id; sin dato, el valor se dice «no disponible». */
  areas: ReadonlyMap<string, string>;
  providers: ReadonlyMap<string, string>;
}

/**
 * Un filtro activo, una ficha por valor. `remove` es lo que hay que aplicar a los filtros para quitarlo: el
 * periodo, al ser una sola ficha, quita sus dos extremos.
 */
export interface ActiveFilter {
  key: string;
  /** El grupo al que pertenece («Resultado»): va delante en la ficha y en el nombre del botón que la quita. */
  group: string;
  label: string;
  remove: Partial<HistoryFilters>;
}

const countFormat = new Intl.NumberFormat('es-EC');

/** «45 registros», «1 registro»; con `more`, «1.000+ registros»: hay más páginas que las cargadas. */
export function recordsText(count: number, more: boolean): string {
  return `${countFormat.format(count)}${more ? '+' : ''} ${count === 1 && !more ? 'registro' : 'registros'}`;
}

/** El periodo en palabras, con los extremos incluidos; sin extremos, nada. */
export function periodText(from: string | null, to: string | null): string | null {
  if (from && to) return `Del ${formatShortDate(from)} al ${formatShortDate(to)}`;
  if (from) return `Desde el ${formatShortDate(from)}`;
  if (to) return `Hasta el ${formatShortDate(to)}`;
  return null;
}

/**
 * Los filtros aplicados, por grupo y en el orden del panel (el equipo no entra: tiene su propio aviso). Cada uno
 * dice cómo quitarse. Con lo que ya hay en la URL basta: las fichas, el panel y la hoja impresa dicen lo mismo.
 */
export function activeHistoryFilters(filters: HistoryFilters, names: HistoryNames): ActiveFilter[] {
  const period = periodText(filters.from, filters.to);
  return [
    ...(period ? [{ key: 'period', group: 'Periodo', label: period, remove: { from: null, to: null } }] : []),
    ...filters.kinds.map((kind) => ({
      key: `k-${kind}`,
      group: 'Tipo de trabajo',
      label: kindLabels[kind],
      remove: { kinds: filters.kinds.filter((entry) => entry !== kind) },
    })),
    ...filters.results.map((result) => ({
      key: `r-${result}`,
      group: 'Resultado',
      label: resultLabels[result],
      remove: { results: filters.results.filter((entry) => entry !== result) },
    })),
    ...filters.areas.map((id) => ({
      key: `a-${id}`,
      group: 'Área',
      label: names.areas.get(id) ?? 'Área no disponible',
      remove: { areas: filters.areas.filter((entry) => entry !== id) },
    })),
    ...filters.providers.map((id) => ({
      key: `p-${id}`,
      group: 'Quién lo hizo',
      label: id === INTERNAL ? 'Interno' : (names.providers.get(id) ?? 'Proveedor no disponible'),
      remove: { providers: filters.providers.filter((entry) => entry !== id) },
    })),
  ];
}

/** Los filtros en palabras para la hoja impresa, una línea por grupo: «Resultado: Conforme, No conforme». */
export function historyFilterLines(filters: HistoryFilters, names: HistoryNames): string[] {
  const groups = new Map<string, string[]>();
  for (const filter of activeHistoryFilters(filters, names)) groups.set(filter.group, [...(groups.get(filter.group) ?? []), filter.label]);
  const lines = [...groups].map(([group, labels]) => `${group}: ${labels.join(', ')}`);
  return filters.assetId ? [`Equipo: ${names.asset ?? 'el elegido'}`, ...lines] : lines;
}

/** El trabajo de un registro en la hoja impresa: el plan con su tipo o «sin plan»; un anulado lo dice. */
export function printedWork(record: { plan: { title: string } | null; kind: WorkKind; voided: object | null }): string {
  const work = record.plan ? titleWithKind(record.plan.title, record.kind) : noPlanText(record.kind);
  return record.voided ? `${work} (anulado)` : work;
}
