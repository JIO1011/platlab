import {
  conservationLabel,
  usefulLifeStateLabel,
  warrantyStateLabel,
  type AssetCondition,
  type AssetTypeList,
  type DepartmentList,
  type ResponsibleList,
} from '@platlab/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import { FilterBar, type BarFilter } from '../../app/filter-bar';
import { childrenOf, levelOneParent, type Place } from '../../app/places';
import type { AssetQuery } from './asset-filters';
import { NO_RESPONSIBLE, conditionLabel, noResponsibleLabel } from './asset-text';

/** Los estados que se ven y, aparte, el que ya no cuenta como equipo en uso. */
const conditions: AssetCondition[] = ['operational', 'restricted', 'faulted', 'retired'];

/** Las opciones de un grupo cerrado, en el orden en que su tabla de etiquetas las declara («Sin dato» al final). */
const optionsOf = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

const conditionOptions = conditions.map((value) => ({ value, label: conditionLabel[value] }));
const conservationOptions = optionsOf({ ...conservationLabel, none: 'Sin dato' });
const warrantyOptions = optionsOf(warrantyStateLabel);
const usefulLifeOptions = optionsOf(usefulLifeStateLabel);

const queryState = (query: UseQueryResult<unknown>) => (query.isPending ? 'loading' : query.isError ? 'error' : 'ready');

/**
 * Filtros del Informe de equipos (ADR 0019, 0021): «Estado · Tipo · Ubicación · Responsable · Departamento · Estado físico ·
 * Garantía · Vida útil» en la barra horizontal común, cada uno con su menú de casillas. Se aplican al marcarlos y
 * escriben la URL; este archivo solo dice cuáles son. Estado lleva «Dado de baja» entre sus opciones con su aviso;
 * Ubicación ofrece el primer nivel bajo la sede con sus hijas («Sala › lugar»); Responsable suma «Sin responsable»;
 * Estado físico, Garantía y Vida útil traen su «Sin dato» (E-01c).
 */
export function AssetFilterBar({
  query,
  types,
  responsibles,
  departments,
  places,
  placesFailed,
  onRetryPlaces,
  onChange,
  onClear,
}: {
  query: AssetQuery;
  types: UseQueryResult<AssetTypeList>;
  responsibles: UseQueryResult<ResponsibleList>;
  departments: UseQueryResult<DepartmentList>;
  /** Las ubicaciones del árbol de Core; `undefined` mientras llegan. */
  places: Place[] | undefined;
  placesFailed: boolean;
  onRetryPlaces: () => void;
  onChange: (change: Partial<AssetQuery>) => void;
  onClear: () => void;
}) {
  const levelOne = places ? childrenOf(places, levelOneParent(places)) : [];
  const placeOptions = levelOne.flatMap((room) => [
    { value: room.id, label: room.name },
    ...childrenOf(places ?? [], room.id).map((place) => ({ value: place.id, label: `${room.name} › ${place.name}` })),
  ]);
  const responsibleOptions = [
    { value: NO_RESPONSIBLE, label: noResponsibleLabel },
    ...(responsibles.data?.items ?? []).map((member) => ({ value: member.id, label: member.name })),
  ];
  const bar: BarFilter[] = [
    {
      kind: 'options',
      id: 'condicion',
      label: 'Estado',
      note: 'Los dados de baja solo aparecen si los eliges.',
      options: conditionOptions,
      selected: query.conditions,
      onChange: (next) => onChange({ conditions: next as AssetCondition[] }),
    },
    {
      kind: 'options',
      id: 'tipo',
      label: 'Tipo',
      options: (types.data?.items ?? []).map((type) => ({ value: type.id, label: type.name })),
      selected: query.types,
      onChange: (next) => onChange({ types: next }),
      state: queryState(types),
      what: 'los tipos',
      empty: 'Aún no hay tipos de equipo.',
      onRetry: () => void types.refetch(),
    },
    {
      kind: 'options',
      id: 'ubicacion',
      label: 'Ubicación',
      note: 'Elegir una sala incluye lo que hay dentro.',
      options: placeOptions,
      selected: query.locations,
      onChange: (next) => onChange({ locations: next }),
      state: places === undefined ? (placesFailed ? 'error' : 'loading') : 'ready',
      what: 'las ubicaciones',
      empty: 'Aún no hay ubicaciones.',
      onRetry: onRetryPlaces,
    },
    {
      kind: 'options',
      id: 'responsable',
      label: 'Responsable',
      options: responsibleOptions,
      selected: query.responsibles,
      onChange: (next) => onChange({ responsibles: next }),
      state: responsibles.isPending ? 'loading' : responsibles.isError ? 'error' : 'ready',
      what: 'los responsables',
      onRetry: () => void responsibles.refetch(),
    },
    {
      kind: 'options',
      id: 'departamento',
      label: 'Departamento',
      options: (departments.data?.items ?? []).map((department) => ({ value: department.id, label: department.name })),
      selected: query.departments,
      onChange: (next) => onChange({ departments: next }),
      state: queryState(departments),
      what: 'los departamentos',
      empty: 'Aún no hay departamentos. El Administrador los crea en Áreas.',
      onRetry: () => void departments.refetch(),
    },
    {
      kind: 'options',
      id: 'estado-fisico',
      label: 'Estado físico',
      options: conservationOptions,
      selected: query.conservations,
      onChange: (next) => onChange({ conservations: next as AssetQuery['conservations'] }),
    },
    {
      kind: 'options',
      id: 'garantia',
      label: 'Garantía',
      options: warrantyOptions,
      selected: query.warranties,
      onChange: (next) => onChange({ warranties: next as AssetQuery['warranties'] }),
    },
    {
      kind: 'options',
      id: 'vida-util',
      label: 'Vida útil',
      options: usefulLifeOptions,
      selected: query.usefulLives,
      onChange: (next) => onChange({ usefulLives: next as AssetQuery['usefulLives'] }),
    },
  ];
  return <FilterBar label="Filtros del informe" filters={bar} onClear={onClear} />;
}
