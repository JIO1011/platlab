import type { AssetCondition } from '@platlab/contracts';
import { Button, Segmented, Skeleton, StatePanel, cn } from '@platlab/ui';
import { Microscope, SearchX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { WithBack } from '../../app/back-button';
import { useLabelMode } from '../../app/labels/use-label-mode';
import { useShellTrail } from '../../app/shell-trail';
import { QueryErrorState } from '../../app/states';
import { useStoredFlag } from '../../app/use-media-query';
import { AreaHeader, labelsButtonId } from './area-head';
import { AreaLabelBar, typePicks, unitPicks, type AreaLabels } from './area-labels';
import { AreaTypes, typeUnits, visibleTypes } from './area-types';
import { AssetResults } from './asset-results';
import { AssetSearch, useAssetSearch } from './asset-search';
import { useEquipment } from './context';
import { assetSearch, conditionsOf, emptyAssetQuery } from './asset-filters';
import { noSelection, selectionSearch, type LabelSelection } from './label-selection';
import { useAreas, useAreaTypes, useAssets } from './queries';

const views = [
  { value: 'cuadros', label: 'Cuadros' },
  { value: 'lista', label: 'Lista' },
] as const;

/** El parámetro de la URL con el tipo abierto: abrirlo suma una entrada al historial y ← lo cierra. */
const TYPE_PARAM = 'tipo';

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
  labels,
  onReset,
}: {
  areaId: string;
  areaName: string;
  typeId: string | null;
  filter: AssetCondition | null;
  term: string;
  list: boolean;
  labels: AreaLabels;
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
    <>
      <AssetResults
        assets={assets}
        base={base}
        tilesIn={list ? undefined : areaName}
        count={false}
        picks={unitPicks(labels)}
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
      {labels.used ? <AreaLabelBar labels={labels} visible={{ kind: 'units', items: assets.data?.pages.flatMap((page) => page.items) ?? [] }} /> : null}
    </>
  );
}

function AreaView({ areaId }: { areaId: string }) {
  const { workspaceId, base, canManage, freshness } = useEquipment();
  const navigate = useNavigate();
  const areas = useAreas(workspaceId);
  const area = areas.data?.items.find((entry) => entry.id === areaId);
  const search = useAssetSearch();
  // La cifra del membrete (o el enlace de los dados de baja), que se quita tocándola, y el tipo abierto, que va en la URL.
  const [filter, setFilter] = useState<AssetCondition | null>(null);
  const [params, setParams] = useSearchParams();
  const typeId = params.get(TYPE_PARAM);
  // Por tipo y Cuadros por omisión; ambas elecciones se recuerdan en este navegador.
  const [byType, setByType] = useStoredFlag('platlab.equipos.vista-por-tipo', true);
  const [list, setList] = useStoredFlag('platlab.equipos.vista-lista', false);
  // Los dados de baja no entran en las cifras por tipo: con su enlace, el área es la lista de equipos.
  const grouped = byType && filter !== 'retired';
  const typeFilter = filter === 'retired' ? null : filter;
  const types = useAreaTypes(workspaceId, areaId, grouped);
  const openType = grouped ? types.data?.items.find((entry) => entry.type.id === typeId) : undefined;
  // Escribir en «Por tipo» (desde 2 letras) muestra las unidades de todos los tipos; borrar vuelve a los tipos.
  const showUnits = !grouped || openType !== undefined || search.term !== '';
  // Modo etiquetas (ADR 0010, E-01d): los cuadros giran a su etiqueta y se elige cuáles imprimir. La elección se
  // vacía al cambiar el estado o la búsqueda; abrir o cerrar un tipo y cambiar de agrupación la conservan.
  const labelMode = useLabelMode(labelsButtonId);
  const [selection, setSelection] = useState<LabelSelection>(noSelection);
  const changeFilter = (next: AssetCondition | null) => {
    setFilter(next);
    setSelection(noSelection);
  };
  const selectType = (id: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id) next.set(TYPE_PARAM, id);
        else next.delete(TYPE_PARAM);
        return next;
      },
      // Abrir un tipo suma una entrada; quitarlo (al cambiar de agrupación) no deja otra igual al área.
      { replace: id === null },
    );
  // Cerrar o cambiar el tipo abierto (con ← o con el historial) borra el buscador: no deja una búsqueda de todos los tipos.
  const [shownType, setShownType] = useState(typeId);
  if (shownType !== typeId) {
    setShownType(typeId);
    search.setText('');
  }
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

  const reset = () => {
    search.setText('');
    changeFilter(null);
  };
  const typeEntries = visibleTypes(types.data?.items ?? [], typeFilter);
  const labels: AreaLabels = {
    active: labelMode.active,
    used: labelMode.used,
    selection,
    onChange: setSelection,
    totalOf: (id) => {
      const entry = types.data?.items.find((candidate) => candidate.type.id === id);
      return entry ? typeUnits(entry, typeFilter) : 0;
    },
    onDone: labelMode.close,
    // La página de etiquetas recibe la elección y lo que se veía (estado y búsqueda) para traer las mismas unidades.
    onPrint: () => {
      const query = selectionSearch(selection);
      assetSearch({ q: search.term, conditions: filter ? [filter] : [] }).forEach((value, key) => query.append(key, value));
      void navigate(`${base}/inventario/area/${areaId}/etiquetas?${query}`);
    },
  };

  return (
    // Con el modo etiquetas, un colchón abajo: la barra fija no tapa la última fila.
    <div className={cn('grid gap-6', labelMode.active && 'pb-28')}>
      {/* ← sube un nivel: del tipo abierto al área y, del área, al Inventario. */}
      <WithBack parent={openType ? `${base}/inventario/area/${areaId}` : `${base}/inventario`}>
        <AreaHeader
          area={area}
          typeCount={types.data?.items.length}
          canManage={canManage}
          freshness={{ updatedAt: areas.dataUpdatedAt, refreshing: freshness.refreshing, refresh: freshness.refresh }}
          filter={filter}
          onFilter={changeFilter}
          labels={{ active: labelMode.active, onToggle: () => labelMode.toggle(() => setSelection(noSelection)) }}
        />
      </WithBack>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <AssetSearch
            label={`Buscar en ${openType ? openType.type.name : area.name}`}
            placeholder={openType ? 'Buscar en este tipo…' : 'Buscar en esta área…'}
            text={search.text}
            onChange={(text) => {
              search.setText(text);
              setSelection(noSelection);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Agrupar los equipos"
              value={grouped ? 'tipo' : 'todos'}
              options={groupings}
              onValueChange={(grouping) => {
                setByType(grouping === 'tipo');
                // Los dados de baja no se agrupan por tipo: elegir «Por tipo» quita ese enlace.
                if (grouping === 'tipo' && filter === 'retired') changeFilter(null);
                search.setText('');
                selectType(null);
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
            labels={labels}
            onReset={reset}
          />
        ) : (
          <>
            <AreaTypes
              types={types}
              filter={typeFilter}
              list={list}
              picks={typePicks(labels)}
              onOpen={selectType}
              onClear={() => changeFilter(null)}
            />
            {labels.used ? (
              <AreaLabelBar
                labels={labels}
                visible={{ kind: 'types', items: typeEntries.map((entry) => ({ id: entry.type.id, total: typeUnits(entry, typeFilter) })) }}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Equipos de un área (ADR 0019, E-01c): el membrete con el encargado, «Registrar equipo», «Etiquetas QR» y las
 * cifras que filtran; debajo, el área por tipo (un cuadro por tipo; al abrir uno, sus unidades con buscador) o
 * todos sus equipos en cuadros o en lista. «Etiquetas QR» gira los cuadros a su etiqueta para elegir cuáles
 * imprimir (E-01d). El área sale de la lista de áreas: sin equipos activos, no aparece. Cada área empieza con su
 * búsqueda y su filtro limpios; las migas están en la barra superior.
 */
export function EquipmentAreaPage() {
  const { areaId = '' } = useParams();
  return <AreaView key={areaId} areaId={areaId} />;
}
