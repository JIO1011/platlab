import type { StockedProduct } from '@platlab/contracts';
import { Badge, Button, IconChip, Input, Quantity, Skeleton, StatePanel, cn } from '@platlab/ui';
import { CalendarClock, CircleAlert, FlaskConical, Layers, Lock, PackagePlus, Search, TrendingDown, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ModuleMark } from '../../app/module-mark';
import { useAreasOverview } from '../../app/queries';
import { useReagents } from './context';
import { inScope, readScope } from './inventory-scope';
import { EmptyToggle, physicalStateIcon, physicalStateLabel } from './product-parts';

const matches = (product: StockedProduct, query: string) => {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  return [product.name, product.code, product.casNumber ?? ''].some((value) => value.toLowerCase().includes(text));
};

/**
 * Filtros de avisos (ADR 0012, 05-10-2026), «Controlados» (ADR 0015) y «Sin mínimo» y «Sin ficha de seguridad»
 * (ADR 0021), en la URL: los indicadores y los avisos del Resumen abren aquí. Uno a la vez; cada uno con su valor,
 * para que el enlace diga qué lista abre.
 */
const alertFilters = {
  controlados: {
    param: ['controlado', 'si'],
    label: 'Controlados',
    empty: 'Ningún reactivo está marcado como controlado.',
    has: (product: StockedProduct) => product.controlled,
  },
  vencidos: {
    param: ['caducidad', 'vencidos'],
    label: 'Vencidos',
    empty: 'Ningún reactivo tiene frascos vencidos con saldo.',
    has: (product: StockedProduct) => product.expiredContainers > 0,
  },
  'por-vencer': {
    param: ['caducidad', 'por-vencer'],
    label: 'Por vencer',
    empty: 'Ningún reactivo tiene frascos por vencer en los próximos 30 días.',
    has: (product: StockedProduct) => product.expiringContainers > 0,
  },
  'bajo-minimo': {
    param: ['minimo', 'bajo'],
    label: 'Bajo mínimo',
    empty: 'Ningún reactivo está por debajo de su mínimo.',
    has: (product: StockedProduct) => product.belowMinimum,
  },
  // «Sin mínimo» comparte parámetro con «Bajo mínimo»: elegir uno deja el otro sin activar.
  'sin-minimo': {
    param: ['minimo', 'sin'],
    label: 'Sin mínimo',
    empty: 'Todos los reactivos tienen un mínimo fijado.',
    has: (product: StockedProduct) => product.minimum === null,
  },
  'sin-ficha': {
    param: ['ficha', 'sin'],
    label: 'Sin ficha de seguridad',
    empty: 'Todos los reactivos tienen su ficha de seguridad.',
    has: (product: StockedProduct) => product.sdsKind === null,
  },
} as const;
type AlertFilter = keyof typeof alertFilters;
const alertFilterKeys = Object.keys(alertFilters) as AlertFilter[];

/** Píldora de filtro: se muestra si hay algo que filtrar o si ya está activa, para poder quitarla. */
function FilterPill({ label, count, active, onToggle }: { label: string; count: number; active: boolean; onToggle: () => void }) {
  if (count === 0 && !active) return null;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
        active ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted hover:text-ink',
      )}
    >
      {label}
      <span className="tabular-nums">({count})</span>
    </button>
  );
}

/** Ficha del alcance que trae la sección Áreas («Área: Química»): dice a qué se limita la lista y se quita con un toque. */
function ScopeChip({ label, name, onRemove }: { label: string; name: string | undefined; onRemove: () => void }) {
  const text = name ? `${label}: ${name}` : label;
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Quitar filtro ${text}`}
      className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-action-soft px-3.5 text-sm font-medium text-action transition-colors hover:bg-action-soft/70"
    >
      <span className="truncate">{text}</span>
      <X className="size-3.5 shrink-0" aria-hidden />
    </button>
  );
}

/**
 * Inventario, primer nivel (ADR 0012): un reactivo por tarjeta con su total, sus frascos con saldo
 * y sus avisos de caducidad. Toda la tarjeta abre su ficha, el segundo nivel.
 */
export function ReagentsInventoryPage() {
  const { workspaceId, me, base, allowed, products, productList, openSheet } = useReagents();
  const [params, setParams] = useSearchParams();
  // El nombre del área o del departamento viene de Áreas; sin acceso a ella, la ficha dice solo qué filtra.
  const overview = useAreasOverview(workspaceId, me.areas !== 'none');
  const scope = readScope(params);
  const areaName = overview.data?.areas.find((area) => area.id === scope.areaId)?.name;
  const departmentName = overview.data?.departments.find((department) => department.id === scope.departmentId)?.name;
  const [query, setQuery] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const active = alertFilterKeys.find((key) => params.get(alertFilters[key].param[0]) === alertFilters[key].param[1]) ?? null;
  const emptyCount = productList.filter((product) => product.balance === '0').length;
  // Con un aviso activo se ven todos los que lo tienen, también sin existencias (un bajo mínimo puede estar en cero).
  const visible = productList.filter(
    (product) =>
      matches(product, query) &&
      inScope(product, scope) &&
      (active ? alertFilters[active].has(product) : showEmpty || product.balance !== '0'),
  );
  const toggleAlert = (filter: AlertFilter) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const key of alertFilterKeys) next.delete(alertFilters[key].param[0]);
        if (active !== filter) next.set(alertFilters[filter].param[0], alertFilters[filter].param[1]);
        return next;
      },
      { replace: true },
    );

  const removeScope = (key: 'area' | 'departamento') =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(key);
        return next;
      },
      { replace: true },
    );

  if (products.isPending) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-busy="true" aria-label="Cargando">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-36 rounded-card" />
        ))}
      </div>
    );
  }
  if (productList.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel
          icon={FlaskConical}
          title="Aún no hay reactivos"
          description={
            allowed.product
              ? 'Ingresa el primer reactivo: el catálogo y sus frascos se registran en un paso.'
              : 'Cuando alguien con permiso cree reactivos en el catálogo, aparecerán aquí.'
          }
          action={
            allowed.product && allowed.receipt ? (
              <Button variant="primary" onClick={() => openSheet({ kind: 'ingress' })}>
                <PackagePlus aria-hidden />
                Nuevo reactivo
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* El buscador arriba y los filtros debajo, en todos los anchos (ADR 0021), como el Informe de Equipos. */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar reactivo por nombre, código o CAS"
            placeholder="Buscar por nombre, código o CAS"
            className="h-[44px] pl-9 sm:h-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {scope.areaId ? <ScopeChip label="Área" name={areaName} onRemove={() => removeScope('area')} /> : null}
          {scope.departmentId ? <ScopeChip label="Departamento" name={departmentName} onRemove={() => removeScope('departamento')} /> : null}
          {alertFilterKeys.map((filter) => (
            <FilterPill
              key={filter}
              label={alertFilters[filter].label}
              count={productList.filter(alertFilters[filter].has).length}
              active={active === filter}
              onToggle={() => toggleAlert(filter)}
            />
          ))}
          {active ? null : (
            <EmptyToggle count={emptyCount} shown={showEmpty} onToggle={() => setShowEmpty(!showEmpty)} noun="sin existencias" />
          )}
          {/* Cuántos se ven, para leer el efecto de la búsqueda y los filtros de un vistazo. */}
          <p className="text-sm text-ink-muted sm:ml-auto" aria-live="polite">
            {visible.length === 1 ? '1 reactivo' : `${visible.length} reactivos`}
          </p>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-panel bg-surface px-4 py-8 text-center text-sm text-ink-muted shadow-raised">
          {query.trim()
            ? `Ningún reactivo coincide con «${query}».`
            : scope.areaId || scope.departmentId
              ? 'Ningún reactivo con existencias coincide con el filtro de Áreas. Quítalo para ver todos.'
              : active
                ? alertFilters[active].empty
                : 'No hay reactivos con existencias.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} to={`${base}/inventario/${product.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Tarjeta de catálogo (ADR 0010, 04-10-2026; rediseño del 20-10-2026, ADR 0021): se lee de arriba abajo,
 * alineada a la izquierda y con el contenido arriba, sin marca de agua. El nombre con su código; el CAS y el
 * estado físico en una línea, con el icono pequeño; la existencia en grande; y una fila de pastillas que se
 * parte: frascos («Sin existencias» si no hay), vencidos, controlado, bajo mínimo y por vencer. Todo con texto.
 */
function ProductCard({ product, to }: { product: StockedProduct; to: string }) {
  const empty = product.balance === '0';
  const state = product.physicalState ?? undefined;
  const frascos = product.containersWithStock === 1 ? '1 frasco' : `${product.containersWithStock} frascos`;
  return (
    <Link
      to={to}
      className="group relative flex h-full flex-col justify-center gap-3 overflow-hidden rounded-[20px] bg-surface p-4 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-1"
    >
      {/* Marca de agua: decorativa y casi invisible. */}
      <ModuleMark
        code="reagents"
        className="pointer-events-none absolute -bottom-4 -right-3 size-24 rotate-12 text-surface-sunken transition-[color,transform] duration-500 group-hover:text-action-soft motion-safe:group-hover:scale-110"
      />
      <h2 className="relative text-balance break-words text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-action">{product.name}</h2>
      <div className="relative flex min-w-0 items-center gap-2.5">
        <IconChip icon={(state && physicalStateIcon[state]) || FlaskConical} tone={empty ? 'neutral' : 'accent'} size="sm" />
        <div className="grid min-w-0 gap-0.5">
          <p className="text-[11px] font-semibold uppercase leading-none tracking-wide text-ink-muted">{(state && physicalStateLabel[state]) ?? 'Reactivo'}</p>
          {product.casNumber ? (
            <p className="truncate font-mono text-[11px] font-medium leading-tight tabular-nums text-ink-subtle">CAS: {product.casNumber}</p>
          ) : null}
        </div>
      </div>
      <div className="relative grid gap-1.5 border-t border-line pt-2.5">
        {/* Total a la izquierda; a su altura y a la derecha, en columna, las insignias: frascos, vencidos y controlado. */}
        <div className="flex items-start justify-between gap-2">
          <div className="grid min-w-0 gap-1.5">
            <p className="text-[11px] font-semibold uppercase leading-5 tracking-wide text-ink-muted">Total</p>
            <Quantity
              value={product.balance}
              unit={product.baseUnit}
              // Un saldo muy largo baja la unidad a otra línea en lugar de salirse de la tarjeta.
              className={cn('block min-w-0 whitespace-normal text-[22px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]', empty ? 'text-ink-subtle' : 'text-action')}
              unitClassName="text-[0.7em]"
            />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {empty ? (
              <Badge tone="warning" className="whitespace-nowrap px-2 py-0.5 text-[11px]">
                <CircleAlert className="size-3" aria-hidden />
                Sin existencias
              </Badge>
            ) : (
              <Badge className="whitespace-nowrap px-2 py-0.5 text-[11px] font-semibold text-ink">
                <Layers className="size-3" aria-hidden />
                {frascos}
              </Badge>
            )}
            {product.expiredContainers ? (
              <Badge tone="danger" className="whitespace-nowrap px-2 py-0.5 text-[11px]">
                <TriangleAlert className="size-3" aria-hidden />
                {product.expiredContainers === 1 ? '1 vencido' : `${product.expiredContainers} vencidos`}
              </Badge>
            ) : null}
            {product.controlled ? (
              <Badge tone="info" className="whitespace-nowrap px-2 py-0.5 text-[11px] font-semibold">
                <Lock className="size-3" aria-hidden />
                Controlado
              </Badge>
            ) : null}
          </div>
        </div>
        {/* Los avisos solo ocupan sitio si los hay: la tarjeta queda centrada, con el mismo aire arriba y abajo. */}
        {product.belowMinimum || product.expiringContainers ? (
          <div className="flex flex-wrap gap-1">
            {product.belowMinimum ? (
              <Badge tone="warning" className="gap-1 whitespace-nowrap px-2 text-[11px]">
                <TrendingDown className="size-3" aria-hidden />
                Bajo mínimo
              </Badge>
            ) : null}
            {product.expiringContainers ? (
              <Badge tone="warning" className="gap-1 whitespace-nowrap px-2 text-[11px]">
                <CalendarClock className="size-3" aria-hidden />
                {product.expiringContainers} por vencer
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
