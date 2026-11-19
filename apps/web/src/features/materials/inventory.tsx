import type { MaterialClass } from '@platlab/contracts';
import { Button, Input, Segmented } from '@platlab/ui';
import { MapPin, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FilterPill } from '../../app/filter-pill';
import { countText } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { AreasView } from './areas-view';
import { useMaterials } from './context';
import { InventoryStats } from './inventory-stats';
import { MaterialDetailSheet } from './material-detail';
import { MaterialSheet } from './material-sheet';
import { MaterialsResults } from './materials-results';
import { useMaterialAreas, useMaterialPage, useMaterialsSummary } from './queries';

type View = 'list' | 'cards' | 'areas';
/** `?vista=`: la lista es la vista por omisión y no escribe nada en la dirección. */
const viewParam: Record<View, string | null> = { list: null, cards: 'tarjetas', areas: 'ubicaciones' };
const parseView = (value: string | null): View => (value === 'tarjetas' ? 'cards' : value === 'ubicaciones' ? 'areas' : 'list');

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
 * Inventario de Materiales (ADR 0025): una franja de cifras y los materiales del espacio con lo disponible hoy, lo prestado
 * y el aviso «Bajo mínimo». Tres vistas en `?vista=`: la lista de filas (por omisión), las tarjetas con imagen y «Por
 * ubicación», que los agrupa por área como el Inventario de Equipos; tocar un área deja la lista con lo que hay en ella
 * (`?area=`). Se filtra por clase, por «Bajo mínimo» o por «Por vencer» (MA-01f) y se busca por nombre o código; tocar un material abre su ficha, donde
 * se ingresa, se da salida y se ajusta. El Administrador registra materiales nuevos.
 */
export function MaterialsInventoryPage() {
  const { workspaceId, canManage } = useMaterials();
  const [params, setParams] = useSearchParams();
  const areaId = params.get('area');
  const requested = parseView(params.get('vista'));
  const view: View = requested === 'areas' && areaId ? 'list' : requested;
  const [search, setSearch] = useState('');
  const [materialClass, setMaterialClass] = useState<ClassFilter>('all');
  // Un solo filtro de existencias a la vez: la API acepta uno.
  const [stockFilter, setStockFilter] = useState<'below-minimum' | 'expiring' | null>(null);
  const toggleStock = (next: 'below-minimum' | 'expiring') => setStockFilter(stockFilter === next ? null : next);
  const summary = useMaterialsSummary(workspaceId).data;
  const areas = useMaterialAreas(workspaceId);
  const materials = useMaterialPage(
    workspaceId,
    { q: search, materialClass: materialClass === 'all' ? null : materialClass, areaId, stock: stockFilter },
    view !== 'areas',
  );
  const areaName = areas.data?.items.find((area) => area.id === areaId)?.name;
  const writeParams = (next: View, area: string | null) => {
    const vista = viewParam[next];
    setParams({ ...(vista ? { vista } : {}), ...(area ? { area } : {}) }, { replace: true });
  };
  const [form, setForm] = useState<{ n: number; open: boolean } | null>(null);
  const [detail, setDetail] = useState<{ id: string; open: boolean } | null>(null);
  const count = materials.data?.pages.reduce((total, page) => total + page.items.length, 0) ?? 0;
  const filtered = search.trim().length >= 2 || materialClass !== 'all' || areaId !== null || stockFilter !== null;

  const create = canManage ? (
    <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => setForm({ n: (form?.n ?? 0) + 1, open: true })}>
      <Plus aria-hidden />
      Registrar material
    </Button>
  ) : null;

  return (
    <>
      <SectionHeader title="Inventario" updatedAt={view === 'areas' ? areas.dataUpdatedAt : materials.dataUpdatedAt} actions={create} />
      <div className="mt-6 grid gap-4">
        <InventoryStats summary={summary} areas={areas.data?.items.length} />
        <Segmented
          label="Cómo ver el inventario"
          value={view}
          onValueChange={(next) => writeParams(next, next === 'areas' ? null : areaId)}
          options={[
            { value: 'list', label: 'Lista' },
            { value: 'cards', label: 'Tarjetas' },
            { value: 'areas', label: 'Por ubicación' },
          ]}
        />
        {view === 'areas' ? null : (
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
              {areaId ? <AreaChip name={areaName} onRemove={() => writeParams(view, null)} /> : null}
              {classFilters.map(({ value, label }) => (
                <FilterPill key={value} label={label} active={materialClass === value} onToggle={() => setMaterialClass(value)} />
              ))}
              <FilterPill label="Bajo mínimo" count={summary?.belowMinimum} active={stockFilter === 'below-minimum'} onToggle={() => toggleStock('below-minimum')} />
              {(summary?.expiring ?? 0) > 0 || stockFilter === 'expiring' ? (
                <FilterPill label="Por vencer" count={summary?.expiring} active={stockFilter === 'expiring'} onToggle={() => toggleStock('expiring')} />
              ) : null}
              {count > 0 ? (
                <p className="text-sm text-ink-muted sm:ml-auto" aria-live="polite">
                  {countText(count, 'material', 'materiales')}
                  {materials.hasNextPage ? ' o más' : ''}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
      <div className="mt-4">
        {view === 'areas' ? (
          <AreasView areas={areas} onOpen={(id) => writeParams('list', id)} />
        ) : (
          <MaterialsResults
            query={materials}
            view={view}
            filtered={filtered}
            canManage={canManage}
            create={create}
            onOpen={(material) => setDetail({ id: material.id, open: true })}
          />
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
