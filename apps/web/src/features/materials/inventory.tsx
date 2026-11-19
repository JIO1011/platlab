import type { MaterialClass } from '@platlab/contracts';
import { Button, Input, Segmented, Skeleton, StatePanel } from '@platlab/ui';
import { MapPin, Package, PackageSearch, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FilterPill } from '../../app/filter-pill';
import { countText } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { AreasView } from './areas-view';
import { useMaterials } from './context';
import { MaterialCard } from './material-card';
import { MaterialDetailSheet } from './material-detail';
import { MaterialSheet } from './material-sheet';
import { useMaterialAreas, useMaterialPage } from './queries';

type View = 'materials' | 'areas';
type ClassFilter = 'all' | Extract<MaterialClass, 'consumable' | 'reusable_counted'>;
const classFilters: ReadonlyArray<{ value: ClassFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'consumable', label: 'Insumos' },
  { value: 'reusable_counted', label: 'Reutilizables' },
];

/** Ficha del área a la que se limita la lista («Ubicación: Almacén»): se quita con un toque. */
function AreaChip({ name, onRemove }: { name: string | undefined; onRemove: () => void }) {
  const text = name ? `Ubicación: ${name}` : 'Ubicación';
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Quitar filtro ${text}`}
      className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border border-action/40 bg-surface px-3.5 text-sm font-medium text-action transition-colors hover:bg-action-soft"
    >
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
      <X className="size-3.5 shrink-0" aria-hidden />
    </button>
  );
}

/**
 * Inventario de Materiales (ADR 0025): los materiales del espacio con lo disponible hoy, lo prestado y el aviso
 * «Bajo mínimo». Se filtra por clase (insumos o reutilizables) y se busca por nombre o código; tocar uno abre su ficha,
 * donde se ingresa, se da salida y se ajusta. «Por ubicación» (`?vista=ubicaciones`) los agrupa por área, como el
 * Inventario de Equipos, y tocar un área deja la lista de materiales con existencia en ella (`?area=`). El
 * Administrador registra materiales nuevos.
 */
export function MaterialsInventoryPage() {
  const { workspaceId, canManage } = useMaterials();
  const [params, setParams] = useSearchParams();
  const areaId = params.get('area');
  const view: View = params.get('vista') === 'ubicaciones' && !areaId ? 'areas' : 'materials';
  const [search, setSearch] = useState('');
  const [materialClass, setMaterialClass] = useState<ClassFilter>('all');
  const areas = useMaterialAreas(workspaceId);
  const materials = useMaterialPage(workspaceId, { q: search, materialClass: materialClass === 'all' ? null : materialClass, areaId }, view === 'materials');
  const areaName = areas.data?.items.find((area) => area.id === areaId)?.name;
  const showView = (next: View) => setParams(next === 'areas' ? { vista: 'ubicaciones' } : {}, { replace: true });
  const openArea = (id: string) => setParams({ area: id }, { replace: true });
  const [form, setForm] = useState<{ n: number; open: boolean } | null>(null);
  const [detail, setDetail] = useState<{ id: string; open: boolean } | null>(null);
  const items = materials.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = search.trim().length >= 2 || materialClass !== 'all' || areaId !== null;

  const create = canManage ? (
    <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => setForm({ n: (form?.n ?? 0) + 1, open: true })}>
      <Plus aria-hidden />
      Registrar material
    </Button>
  ) : null;

  return (
    <>
      <SectionHeader title="Inventario" updatedAt={view === 'areas' ? areas.dataUpdatedAt : materials.dataUpdatedAt} actions={create} />
      <div className="mt-6 grid gap-3">
        <Segmented
          label="Cómo ver el inventario"
          value={view}
          onValueChange={showView}
          options={[
            { value: 'materials', label: 'Por material' },
            { value: 'areas', label: 'Por ubicación' },
          ]}
        />
        {view === 'materials' ? (
          <>
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <Input
                type="search"
                aria-label="Buscar material por nombre o código"
                placeholder="Buscar por nombre o código"
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 pl-9 sm:h-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {areaId ? <AreaChip name={areaName} onRemove={() => setParams({}, { replace: true })} /> : null}
              {classFilters.map(({ value, label }) => (
                <FilterPill key={value} label={label} active={materialClass === value} onToggle={() => setMaterialClass(value)} />
              ))}
              {items.length > 0 ? (
                <p className="text-sm text-ink-muted sm:ml-auto" aria-live="polite">
                  {countText(items.length, 'material', 'materiales')}
                  {materials.hasNextPage ? ' o más' : ''}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      <div className="mt-4">
        {view === 'areas' ? (
          <AreasView areas={areas} onOpen={openArea} />
        ) : materials.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : materials.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={materials.error} onRetry={() => void materials.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={filtered ? PackageSearch : Package}
              title={filtered ? 'Ningún material coincide' : 'Aún no hay materiales'}
              description={
                filtered
                  ? 'Prueba con otra palabra o quita los filtros.'
                  : canManage
                    ? 'Registra lo que el laboratorio gasta (guantes, puntas) o presta (vasos, pipetas) y luego ingresa sus existencias.'
                    : 'Quien administra el espacio registra los materiales. Cuando existan, los verás aquí.'
              }
              action={filtered ? undefined : create}
            />
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((material) => (
                <MaterialCard key={material.id} material={material} onOpen={() => setDetail({ id: material.id, open: true })} />
              ))}
            </ul>
            {materials.hasNextPage ? (
              <div className="mt-4 flex justify-center">
                <Button className="h-11 sm:h-10" onClick={() => void materials.fetchNextPage()} disabled={materials.isFetchingNextPage}>
                  {materials.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
      {detail ? (
        <MaterialDetailSheet
          key={detail.id}
          productId={detail.id}
          open={detail.open}
          onOpenChange={(open) => setDetail((current) => (current ? { ...current, open } : current))}
        />
      ) : null}
      {form ? (
        <MaterialSheet
          key={form.n}
          workspaceId={workspaceId}
          open={form.open}
          onOpenChange={(open) => setForm((current) => (current ? { ...current, open } : current))}
          onCreated={(created) => setDetail({ id: created.id, open: true })}
        />
      ) : null}
    </>
  );
}
