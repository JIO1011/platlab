import { conservationLabel, usefulLifeStateLabel, warrantyStateLabel } from '@platlab/contracts';
import type { AssetQuery } from './asset-filters';
import { conditionLabel, noResponsibleLabel, NO_RESPONSIBLE } from './asset-text';

/** Un filtro puesto, dicho en palabras: su grupo («Estado») y su valor. Lo lista la vista imprimible del Informe. */
export interface ActiveFilter {
  key: string;
  group: string;
  label: string;
}

/** Los nombres de lo que los filtros guardan por id; mientras llegan, el nombre del grupo. */
export interface FilterNames {
  types: ReadonlyMap<string, string>;
  places: ReadonlyMap<string, string>;
  responsibles: ReadonlyMap<string, string>;
}

/** Los filtros puestos en la consulta, en el orden de la barra («Búsqueda» primero). */
export function activeFilters(query: AssetQuery, names: FilterNames): ActiveFilter[] {
  return [
    ...(query.q ? [{ key: 'q', group: 'Búsqueda', label: `«${query.q}»` }] : []),
    ...query.conditions.map((condition) => ({ key: `c-${condition}`, group: 'Estado', label: conditionLabel[condition] })),
    ...query.types.map((id) => ({ key: `t-${id}`, group: 'Tipo', label: names.types.get(id) ?? 'Tipo' })),
    ...query.locations.map((id) => ({ key: `u-${id}`, group: 'Ubicación', label: names.places.get(id) ?? 'Ubicación' })),
    ...query.responsibles.map((id) => ({
      key: `r-${id}`,
      group: 'Responsable',
      label: id === NO_RESPONSIBLE ? noResponsibleLabel : (names.responsibles.get(id) ?? 'Responsable'),
    })),
    ...query.conservations.map((value) => ({ key: `f-${value}`, group: 'Estado físico', label: value === 'none' ? 'Sin dato' : conservationLabel[value] })),
    ...query.warranties.map((value) => ({ key: `g-${value}`, group: 'Garantía', label: warrantyStateLabel[value] })),
    ...query.usefulLives.map((value) => ({ key: `v-${value}`, group: 'Vida útil', label: usefulLifeStateLabel[value] })),
  ];
}
