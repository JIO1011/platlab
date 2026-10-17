import type { AssetCondition } from '@platlab/contracts';
import { Button, Segmented, Skeleton, StatePanel } from '@platlab/ui';
import { ArrowLeft, Microscope, SearchX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useShellTrail } from '../../app/shell-trail';
import { QueryErrorState } from '../../app/states';
import { useStoredFlag } from '../../app/use-media-query';
import { AreaHeader } from './area-head';
import { AreaTypes } from './area-types';
import { AssetResults } from './asset-results';
import { AssetSearch, useAssetSearch } from './asset-search';
import { useEquipment } from './context';
import { emptyAssetQuery } from './asset-filters';
import { useAreas, useAreaTypes, useAssets } from './queries';

/** «Todos» deja fuera a los dados de baja, que solo se ven con su enlace del membrete. */
const conditionsOf = (filter: AssetCondition | null): AssetCondition[] =>
  filter ? [filter] : ['operational', 'restricted', 'faulted'];

const views = [
  { value: 'cuadros', label: 'Cuadros' },
  { value: 'lista', label: 'Lista' },
] as const;

const groupings = [
  { value: 'tipo', label: 'Por tipo' },
  { value: 'todos', label: 'Todos' },
] as const;

/** Las unidades del área, de un tipo o de todos los tipos que coinciden con la búsqueda, con su estado: solo existe mientras se muestran, así no pide el inventario del área de más. */
function AreaUnits({
  areaId,
  areaName,
  typeId,
  filter,
  term,
  list,
  onReset,
}: {
  areaId: string;
  areaName: string;
  typeId: string | null;
  filter: AssetCondition | null;
  term: string;
  list: boolean;
  onReset: () => void;
}) {
  const { workspaceId, base } = useEquipment();
  const assets = useAssets(workspaceId, {
    ...emptyAssetQuery,
    q: term,
    conditions: conditionsOf(filter),
    types: typeId ? [typeId] : [],
    locations: [areaId],
  });
  return (
    <AssetResults
      assets={assets}
      base={base}
      tilesIn={list ? undefined : areaName}
      count={false}
      empty={
        term !== '' || filter !== null ? (
          <StatePanel
            icon={SearchX}
            title="Sin equipos con estos filtros"
            description="Cambia el estado o la búsqueda para ver más equipos del área."
            action={
              <Button size="sm" onClick={onReset}>
                Quitar filtros
              </Button>
            }
          />
        ) : (
          <StatePanel icon={Microscope} title="Esta área aún no tiene equipos" description="Los equipos que se registren aquí aparecerán en este lugar." />
        )
      }
    />
  );
}

function AreaView({ areaId }: { areaId: string }) {
  const { workspaceId, base, canManage, freshness } = useEquipment();
  const navigate = useNavigate();
  const areas = useAreas(workspaceId);
  const area = areas.data?.items.find((entry) => entry.id === areaId);
  const search = useAssetSearch();
  // La cifra del membrete (o el enlace de los dados de baja) y el tipo abierto; ambos se quitan tocándolos.
  const [filter, setFilter] = useState<AssetCondition | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  // Por tipo y Cuadros por omisión; ambas elecciones se recuerdan en este navegador.
  const [byType, setByType] = useStoredFlag('platlab.equipos.vista-por-tipo', true);
  const [list, setList] = useStoredFlag('platlab.equipos.vista-lista', false);
  // Los dados de baja no entran en las cifras por tipo: con su enlace, el área es la lista de equipos.
  const grouped = byType && filter !== 'retired';
  const types = useAreaTypes(workspaceId, areaId, grouped);
  const openType = grouped ? types.data?.items.find((entry) => entry.type.id === typeId) : undefined;
  // Escribir en «Por tipo» (desde 2 letras) muestra las unidades de todos los tipos; borrar vuelve a los tipos.
  const showUnits = !grouped || openType !== undefined || search.term !== '';
  // Equipos › Inventario › {área}: las migas están en la barra superior.
  useShellTrail(area ? [{ label: area.name }] : []);

  if (areas.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-3">
        <Skeleton className="h-48 rounded-[28px]" />
        <Skeleton className="mt-3 h-56 rounded-card" />
      </div>
    );
  }
  if (areas.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={areas.error} onRetry={() => void areas.refetch()} />
      </div>
    );
  }
  if (!area) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel
          icon={Microscope}
          title="Esta área no tiene equipos"
          description="Puede que todos estén dados de baja o que el área ya no exista."
          action={<Button onClick={() => void navigate(`${base}/inventario`)}>Volver al Inventario</Button>}
        />
      </div>
    );
  }

  const backToTypes = () => {
    search.setText('');
    setTypeId(null);
  };
  const reset = () => {
    search.setText('');
    setFilter(null);
  };

  return (
    <div className="grid gap-6">
      <AreaHeader
        area={area}
        typeCount={types.data?.items.length}
        canManage={canManage}
        freshness={{ updatedAt: areas.dataUpdatedAt, refreshing: freshness.refreshing, refresh: freshness.refresh }}
        filter={filter}
        onFilter={setFilter}
      />
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
            {openType ? (
              <Button variant="ghost" size="sm" className="-ml-2 h-11 sm:h-10" onClick={backToTypes}>
                <ArrowLeft aria-hidden />
                Todos los tipos
              </Button>
            ) : null}
            <AssetSearch
              label={`Buscar en ${openType ? openType.type.name : area.name}`}
              placeholder={openType ? 'Buscar en este tipo…' : 'Buscar en esta área…'}
              text={search.text}
              onChange={search.setText}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Agrupar los equipos"
              value={grouped ? 'tipo' : 'todos'}
              options={groupings}
              onValueChange={(grouping) => {
                setByType(grouping === 'tipo');
                // Los dados de baja no se agrupan por tipo: elegir «Por tipo» quita ese enlace.
                if (grouping === 'tipo' && filter === 'retired') setFilter(null);
                backToTypes();
              }}
            />
            <Segmented
              label="Vista de los equipos"
              value={list ? 'lista' : 'cuadros'}
              options={views}
              onValueChange={(view) => setList(view === 'lista')}
            />
          </div>
        </div>
        {showUnits ? (
          <AreaUnits
            areaId={areaId}
            areaName={area.name}
            typeId={openType?.type.id ?? null}
            filter={filter}
            term={search.term}
            list={list}
            onReset={reset}
          />
        ) : (
          <AreaTypes
            types={types}
            filter={filter}
            list={list}
            onOpen={setTypeId}
            onClear={() => setFilter(null)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Equipos de un área (ADR 0019, E-01c): el membrete con el encargado, «Registrar equipo» y las cifras que
 * filtran; debajo, el área por tipo (un cuadro por tipo; al abrir uno, sus unidades con buscador) o todos sus
 * equipos en cuadros o en lista. El área sale de la lista de áreas: sin equipos activos, no aparece. Cada área
 * empieza con su búsqueda y su filtro limpios; las migas están en la barra superior.
 */
export function EquipmentAreaPage() {
  const { areaId = '' } = useParams();
  return <AreaView key={areaId} areaId={areaId} />;
}
