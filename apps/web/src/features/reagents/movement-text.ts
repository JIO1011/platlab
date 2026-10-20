import type { OperationFacets, OperationGroupBy } from '@platlab/contracts';
import { addDays, todayInZone } from '../../app/format';
import type { MovementFilters } from './movement-filters';

/** Grupos de filtros de Movimientos, en el orden de la barra (R-01C, ADR 0021). */
type FilterGroupId = 'period' | 'type' | 'product' | 'responsible' | 'destination' | 'reason' | 'location';

const filterGroups: ReadonlyArray<{ id: FilterGroupId; title: string }> = [
  { id: 'period', title: 'Periodo' },
  { id: 'type', title: 'Tipo' },
  { id: 'product', title: 'Reactivo' },
  { id: 'responsible', title: 'Responsable' },
  { id: 'destination', title: 'Destino' },
  { id: 'reason', title: 'Motivo' },
  { id: 'location', title: 'Ubicación' },
];

type OperationType = MovementFilters['types'][number];

/** Orden fijo de los tipos: son cuatro y no deben cambiar de sitio al marcarlos. */
export const typeOrder: readonly OperationType[] = ['receipt', 'issue', 'adjustment', 'transfer'];
export const typePlural: Record<OperationType, string> = {
  receipt: 'Ingresos',
  issue: 'Salidas',
  adjustment: 'Ajustes',
  transfer: 'Traslados',
};

/** El tipo en singular, como se lee en el libro y en el informe impreso. */
export const typeSingular: Record<OperationType, string> = {
  receipt: 'Ingreso',
  issue: 'Salida',
  adjustment: 'Ajuste',
  transfer: 'Traslado',
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

/** El periodo en palabras, para su botón y la cabecera: «Este mes», «Últimos 7 días», «1–15 mar». */
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

/**
 * Los filtros activos en palabras, uno por grupo, para el encabezado del informe impreso: a diferencia de
 * los botones de la barra, nombra todos los valores. Un valor que ya no sale en las opciones se cuenta («2 reactivos»).
 */
export function filterLines(
  filters: MovementFilters,
  facets: OperationFacets | undefined,
  productName: (id: string) => string | undefined,
): string[] {
  const named = (title: string, names: ReadonlyArray<string | undefined>, noun: string) => {
    const found = names.filter((name): name is string => name !== undefined);
    return `${title}: ${found.length === names.length ? joinList(found) : `${names.length} ${noun}`}`;
  };
  return activeGroups(filters)
    .filter((group) => group !== 'period')
    .map((group) => {
      const title = filterGroups.find((entry) => entry.id === group)?.title ?? '';
      switch (group) {
        case 'type':
          return `${title}: ${joinList(typeOrder.filter((type) => filters.types.includes(type)).map((type) => typePlural[type]))}`;
        case 'product':
          return named(title, filters.productIds.map(productName), 'reactivos');
        case 'responsible':
          return named(
            title,
            filters.responsibleIds.map((id) => {
              const found = facets?.responsibles.find((option) => option.principalId === id);
              return found ? (found.displayName ?? noName) : undefined;
            }),
            'responsables',
          );
        case 'destination':
          return `${title}: ${joinList(filters.destinations)}`;
        case 'reason':
          return `${title}: ${joinList(filters.reasons)}`;
        default:
          return named(
            title,
            filters.locationIds.map((id) => {
              const found = facets?.locations.find((option) => option.id === id);
              return found ? `${found.code} · ${found.name}` : undefined;
            }),
            'ubicaciones',
          );
      }
    });
}

/** Hora «15:32» de un instante en la zona del espacio. */
export function hourOf(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-EC', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

/** Cómo se llama cada agrupación de Totales. */
export const groupNames: Record<OperationGroupBy, string> = {
  product: 'Reactivo',
  responsible: 'Responsable',
  destination: 'Destino',
  month: 'Mes',
};

/** El año en curso en la zona del espacio: el periodo lo omite cuando es este. */
export const currentYearIn = (timeZone: string): number => Number(todayInZone(timeZone).slice(0, 4));

/** Cuántos valores tiene marcados un grupo. */
function selectedCount(filters: MovementFilters, group: FilterGroupId): number {
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

/** Los grupos con algo marcado: sirven para saber si la lista está filtrada y para el encabezado impreso. */
export const activeGroups = (filters: MovementFilters): FilterGroupId[] =>
  filterGroups.map((group) => group.id).filter((id) => selectedCount(filters, id) > 0);
