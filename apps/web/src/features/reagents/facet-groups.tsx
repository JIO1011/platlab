import type { OperationFacets } from '@platlab/contracts';
import { Skeleton } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState, type ComponentProps } from 'react';
import { FacetList, type FacetOption } from './facet-list';
import { FilterGroup, type ChosenOption } from './filter-group';
import { fold } from './fold';
import { toggle, type MovementFilters, type OperationQuery } from './movement-filters';
import { filterGroups, noName, selectedCount, tight, type FilterGroupId } from './movement-text';
import { useOperationFacets } from './queries';
import { useDebouncedValue } from './use-media-query';

type FoldingGroupId = Exclude<FilterGroupId, 'period' | 'type'>;

interface FacetSpec {
  id: FoldingGroupId;
  /** La lista de `MovementFilters` que marca el grupo. */
  filter: 'productIds' | 'responsibleIds' | 'destinations' | 'reasons' | 'locationIds';
  /** Nombre de las casillas de su lista. */
  name: string;
  /** Filas del esqueleto mientras llegan las opciones. */
  rows: number;
  /** Rótulo de lo elegido que ya no sale en las opciones; sin él, la propia clave. */
  fallback?: string;
}

/** Los grupos plegables, en el orden de `foldingGroups`. */
const facetSpecs: readonly FacetSpec[] = [
  { id: 'product', filter: 'productIds', name: 'reactivo', rows: 5, fallback: 'Reactivo' },
  { id: 'responsible', filter: 'responsibleIds', name: 'responsable', rows: 4, fallback: 'Responsable' },
  { id: 'destination', filter: 'destinations', name: 'destino', rows: 3 },
  { id: 'reason', filter: 'reasons', name: 'motivo', rows: 3 },
  { id: 'location', filter: 'locationIds', name: 'ubicacion', rows: 3, fallback: 'Ubicación' },
];

interface FacetOptions {
  /** Lo que se ve en la lista del grupo. */
  shown: FacetOption[];
  /** Todas sus opciones conocidas: dan el nombre de lo elegido aunque la búsqueda lo oculte. */
  known: FacetOption[];
  /** Buscador y espera de la lista: solo Reactivo busca en el servidor. */
  list: Pick<ComponentProps<typeof FacetList>, 'search' | 'loading'>;
}

const plain = (options: FacetOption[]): FacetOptions => ({ shown: options, known: options, list: {} });
const byValue = (option: { value: string; count: number }): FacetOption => ({ key: option.value, label: option.value, count: option.count });

// Solo el nombre: el código no ayuda a elegir, aunque la búsqueda lo siga entendiendo.
const byProduct = (option: { id: string; name: string; code: string; count: number }): FacetOption => ({
  key: option.id,
  label: tight(option.name),
  count: option.count,
});

/** Las opciones de cada grupo a partir de las facetas de la API y, en Reactivo, de su búsqueda. */
function useFacetOptions(
  workspaceId: string,
  query: OperationQuery,
  filters: MovementFilters,
  facets: UseQueryResult<OperationFacets>,
): Record<FoldingGroupId, FacetOptions> {
  const [productSearch, setProductSearch] = useState('');
  const typedProduct = useDebouncedValue(productSearch.trim(), 250);
  const data = facets.data;
  // Con más de 300 reactivos la lista local es parcial: la búsqueda se hace en el servidor (productQuery).
  const remoteSearch = typedProduct !== '' && (data?.products.more ?? false);
  const searched = useOperationFacets(workspaceId, query, typedProduct, remoteSearch);

  const needle = fold(typedProduct);
  const loaded = data?.products.options ?? [];
  const shownProducts =
    remoteSearch && searched.data
      ? searched.data.products.options.map(byProduct)
      : loaded
          .filter((option) => needle === '' || filters.productIds.includes(option.id) || fold(`${option.name} ${option.code}`).includes(needle))
          .map(byProduct);

  return {
    product: {
      shown: shownProducts,
      known: [...loaded, ...(searched.data?.products.options ?? [])].map(byProduct),
      list: {
        search: { value: productSearch, onChange: setProductSearch, label: 'Buscar reactivo' },
        loading: remoteSearch && searched.isFetching && !searched.data,
      },
    },
    responsible: plain((data?.responsibles ?? []).map((option) => ({ key: option.principalId, label: option.displayName ?? noName, count: option.count }))),
    destination: plain((data?.destinations ?? []).map(byValue)),
    reason: plain((data?.reasons ?? []).map(byValue)),
    location: plain((data?.locations ?? []).map((option) => ({ key: option.id, label: `${option.code} · ${option.name}`, count: option.count }))),
  };
}

function GroupSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-2 px-2 py-1.5" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}

/** Un grupo plegable de facetas: sus fichas elegidas plegado y, abierto, su lista de casillas con conteos. */
function FacetGroup({
  spec,
  options,
  filters,
  loading,
  open,
  onToggle,
  onChange,
}: {
  spec: FacetSpec;
  options: FacetOptions;
  filters: MovementFilters;
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (change: Partial<MovementFilters>) => void;
}) {
  const selected = filters[spec.filter];
  const change = (next: string[]) => onChange({ [spec.filter]: next });
  // Lo elegido, con su nombre (el de la opción; si ya no sale en las opciones, el del grupo).
  const chosen: ChosenOption[] = selected.map((key) => ({ key, label: options.known.find((option) => option.key === key)?.label ?? spec.fallback ?? key }));
  return (
    <FilterGroup
      id={spec.id}
      title={filterGroups.find((group) => group.id === spec.id)?.title ?? ''}
      marked={selectedCount(filters, spec.id)}
      chosen={chosen}
      open={open}
      onToggle={onToggle}
      onRemove={(key) => change(selected.filter((item) => item !== key))}
    >
      {loading ? (
        <GroupSkeleton rows={spec.rows} />
      ) : (
        <FacetList name={spec.name} options={options.shown} selected={selected} onToggle={(key) => change(toggle(selected, key))} {...options.list} />
      )}
    </FilterGroup>
  );
}

/** Los cinco grupos plegables del panel de filtros: Reactivo, Responsable, Destino, Motivo y Ubicación. */
export function FacetGroups({
  workspaceId,
  filters,
  query,
  facets,
  openGroup,
  onToggleGroup,
  onChange,
}: {
  workspaceId: string;
  filters: MovementFilters;
  query: OperationQuery;
  facets: UseQueryResult<OperationFacets>;
  /** El grupo plegable abierto: solo uno a la vez. */
  openGroup: FilterGroupId | null;
  onToggleGroup: (group: FilterGroupId) => void;
  onChange: (change: Partial<MovementFilters>) => void;
}) {
  const options = useFacetOptions(workspaceId, query, filters, facets);
  return (
    <>
      {facetSpecs.map((spec) => (
        <FacetGroup
          key={spec.id}
          spec={spec}
          options={options[spec.id]}
          filters={filters}
          loading={facets.isPending}
          open={openGroup === spec.id}
          onToggle={() => onToggleGroup(spec.id)}
          onChange={onChange}
        />
      ))}
    </>
  );
}
