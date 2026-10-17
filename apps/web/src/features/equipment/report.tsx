import { Button, Drawer, Input, Skeleton, StatePanel, cn } from '@platlab/ui';
import { Microscope, Plus, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { conservationLabel, usefulLifeStateLabel, warrantyStateLabel } from '@platlab/contracts';
import { useSearchParams } from 'react-router';
import { toPlaces } from '../../app/places';
import { QueryErrorState } from '../../app/states';
import { useMediaQuery, useStoredFlag } from '../../app/use-media-query';
import { AssetChips, type ActiveFilter } from './asset-chips';
import { AssetIndicators } from './asset-indicators';
import { AssetFilterPanel, type AssetGroupId } from './asset-filter-panel';
import { assetQueryFrom, assetSearch, emptyAssetQuery, isFiltered, type AssetQuery } from './asset-filters';
import { AssetCards, AssetTable } from './asset-list';
import { assetsText, conditionLabel, noResponsibleLabel, NO_RESPONSIBLE } from './asset-text';
import { useEquipment } from './context';
import { useAssets, useAssetTotals, useAssetTypes, useEquipmentLocations, useResponsibles } from './queries';
import { SectionHeader } from './section-header';
import { ReportExport } from './report-export';
import { RegisterAsset } from './sheets/register-asset';

const panelId = 'filtros-equipos';
const SEARCH_DELAY_MS = 250;

/**
 * Informe de equipos (ADR 0019): los indicadores, la tabla (en el móvil, tarjetas apiladas) con buscador y el panel
 * de filtros a la derecha desde 1280 px y en un cajón por debajo. Búsqueda y filtros viven en la URL:
 * cada cifra del Resumen abre exactamente su lista y una vista es un enlace. Se aplican al marcarlos.
 */
export function EquipmentReportPage() {
  const { workspaceId, base, canManage, canExport } = useEquipment();
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => assetQueryFrom(params), [params]);
  const assets = useAssets(workspaceId, query);
  const totals = useAssetTotals(workspaceId, query);
  const types = useAssetTypes(workspaceId);
  const responsibles = useResponsibles(workspaceId);
  const locations = useEquipmentLocations(workspaceId);
  const places = useMemo(() => (locations.data ? toPlaces(locations.data.items) : undefined), [locations.data]);

  const wide = useMediaQuery('(min-width: 80rem)');
  const table = useMediaQuery('(min-width: 64rem)');
  const [panelOpen, setPanelOpen] = useStoredFlag('platlab.equipos.filtros', true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Solo un grupo plegable abierto a la vez, como en Movimientos.
  const [openGroup, setOpenGroup] = useState<AssetGroupId | null>(null);
  const showPanel = wide && panelOpen;

  // Las acciones llegan tarde (la espera del buscador): leen siempre los filtros vigentes.
  const latest = useRef(query);
  useEffect(() => {
    latest.current = query;
  }, [query]);
  const apply = (change: Partial<AssetQuery>) => {
    const next = { ...latest.current, ...change };
    latest.current = next;
    setParams(assetSearch(next), { replace: true });
  };

  // Búsqueda: lo escrito se ve al instante y llega a la URL 250 ms después de la última tecla.
  const [text, setText] = useState(query.q);
  const [seen, setSeen] = useState(query.q);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Si la URL cambia por otra vía (quitar la ficha, atrás del navegador), el campo la sigue; no se pisa
  // lo que se está escribiendo (una sola letra aún no es búsqueda).
  if (query.q !== seen) {
    setSeen(query.q);
    if (text.trim() !== query.q && !(query.q === '' && text.trim().length < 2)) setText(query.q);
  }
  const type = (value: string) => {
    setText(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const trimmed = value.trim();
      apply({ q: trimmed.length >= 2 ? trimmed.slice(0, 100) : '' });
    }, SEARCH_DELAY_MS);
  };
  const clearAll = () => {
    window.clearTimeout(timer.current);
    setText('');
    latest.current = emptyAssetQuery;
    setParams(new URLSearchParams(), { replace: true });
  };
  const clearSearch = () => {
    window.clearTimeout(timer.current);
    setText('');
    apply({ q: '' });
  };

  const typeNames = new Map((types.data?.items ?? []).map((entry) => [entry.id, entry.name]));
  const placeNames = new Map((places ?? []).map((place) => [place.id, place.name]));
  const responsibleNames = new Map((responsibles.data?.items ?? []).map((member) => [member.id, member.name]));
  const filters: ActiveFilter[] = [
    ...(query.q ? [{ key: 'q', group: 'Búsqueda', label: `«${query.q}»`, onRemove: clearSearch }] : []),
    ...query.conditions.map((condition) => ({
      key: `c-${condition}`,
      group: 'Estado',
      label: conditionLabel[condition],
      onRemove: () => apply({ conditions: query.conditions.filter((entry) => entry !== condition) }),
    })),
    ...query.types.map((id) => ({
      key: `t-${id}`,
      group: 'Tipo',
      label: typeNames.get(id) ?? 'Tipo',
      onRemove: () => apply({ types: query.types.filter((entry) => entry !== id) }),
    })),
    ...query.locations.map((id) => ({
      key: `u-${id}`,
      group: 'Ubicación',
      label: placeNames.get(id) ?? 'Ubicación',
      onRemove: () => apply({ locations: query.locations.filter((entry) => entry !== id) }),
    })),
    ...query.responsibles.map((id) => ({
      key: `r-${id}`,
      group: 'Responsable',
      label: id === NO_RESPONSIBLE ? noResponsibleLabel : (responsibleNames.get(id) ?? 'Responsable'),
      onRemove: () => apply({ responsibles: query.responsibles.filter((entry) => entry !== id) }),
    })),
    ...query.conservations.map((value) => ({
      key: `f-${value}`,
      group: 'Estado físico',
      label: value === 'none' ? 'Sin dato' : conservationLabel[value],
      onRemove: () => apply({ conservations: query.conservations.filter((entry) => entry !== value) }),
    })),
    ...query.warranties.map((value) => ({
      key: `g-${value}`,
      group: 'Garantía',
      label: warrantyStateLabel[value],
      onRemove: () => apply({ warranties: query.warranties.filter((entry) => entry !== value) }),
    })),
    ...query.usefulLives.map((value) => ({
      key: `v-${value}`,
      group: 'Vida útil',
      label: usefulLifeStateLabel[value],
      onRemove: () => apply({ usefulLives: query.usefulLives.filter((entry) => entry !== value) }),
    })),
  ];
  const panelGroups = [
    query.conditions,
    query.types,
    query.locations,
    query.responsibles,
    query.conservations,
    query.warranties,
    query.usefulLives,
  ].filter((values) => values.length > 0).length;

  const items = assets.data?.pages.flatMap((page) => page.items) ?? [];
  const hasMore = assets.hasNextPage;
  const count = assets.isPending ? undefined : assetsText(items.length, hasMore);
  const updatedAt = assets.dataUpdatedAt;
  const filtersLabel = wide && panelOpen ? 'Ocultar filtros' : panelGroups > 0 ? `Filtros (${panelGroups})` : 'Filtros';

  const panel = (
    <AssetFilterPanel
      query={query}
      types={types}
      responsibles={responsibles}
      places={places}
      placesFailed={locations.isError}
      onRetryPlaces={() => void locations.refetch()}
      openGroup={openGroup}
      onToggleGroup={(group) => setOpenGroup((previous) => (previous === group ? null : group))}
      onChange={apply}
    />
  );

  return (
    <>
      <SectionHeader
        title="Informe"
        updatedAt={updatedAt}
        actions={canExport ? <ReportExport query={query} assets={assets} filters={filters} /> : undefined}
      />
      <div className={cn('mt-6', showPanel && 'grid grid-cols-[minmax(0,1fr)_18rem] items-start gap-6')}>
        <div className="min-w-0">
          <AssetIndicators totals={totals} query={query} onApply={apply} onClear={clearAll} />
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="grid w-full gap-1 sm:w-80">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
                <Input
                  type="search"
                  aria-label="Buscar equipo por nombre, código, marca, modelo o serie"
                  placeholder="Buscar por nombre, código o serie"
                  className="h-[44px] pl-9 sm:h-10"
                  value={text}
                  onChange={(event) => type(event.target.value)}
                />
              </div>
              {text.trim().length === 1 ? <p className="px-1 text-[13px] text-ink-muted">Escribe al menos 2 letras para buscar.</p> : null}
            </div>
            {/* La cuenta se ve en el indicador «Equipos»; aquí solo se anuncia al lector de pantalla. */}
            <p className="sr-only" aria-live="polite">
              {count ?? ''}
            </p>
            <Button
              size="sm"
              className="ml-auto h-[44px] sm:h-8"
              aria-expanded={wide ? panelOpen : undefined}
              aria-controls={wide ? panelId : undefined}
              aria-haspopup={wide ? undefined : 'dialog'}
              onClick={() => (wide ? setPanelOpen(!panelOpen) : setDrawerOpen(true))}
            >
              <SlidersHorizontal aria-hidden />
              {filtersLabel}
            </Button>
          </div>

          <AssetChips filters={filters} onClear={clearAll} />

          <div aria-busy={assets.isPlaceholderData} className={cn('transition-opacity duration-150', assets.isPlaceholderData && 'opacity-60')}>
            {assets.isPending ? (
              <ListSkeleton table={table} />
            ) : assets.isError ? (
              <div className="rounded-card bg-surface shadow-raised">
                <QueryErrorState error={assets.error} onRetry={() => void assets.refetch()} />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-card bg-surface shadow-raised">
                {isFiltered(query) ? (
                  <StatePanel
                    icon={SearchX}
                    title="Sin equipos con estos filtros"
                    description="Cambia o quita algún filtro para ver más equipos."
                    action={
                      <Button size="sm" onClick={clearAll}>
                        Quitar filtros
                      </Button>
                    }
                  />
                ) : (
                  <StatePanel
                    icon={Microscope}
                    title="Aún no hay equipos"
                    description={
                      canManage
                        ? 'Cuando registres equipos, aparecerán aquí con su estado y su ubicación.'
                        : 'Cuando el Administrador registre equipos, aparecerán aquí.'
                    }
                    action={
                      canManage ? (
                        <RegisterAsset>
                          {(open) => (
                            <Button variant="primary" onClick={open}>
                              <Plus aria-hidden />
                              Registrar equipo
                            </Button>
                          )}
                        </RegisterAsset>
                      ) : undefined
                    }
                  />
                )}
              </div>
            ) : table ? (
              <AssetTable assets={items} base={base} />
            ) : (
              <AssetCards assets={items} base={base} />
            )}
          </div>
          {hasMore ? (
            <div className="mt-5 text-center">
              <Button className="h-[44px] sm:h-10" loading={assets.isFetchingNextPage} onClick={() => void assets.fetchNextPage()}>
                Cargar más
              </Button>
            </div>
          ) : null}
        </div>

        {showPanel ? (
          <aside
            id={panelId}
            aria-label="Filtros"
            className="sticky top-20 max-h-[calc(100dvh-6.5rem)] overflow-y-auto rounded-panel bg-surface p-2 shadow-raised"
          >
            {panel}
          </aside>
        ) : null}
      </div>
      <Drawer
        open={drawerOpen && !wide}
        onOpenChange={setDrawerOpen}
        title="Filtros"
        footer={
          <Button variant="primary" className="h-[44px] w-full" onClick={() => setDrawerOpen(false)}>
            {count === undefined ? 'Ver equipos' : `Ver ${count}`}
          </Button>
        }
      >
        {panel}
      </Drawer>
    </>
  );
}

/** Esqueleto quieto con la forma real: las filas de una tarjeta (tabla) o varias tarjetas apiladas. */
function ListSkeleton({ table }: { table: boolean }) {
  return (
    <div className="grid gap-3" role="status" aria-busy="true" aria-label="Cargando">
      {table ? (
        <div className="divide-y divide-line rounded-card bg-surface shadow-raised">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-20" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        [0, 1, 2].map((card) => <Skeleton key={card} className="h-36 rounded-card" />)
      )}
    </div>
  );
}
