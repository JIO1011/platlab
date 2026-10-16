import type { AssetCondition, AssetTypeList } from '@platlab/contracts';
import { Button, OptionRow, Skeleton } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { FilterGroup, type ChosenOption } from '../../app/filter-group';
import { childrenOf, levelOneParent, type Place } from '../../app/places';
import type { AssetQuery } from './asset-filters';
import { conditionLabel } from './asset-text';

export type AssetGroupId = 'condition' | 'type' | 'location';

/** Las condiciones que se ven y, aparte, la que ya no cuenta como equipo en uso. */
const activeConditions: AssetCondition[] = ['operational', 'restricted', 'faulted'];

const toggle = <T,>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

function OptionsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-2 px-2 py-1.5" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}

function OptionsError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="grid justify-items-start gap-1 px-2 py-1.5">
      <p role="alert" className="text-[13px] text-ink-muted">
        No se pudieron cargar {what}.
      </p>
      <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/**
 * Panel de filtros del Inventario (ADR 0019), con el mismo lenguaje que el de Movimientos: grupos
 * plegables de uno en uno, casillas como el filtro de Excel y aplicación inmediata (cada cambio escribe
 * la URL). Condición lleva «Dados de baja» aparte; Ubicación ofrece el primer nivel bajo la sede con sus hijas.
 * Es el mismo contenido en el panel de escritorio y en el cajón.
 */
export function AssetFilterPanel({
  query,
  types,
  places,
  placesFailed,
  onRetryPlaces,
  openGroup,
  onToggleGroup,
  onChange,
}: {
  query: AssetQuery;
  types: UseQueryResult<AssetTypeList>;
  /** Las ubicaciones del árbol de Core; `undefined` mientras llegan. */
  places: Place[] | undefined;
  placesFailed: boolean;
  onRetryPlaces: () => void;
  /** El grupo plegable abierto: solo uno a la vez. */
  openGroup: AssetGroupId | null;
  onToggleGroup: (group: AssetGroupId) => void;
  onChange: (change: Partial<AssetQuery>) => void;
}) {
  const typeNames = new Map((types.data?.items ?? []).map((type) => [type.id, type.name]));
  const placeNames = new Map((places ?? []).map((place) => [place.id, place.name]));
  const levelOne = places ? childrenOf(places, levelOneParent(places)) : [];

  const conditionChosen: ChosenOption[] = query.conditions.map((key) => ({ key, label: conditionLabel[key] }));
  const typeChosen: ChosenOption[] = query.types.map((key) => ({ key, label: typeNames.get(key) ?? 'Tipo' }));
  const locationChosen: ChosenOption[] = query.locations.map((key) => ({ key, label: placeNames.get(key) ?? 'Ubicación' }));

  const toggleCondition = (condition: AssetCondition) => onChange({ conditions: toggle(query.conditions, condition) });
  const toggleLocation = (id: string) => onChange({ locations: toggle(query.locations, id) });

  return (
    <div>
      <FilterGroup
        id="condition"
        title="Condición"
        marked={query.conditions.length}
        chosen={conditionChosen}
        open={openGroup === 'condition'}
        onToggle={() => onToggleGroup('condition')}
        onRemove={(key) => onChange({ conditions: query.conditions.filter((condition) => condition !== key) })}
      >
        {activeConditions.map((condition) => (
          <OptionRow
            key={condition}
            name="condicion"
            checked={query.conditions.includes(condition)}
            onChange={() => toggleCondition(condition)}
          >
            {conditionLabel[condition]}
          </OptionRow>
        ))}
        {/* Los dados de baja no cuentan entre los equipos en uso: aparte, y solo salen si se eligen. */}
        <div className="mt-1 border-t border-line pt-1">
          <OptionRow name="condicion" checked={query.conditions.includes('retired')} onChange={() => toggleCondition('retired')}>
            {conditionLabel.retired}
          </OptionRow>
          <p className="px-2 pb-1 pl-[1.625rem] text-[13px] text-ink-subtle">Solo aparecen si los eliges.</p>
        </div>
      </FilterGroup>

      <FilterGroup
        id="type"
        title="Tipo"
        marked={query.types.length}
        chosen={typeChosen}
        open={openGroup === 'type'}
        onToggle={() => onToggleGroup('type')}
        onRemove={(key) => onChange({ types: query.types.filter((type) => type !== key) })}
      >
        {types.isPending ? (
          <OptionsSkeleton rows={4} />
        ) : types.isError ? (
          <OptionsError what="los tipos" onRetry={() => void types.refetch()} />
        ) : types.data.items.length === 0 ? (
          <p className="px-2 py-1.5 text-[13px] text-ink-subtle">Aún no hay tipos de equipo.</p>
        ) : (
          types.data.items.map((type) => (
            <OptionRow
              key={type.id}
              name="tipo"
              checked={query.types.includes(type.id)}
              onChange={() => onChange({ types: toggle(query.types, type.id) })}
            >
              {type.name}
            </OptionRow>
          ))
        )}
      </FilterGroup>

      <FilterGroup
        id="location"
        title="Ubicación"
        marked={query.locations.length}
        chosen={locationChosen}
        open={openGroup === 'location'}
        onToggle={() => onToggleGroup('location')}
        onRemove={(key) => onChange({ locations: query.locations.filter((location) => location !== key) })}
      >
        {places === undefined ? (
          placesFailed ? (
            <OptionsError what="las ubicaciones" onRetry={onRetryPlaces} />
          ) : (
            <OptionsSkeleton rows={5} />
          )
        ) : levelOne.length === 0 ? (
          <p className="px-2 py-1.5 text-[13px] text-ink-subtle">Aún no hay ubicaciones.</p>
        ) : (
          <>
            <p className="px-2 pb-1 text-[13px] text-ink-subtle">Elegir una sala incluye lo que hay dentro.</p>
            {levelOne.map((room) => {
              const inside = childrenOf(places, room.id);
              return (
                <div key={room.id}>
                  <OptionRow name="ubicacion" checked={query.locations.includes(room.id)} onChange={() => toggleLocation(room.id)}>
                    {room.name}
                  </OptionRow>
                  {inside.length > 0 ? (
                    <div className="ml-4 border-l border-line pl-1">
                      {inside.map((place) => (
                        <OptionRow
                          key={place.id}
                          name="ubicacion"
                          checked={query.locations.includes(place.id)}
                          onChange={() => toggleLocation(place.id)}
                        >
                          {place.name}
                        </OptionRow>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </>
        )}
      </FilterGroup>
    </div>
  );
}
