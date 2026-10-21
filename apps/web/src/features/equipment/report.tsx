import { Button, Input, Skeleton, StatePanel, cn } from '@platlab/ui';
import { Microscope, Plus, Search, SearchX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toPlaces } from '../../app/places';
import { useDepartments } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { useMediaQuery } from '../../app/use-media-query';
import { activeFilters } from './active-filters';
import { AssetFilterBar } from './asset-filter-bar';
import { AssetIndicators } from './asset-indicators';
import { assetQueryFrom, assetSearch, emptyAssetQuery, isFiltered, type AssetQuery } from './asset-filters';
import { AssetCards, AssetTable } from './asset-list';
import { assetsText } from './asset-text';
import { useEquipment } from './context';
import { useAssets, useAssetTotals, useAssetTypes, useEquipmentLocations, useResponsibles } from './queries';
import { SectionHeader } from './section-header';
import { ReportExport } from './report-export';
import { RegisterAsset } from './sheets/register-asset';

const SEARCH_DELAY_MS = 250;

/**
 * Informe de equipos (ADR 0019, 0021): los indicadores, el buscador y la barra de filtros horizontal sobre la tabla
 * (en el móvil, tarjetas apiladas), que así usa todo el ancho. Búsqueda y filtros viven en la URL: cada cifra del
 * Resumen abre exactamente su lista y una vista es un enlace. Se aplican al marcarlos; cada botón de la barra dice
 * lo elegido.
 */
export function EquipmentReportPage() {
  const { workspaceId, base, canManage, canExport } = useEquipment();
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => assetQueryFrom(params), [params]);
  const assets = useAssets(workspaceId, query);
  const totals = useAssetTotals(workspaceId, query);
  const types = useAssetTypes(workspaceId);
  const responsibles = useResponsibles(workspaceId);
  const departments = useDepartments(workspaceId);
  const locations = useEquipmentLocations(workspaceId);
  const places = useMemo(() => (locations.data ? toPlaces(locations.data.items) : undefined), [locations.data]);

  // La tabla necesita unos 940 px de contenido: con el menú lateral, desde 1280 px de pantalla; antes, tarjetas.
  const table = useMediaQuery('(min-width: 80rem)');

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
  // «Limpiar» de la barra quita sus filtros y deja lo escrito en el buscador.
  const clearBar = () => apply({ ...emptyAssetQuery, q: latest.current.q });

  const filters = activeFilters(query, {
    types: new Map((types.data?.items ?? []).map((entry) => [entry.id, entry.name])),
    places: new Map((places ?? []).map((place) => [place.id, place.name])),
    responsibles: new Map((responsibles.data?.items ?? []).map((member) => [member.id, member.name])),
    departments: new Map((departments.data?.items ?? []).map((department) => [department.id, department.name])),
  });

  const items = assets.data?.pages.flatMap((page) => page.items) ?? [];
  const hasMore = assets.hasNextPage;
  const count = assets.isPending ? undefined : assetsText(items.length, hasMore);

  return (
    <>
      <SectionHeader
        title="Informe"
        updatedAt={assets.dataUpdatedAt}
        actions={canExport ? <ReportExport query={query} assets={assets} filters={filters} /> : undefined}
      />
      <div className="mt-6">
        <AssetIndicators totals={totals} query={query} onApply={apply} onClear={clearAll} />
        {/* El buscador arriba y los filtros debajo, en todos los anchos (ADR 0021). */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="grid w-full gap-1 md:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <Input
                type="search"
                aria-label="Buscar equipo por nombre, código, marca, modelo o serie"
                placeholder="Buscar por nombre, código o serie"
                className="h-[44px] pl-9 sm:h-9"
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
          <div className="w-full min-w-0">
            <AssetFilterBar
              query={query}
              types={types}
              responsibles={responsibles}
              departments={departments}
              places={places}
              placesFailed={locations.isError}
              onRetryPlaces={() => void locations.refetch()}
              onChange={apply}
              onClear={clearBar}
            />
          </div>
        </div>

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
