import type { Area } from '@platlab/contracts';
import { Badge, Button, Skeleton, StatePanel } from '@platlab/ui';
import { Microscope, ScanLine, SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { ModuleMark } from '../../app/module-mark';
import { QueryErrorState } from '../../app/states';
import { AreaManagerLine } from './area-manager';
import { hasSeveralSites } from './area-order';
import { AssetResults } from './asset-results';
import { AssetSearch, useAssetSearch } from './asset-search';
import { useEquipment } from './context';
import { emptyAssetQuery } from './asset-filters';
import { EquipmentScan } from './equipment-scan';
import { useAreas, useAssets } from './queries';
import { SectionHeader } from './section-header';
import { RegisterAssetButton } from './sheets/register-asset';

const number = new Intl.NumberFormat('es-EC');

/**
 * Lo que cuesta atención en el área, con color y con texto: los fuera de servicio y los de uso limitado; si no
 * hay ninguno, «Todos operativos».
 */
export function AreaStatus({ area }: { area: Area }) {
  if (area.faulted === 0 && area.restricted === 0) return <Badge tone="success">Todos operativos</Badge>;
  return (
    <div className="flex flex-wrap gap-1.5 tabular-nums">
      {area.faulted > 0 ? <Badge tone="danger">{number.format(area.faulted)} fuera de servicio</Badge> : null}
      {area.restricted > 0 ? <Badge tone="warning">{number.format(area.restricted)} uso limitado</Badge> : null}
    </div>
  );
}

/**
 * Tarjeta de un área (ADR 0019, E-01c): nombre y, si hay más de una sede, la sede; la cifra de equipos con cómo
 * están, y el encargado al pie. Toda la tarjeta abre el área; el botón del encargado es aparte y queda por
 * encima del enlace. El microscopio de marca de agua es decorativo, va detrás del texto y despierta al pasar
 * el puntero.
 */
function AreaCard({ area, base, canManage, showParent }: { area: Area; base: string; canManage: boolean; showParent: boolean }) {
  return (
    <li className="group relative isolate flex flex-col overflow-hidden rounded-card bg-surface p-6 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-action motion-safe:hover:-translate-y-0.5">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <ModuleMark
          code="equipment"
          className="absolute -right-6 top-5 size-36 rotate-12 text-surface-sunken transition-[color,scale,rotate] duration-500 ease-out-expo group-hover:text-action-soft motion-safe:group-hover:rotate-6 motion-safe:group-hover:scale-110"
        />
      </div>
      <div className="min-w-0 pr-16">
        <h2 className="text-[20px] font-bold leading-tight tracking-tight text-ink transition-colors duration-200 group-hover:text-action">
          <Link to={`${base}/inventario/area/${area.id}`} className="line-clamp-2 break-words after:absolute after:inset-0 focus-visible:outline-none">
            {area.name}
          </Link>
        </h2>
        {showParent && area.parentName ? <p className="mt-1 truncate text-[13px] text-ink-muted">{area.parentName}</p> : null}
      </div>
      <div className="mt-auto pt-8">
        <p className="flex items-baseline gap-2">
          <span className="text-metric tabular-nums text-ink">{number.format(area.total)}</span>
          <span className="text-sm font-medium text-ink-muted">{area.total === 1 ? 'equipo' : 'equipos'}</span>
        </p>
        <div className="mt-2.5">
          <AreaStatus area={area} />
        </div>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <AreaManagerLine area={area} canManage={canManage} />
      </div>
    </li>
  );
}

/** Esqueleto quieto con la forma real: seis tarjetas en la misma cuadrícula. */
function AreasSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((card) => (
        <Skeleton key={card} className="h-64 rounded-card" />
      ))}
    </div>
  );
}

/** Los equipos de todas las áreas que coinciden con lo buscado. Solo existe mientras hay búsqueda: así no pide el inventario entero. */
function SearchResults({ term, onClear }: { term: string; onClear: () => void }) {
  const { workspaceId, base } = useEquipment();
  const assets = useAssets(workspaceId, { ...emptyAssetQuery, q: term });
  return (
    <AssetResults
      assets={assets}
      base={base}
      empty={
        <StatePanel
          icon={SearchX}
          title={`Sin equipos para «${term}»`}
          description="Prueba con otro nombre o con el código del equipo."
          action={
            <Button size="sm" onClick={onClear}>
              Borrar búsqueda
            </Button>
          }
        />
      }
    />
  );
}

/**
 * Inventario por áreas (ADR 0019, E-01c): una tarjeta por área con equipos, en orden alfabético, y un buscador
 * que, desde 2 letras, muestra los equipos de todas las áreas, con «Escanear» junto a él. «Registrar equipo» y
 * el encargado de cada área son del Administrador.
 */
export function EquipmentAreasPage() {
  const { workspaceId, base, canManage } = useEquipment();
  const areas = useAreas(workspaceId);
  const search = useAssetSearch();
  const items = areas.data?.items ?? [];
  const showParent = hasSeveralSites(items);

  return (
    <>
      <SectionHeader
        title="Inventario"
        updatedAt={areas.dataUpdatedAt}
        actions={canManage ? <RegisterAssetButton className="h-12 sm:h-10" /> : undefined}
      />
      <div className="mt-6 grid gap-5">
        <div className="flex flex-wrap items-start gap-3">
          <AssetSearch
            label="Buscar equipo por código o nombre"
            placeholder="Buscar equipo por código o nombre…"
            text={search.text}
            onChange={search.setText}
          />
          <EquipmentScan>
            {(open) => (
              <Button className="h-[44px] w-full sm:h-10 sm:w-auto" onClick={open}>
                <ScanLine aria-hidden />
                Escanear
              </Button>
            )}
          </EquipmentScan>
        </div>
        {search.term ? (
          <SearchResults term={search.term} onClear={() => search.setText('')} />
        ) : areas.isPending ? (
          <AreasSkeleton />
        ) : areas.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={areas.error} onRetry={() => void areas.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={Microscope}
              title="Aún no hay equipos"
              description={
                canManage
                  ? 'Cuando registres equipos, sus áreas aparecerán aquí con cuántos hay y cómo están.'
                  : 'Cuando el Administrador registre equipos, sus áreas aparecerán aquí.'
              }
              action={canManage ? <RegisterAssetButton /> : undefined}
            />
          </div>
        ) : (
          <ul aria-label="Áreas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((area) => (
              <AreaCard key={area.id} area={area} base={base} canManage={canManage} showParent={showParent} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
