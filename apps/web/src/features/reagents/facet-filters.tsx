import type { OperationFacets } from '@platlab/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState, type ComponentProps } from 'react';
import { FacetList, type FacetOption } from './facet-list';
import type { BarFilter } from '../../app/filter-bar';
import { fold } from '../../app/fold';
import { toggle, type MovementFilters, type OperationQuery } from './movement-filters';
import { noName, tight } from './movement-text';
import { useOperationFacets } from './queries';
import { useDebouncedValue } from '../../app/use-media-query';

type FacetId = 'product' | 'responsible' | 'destination' | 'reason' | 'location';

interface FacetSpec {
  id: FacetId;
  /** Su nombre, el que dice el botón de la barra. */
  title: string;
  /** La lista de `MovementFilters` que marca el filtro. */
  filter: 'productIds' | 'responsibleIds' | 'destinations' | 'reasons' | 'locationIds';
  /** Nombre de las casillas de su lista. */
  name: string;
  /** Rótulo de lo elegido que ya no sale en las opciones; sin él, la propia clave. */
  fallback?: string;
}

/** Los cinco filtros con lista de la barra, en su orden. */
const facetSpecs: readonly FacetSpec[] = [
  { id: 'product', title: 'Reactivo', filter: 'productIds', name: 'reactivo', fallback: 'Reactivo' },
  { id: 'responsible', title: 'Responsable', filter: 'responsibleIds', name: 'responsable', fallback: 'Responsable' },
  { id: 'destination', title: 'Destino', filter: 'destinations', name: 'destino' },
  { id: 'reason', title: 'Motivo', filter: 'reasons', name: 'motivo' },
  { id: 'location', title: 'Ubicación', filter: 'locationIds', name: 'ubicacion', fallback: 'Ubicación' },
];

interface FacetOptions {
  /** Lo que se ve en la lista del menú. */
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

/** Las opciones de cada filtro a partir de las facetas de la API y, en Reactivo, de su búsqueda. */
function useFacetOptions(
  workspaceId: string,
  query: OperationQuery,
  filters: MovementFilters,
  facets: UseQueryResult<OperationFacets>,
): Record<FacetId, FacetOptions> {
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

/**
 * Reactivo, Responsable, Destino, Motivo y Ubicación como filtros de la barra (ADR 0021): cada uno con su lista de
 * casillas, buscador y cuentas. Lo elegido lleva su nombre en el botón; mientras llegan las facetas, la lista dice que carga.
 */
export function useFacetFilters(
  workspaceId: string,
  query: OperationQuery,
  filters: MovementFilters,
  facets: UseQueryResult<OperationFacets>,
  onChange: (change: Partial<MovementFilters>) => void,
): BarFilter[] {
  const options = useFacetOptions(workspaceId, query, filters, facets);
  return facetSpecs.map((spec) => {
    const selected = filters[spec.filter];
    const { shown, known, list } = options[spec.id];
    return {
      kind: 'custom',
      id: spec.id,
      label: spec.title,
      // Lo elegido, con su nombre (el de la opción; si ya no sale en las opciones, el del filtro).
      chosen: selected.map((key) => known.find((option) => option.key === key)?.label ?? spec.fallback ?? key),
      body: (
        <FacetList
          name={spec.name}
          options={shown}
          selected={selected}
          onToggle={(key) => onChange({ [spec.filter]: toggle(selected, key) })}
          {...list}
          loading={facets.isPending || (list.loading ?? false)}
        />
      ),
    };
  });
}
