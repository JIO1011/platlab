import type { OperationFacets } from '@platlab/contracts';
import { addDays } from '../../app/format';
import type { MovementFilters } from './movement-filters';

/** Grupos del panel de filtros de Movimientos, en el orden en que se muestran (R-01C). */
export type FilterGroupId = 'period' | 'type' | 'product' | 'responsible' | 'destination' | 'reason' | 'location';

export const filterGroups: ReadonlyArray<{ id: FilterGroupId; title: string }> = [
  { id: 'period', title: 'Periodo' },
  { id: 'type', title: 'Tipo' },
  { id: 'product', title: 'Reactivo' },
  { id: 'responsible', title: 'Responsable' },
  { id: 'destination', title: 'Destino' },
  { id: 'reason', title: 'Motivo' },
  { id: 'location', title: 'Ubicación' },
];

export const defaultOpenGroups: readonly FilterGroupId[] = ['period', 'type', 'product', 'responsible'];

type OperationType = MovementFilters['types'][number];

/** Orden fijo de los tipos: son cuatro y no deben cambiar de sitio al marcarlos. */
export const typeOrder: readonly OperationType[] = ['receipt', 'issue', 'adjustment', 'transfer'];
export const typePlural: Record<OperationType, string> = {
  receipt: 'Ingresos',
  issue: 'Salidas',
  adjustment: 'Ajustes',
  transfer: 'Traslados',
};

export const noName = 'Sin nombre';

/** Espacio duro antes de «%» para que «37 %» no se parta entre líneas. */
export const tight = (name: string): string => name.replace(/ %/g, '\u00A0%');

/** «A, B y C». */
function joinList(items: readonly string[]): string {
  return new Intl.ListFormat('es-EC', { style: 'long', type: 'conjunction' }).format(items);
}

export const countFormat = new Intl.NumberFormat('es-EC');

export function movementsText(total: number): string {
  return `${countFormat.format(total)} ${total === 1 ? 'movimiento' : 'movimientos'}`;
}

function isoToDate(iso: string): Date {
  const [year = 1970, month = 1, day = 1] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** El periodo en palabras, para la ficha y la cabecera: «Este mes», «Últimos 7 días», «1–15 mar». */
export function periodText(period: MovementFilters['period'], currentYear: number): string {
  switch (period.kind) {
    case 'all':
      return 'Todo el historial';
    case 'days':
      return `Últimos ${period.days} días`;
    case 'month':
      return 'Este mes';
    case 'previous-month':
      return 'Mes anterior';
    case 'range': {
      const { from, to } = period;
      const dates = [from, to].filter((value): value is string => value !== null);
      const withYear = dates.some((value) => Number(value.slice(0, 4)) !== currentYear);
      const short = new Intl.DateTimeFormat('es-EC', { timeZone: 'UTC', day: 'numeric', month: 'short' });
      const parts = (iso: string) => {
        const found = short.formatToParts(isoToDate(iso));
        return { day: found.find((part) => part.type === 'day')?.value ?? '', month: found.find((part) => part.type === 'month')?.value ?? '' };
      };
      const one = (iso: string) => {
        const { day, month } = parts(iso);
        return `${day} ${month}${withYear ? ` ${iso.slice(0, 4)}` : ''}`;
      };
      if (from && to) {
        if (from === to) return one(from);
        const start = parts(from);
        const end = parts(to);
        // Un mismo mes se dice una vez: «15–20 mar».
        if (from.slice(0, 7) === to.slice(0, 7)) return `${start.day}–${end.day} ${end.month}${withYear ? ` ${to.slice(0, 4)}` : ''}`;
        return `${one(from)} – ${one(to)}`;
      }
      if (from) return `Desde ${one(from)}`;
      return to ? `Hasta ${one(to)}` : 'Todo el historial';
    }
  }
}

/** «Marzo 2026» para un mes `AAAA-MM`. */
export function monthHeading(key: string): string {
  const [year = 1970, month = 1] = key.split('-').map(Number);
  const text = new Intl.DateTimeFormat('es-EC', { timeZone: 'UTC', month: 'long', year: 'numeric' })
    .formatToParts(new Date(Date.UTC(year, month - 1, 1, 12)))
    .filter((part) => part.type === 'month' || part.type === 'year')
    .map((part) => part.value)
    .join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Primer y último día de un mes `AAAA-MM`, para abrir sus movimientos en Detalle. */
export function monthBounds(key: string): { from: string; to: string } {
  const [year = 1970, month = 1] = key.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { from: first, to: addDays(next, -1) };
}

/** Cuántos grupos del panel tienen algo marcado. */
export function selectedCount(filters: MovementFilters, group: FilterGroupId): number {
  switch (group) {
    case 'period':
      return filters.period.kind === 'all' ? 0 : 1;
    case 'type':
      return filters.types.length;
    case 'product':
      return filters.productIds.length;
    case 'responsible':
      return filters.responsibleIds.length;
    case 'destination':
      return filters.destinations.length;
    case 'reason':
      return filters.reasons.length;
    case 'location':
      return filters.locationIds.length;
  }
}

export const activeGroups = (filters: MovementFilters): FilterGroupId[] =>
  filterGroups.map((group) => group.id).filter((id) => selectedCount(filters, id) > 0);

/** Lo que cada grupo vuelve a «sin filtro» al quitar su ficha. */
export function clearedGroup(group: FilterGroupId): Partial<MovementFilters> {
  switch (group) {
    case 'period':
      return { period: { kind: 'all' } };
    case 'type':
      return { types: [] };
    case 'product':
      return { productIds: [] };
    case 'responsible':
      return { responsibleIds: [] };
    case 'destination':
      return { destinations: [] };
    case 'reason':
      return { reasons: [] };
    case 'location':
      return { locationIds: [] };
  }
}

/** Texto de la ficha de un grupo activo: el valor si es uno solo y «n elegidos» si son varios. */
export function chipText(filters: MovementFilters, group: FilterGroupId, facets: OperationFacets | undefined, currentYear: number): string {
  const title = filterGroups.find((entry) => entry.id === group)?.title ?? '';
  const one = (name: string | undefined, count: number) => (count === 1 && name ? `${title}: ${name}` : `${title}: ${count} elegidos`);
  switch (group) {
    case 'period':
      return periodText(filters.period, currentYear);
    case 'type':
      return `${title}: ${joinList(typeOrder.filter((type) => filters.types.includes(type)).map((type) => typePlural[type]))}`;
    case 'product': {
      const found = facets?.products.options.find((option) => option.id === filters.productIds[0]);
      return one(found?.name, filters.productIds.length);
    }
    case 'responsible': {
      const found = facets?.responsibles.find((option) => option.principalId === filters.responsibleIds[0]);
      return one(found ? (found.displayName ?? noName) : undefined, filters.responsibleIds.length);
    }
    case 'destination':
      return one(filters.destinations[0], filters.destinations.length);
    case 'reason':
      return one(filters.reasons[0], filters.reasons.length);
    case 'location': {
      const found = facets?.locations.find((option) => option.id === filters.locationIds[0]);
      return one(found?.code, filters.locationIds.length);
    }
  }
}
