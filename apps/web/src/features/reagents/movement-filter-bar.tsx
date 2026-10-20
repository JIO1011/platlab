import type { OperationFacets } from '@platlab/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import { FilterBar, type BarFilter } from '../../app/filter-bar';
import { useFacetFilters } from './facet-filters';
import type { MovementFilters, OperationQuery } from './movement-filters';
import { periodText, typeOrder, typePlural } from './movement-text';
import { PeriodMenu } from './period-section';

/**
 * Filtros de Movimientos (R-01C, ADR 0021): «Periodo · Tipo · Reactivo · Responsable · Destino · Motivo · Ubicación» en
 * una barra sobre la lista, cada uno con su menú y sus cuentas. Se aplican al marcarlos y escriben la URL; este archivo
 * solo dice cuáles son. Las cuentas llegan con las facetas de la API.
 */
export function MovementFilterBar({
  workspaceId,
  filters,
  query,
  facets,
  currentYear,
  onChange,
  onClear,
}: {
  workspaceId: string;
  filters: MovementFilters;
  query: OperationQuery;
  facets: UseQueryResult<OperationFacets>;
  currentYear: number;
  onChange: (change: Partial<MovementFilters>) => void;
  onClear: () => void;
}) {
  const typeCounts = facets.data ? new Map(facets.data.types.map((entry) => [entry.value, entry.count])) : null;
  const facetFilters = useFacetFilters(workspaceId, query, filters, facets, onChange);
  const bar: BarFilter[] = [
    {
      kind: 'custom',
      id: 'periodo',
      label: 'Periodo',
      chosen: filters.period.kind === 'all' ? [] : [periodText(filters.period, currentYear)],
      body: <PeriodMenu period={filters.period} onChange={(period) => onChange({ period })} />,
    },
    {
      kind: 'options',
      id: 'tipo',
      label: 'Tipo',
      // Orden fijo: son cuatro y no deben cambiar de sitio al marcarlos.
      options: typeOrder.map((type) => ({ value: type, label: typePlural[type], count: typeCounts ? (typeCounts.get(type) ?? 0) : undefined })),
      countLabel: 'movimientos',
      selected: filters.types,
      onChange: (next) => onChange({ types: typeOrder.filter((type) => next.includes(type)) }),
    },
    ...facetFilters,
  ];
  return <FilterBar label="Filtros de movimientos" filters={bar} onClear={onClear} />;
}
