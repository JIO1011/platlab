import type { MaintenanceAreaList, ProviderList, WorkKind, WorkResult } from '@platlab/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import { FilterBar, type BarFilter } from '../../app/filter-bar';
import { INTERNAL, type HistoryFilters } from './history-filters';
import { kindLabels, resultLabels } from './work-text';

const kindOptions = (Object.keys(kindLabels) as WorkKind[]).map((value) => ({ value, label: kindLabels[value] }));
const resultOptions = (Object.keys(resultLabels) as WorkResult[]).map((value) => ({ value, label: resultLabels[value] }));

const queryState = (query: UseQueryResult<unknown>) => (query.isPending ? 'loading' : query.isError ? 'error' : 'ready');

/**
 * Filtros del Historial (M-01d, ADR 0021): «Periodo · Tipo · Resultado · Área · Quién lo hizo» en una barra sobre la
 * lista, cada uno con su menú. Se aplican al marcarlos y escriben la URL; este archivo solo dice cuáles son.
 */
export function HistoryFilterBar({
  filters,
  areas,
  providers,
  onChange,
  onClear,
}: {
  filters: HistoryFilters;
  areas: UseQueryResult<MaintenanceAreaList>;
  providers: UseQueryResult<ProviderList>;
  onChange: (change: Partial<HistoryFilters>) => void;
  onClear: () => void;
}) {
  const areaOptions = (areas.data?.items ?? []).map((area) => ({ value: area.id, label: area.name }));
  // «Interno» primero: es el trabajo sin proveedor.
  const providerOptions = [{ value: INTERNAL, label: 'Interno' }, ...(providers.data?.items ?? []).map((provider) => ({ value: provider.id, label: provider.name }))];
  const bar: BarFilter[] = [
    { kind: 'period', id: 'periodo', label: 'Periodo', from: filters.from, to: filters.to, onChange },
    { kind: 'options', id: 'tipo', label: 'Tipo', options: kindOptions, selected: filters.kinds, onChange: (kinds) => onChange({ kinds: kinds as WorkKind[] }) },
    { kind: 'options', id: 'resultado', label: 'Resultado', options: resultOptions, selected: filters.results, onChange: (results) => onChange({ results: results as WorkResult[] }) },
    {
      kind: 'options',
      id: 'area',
      label: 'Área',
      options: areaOptions,
      selected: filters.areas,
      onChange: (next) => onChange({ areas: next }),
      state: queryState(areas),
      what: 'las áreas',
      empty: 'Aún no hay equipos con área.',
      onRetry: () => void areas.refetch(),
    },
    {
      kind: 'options',
      id: 'proveedor',
      label: 'Quién lo hizo',
      options: providerOptions,
      selected: filters.providers,
      onChange: (next) => onChange({ providers: next }),
      // «Interno» está siempre: solo los proveedores esperan.
      state: providers.isError ? 'error' : 'ready',
      what: 'los proveedores',
      onRetry: () => void providers.refetch(),
    },
  ];
  return <FilterBar label="Filtros del historial" filters={bar} onClear={onClear} />;
}
