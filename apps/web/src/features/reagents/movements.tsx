import type { Operation, OperationGroupBy } from '@platlab/contracts';
import { Button, Drawer, Field, Quantity, Segmented, Select, Skeleton, StatePanel, cn } from '@platlab/ui';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ChevronRight,
  History,
  Scale,
  SlidersHorizontal,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { addDays } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { useReagents } from './context';
import { MovementChips } from './movement-chips';
import { serializeMovementFilters, type MovementFilters } from './movement-filters';
import { MovementFilterPanel, type FocusRequest } from './movement-panel';
import {
  activeGroups,
  clearedGroup,
  defaultOpenGroups,
  movementsText,
  periodText,
  tight,
  type FilterGroupId,
} from './movement-text';
import { MovementTotals } from './movement-totals';
import { purposeOf } from './operation-text';
import { canReadReports } from './queries';
import { useMediaQuery, useStoredFlag } from './use-media-query';
import { useNow } from './use-now';

const groupOptions: ReadonlyArray<{ value: OperationGroupBy; label: string }> = [
  { value: 'product', label: 'Reactivo' },
  { value: 'responsible', label: 'Responsable' },
  { value: 'destination', label: 'Destino' },
  { value: 'month', label: 'Mes' },
];
const isGroupBy = (value: string): value is OperationGroupBy => groupOptions.some((option) => option.value === value);

const panelId = 'filtros-movimientos';

/**
 * Movimientos como informe (R-01C, ADR 0014): el libro por días (Detalle) o sus totales, con el panel
 * de filtros a la derecha (cajón desde la derecha por debajo de 1280 px). Los filtros viven en la URL:
 * la cifra del Resumen abre exactamente su lista y un informe es un enlace. Se aplican al marcarlos.
 */
export function ReagentsMovementsPage() {
  const { workspaceId, me, base, operations, movementFilters: filters, operationQuery, operationFacets, operationTotals } = useReagents();
  const [, setParams] = useSearchParams();
  const wide = useMediaQuery('(min-width: 80rem)');
  const [panelOpen, setPanelOpen] = useStoredFlag('platlab.movimientos.filtros', true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<ReadonlySet<FilterGroupId>>(() => new Set(defaultOpenGroups));
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const timeZone = me.workspace.timeZone;
  const canReport = canReadReports(me);
  const view = canReport ? filters.view : 'detail';
  const apply = (change: Partial<MovementFilters>) =>
    setParams(serializeMovementFilters({ ...filters, ...change }), { replace: true });
  const active = activeGroups(filters);
  const total = operationFacets.data?.total;
  const currentYear = Number(dayKey(new Date(), timeZone).slice(0, 4));
  const showPanel = wide && panelOpen;
  // La lista anterior queda atenuada, sin saltos, mientras llega la respuesta de un filtro nuevo.
  const stale = view === 'totals' ? operationTotals.isPlaceholderData : operations.isPlaceholderData;
  const settled = operationFacets.data !== undefined && !operationFacets.isPlaceholderData;
  const onFocusHandled = useCallback(() => setFocusRequest(null), []);

  const openGroup = (group: FilterGroupId) => {
    setOpenGroups((previous) => new Set(previous).add(group));
    setFocusRequest((previous) => ({ group, nonce: (previous?.nonce ?? 0) + 1 }));
    if (wide) setPanelOpen(true);
    else setDrawerOpen(true);
  };
  const toggleGroup = (group: FilterGroupId) =>
    setOpenGroups((previous) => {
      const next = new Set(previous);
      if (!next.delete(group)) next.add(group);
      return next;
    });
  const clearAll = () =>
    setParams(serializeMovementFilters({ ...filters, types: [], productIds: [], responsibleIds: [], destinations: [], reasons: [], locationIds: [], period: { kind: 'all' } }), {
      replace: true,
    });

  const panel = (
    <MovementFilterPanel
      workspaceId={workspaceId}
      filters={filters}
      query={operationQuery}
      facets={operationFacets}
      openGroups={openGroups}
      onToggleGroup={toggleGroup}
      focusRequest={focusRequest}
      onFocusHandled={onFocusHandled}
      onChange={apply}
    />
  );
  const filtersLabel = wide && panelOpen ? 'Ocultar filtros' : active.length > 0 ? `Filtros (${active.length})` : 'Filtros';

  return (
    <div className={cn(showPanel && 'grid grid-cols-[minmax(0,1fr)_18rem] items-start gap-6')}>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="min-w-0 basis-full text-sm text-ink-muted sm:flex-1 sm:basis-0">
            {total === undefined ? (
              <Skeleton className="h-5 w-52" />
            ) : (
              <>
                <span className="text-base font-bold tabular-nums text-ink">{movementsText(total)}</span>
                <span> · {periodText(filters.period, currentYear)}</span>
              </>
            )}
          </p>
          {canReport ? (
            <Segmented
              label="Vista"
              value={view}
              options={[
                { value: 'detail', label: 'Detalle' },
                { value: 'totals', label: 'Totales' },
              ]}
              onValueChange={(next) => apply({ view: next })}
            />
          ) : null}
          <Button
            size="sm"
            className="ml-auto h-[44px] sm:ml-0 sm:h-8"
            aria-expanded={wide ? panelOpen : undefined}
            aria-controls={wide ? panelId : undefined}
            aria-haspopup={wide ? undefined : 'dialog'}
            onClick={() => (wide ? setPanelOpen(!panelOpen) : setDrawerOpen(true))}
          >
            <SlidersHorizontal aria-hidden />
            {filtersLabel}
          </Button>
        </div>
        {/* Anuncia el total al cambiar los filtros, sin mover el foco. */}
        <p role="status" className="sr-only">
          {settled && total !== undefined ? `${movementsText(total)}. ${periodText(filters.period, currentYear)}.` : ''}
        </p>

        {view === 'totals' ? (
          <div className="mb-4 w-full max-w-[14rem]">
            <Field label="Agrupar por">
              <Select
                value={filters.groupBy}
                onValueChange={(next) => {
                  if (isGroupBy(next)) apply({ groupBy: next });
                }}
                options={groupOptions.map((option) => ({ value: option.value, label: option.label }))}
                placeholder="Reactivo"
                triggerClassName="h-[44px] sm:h-10"
              />
            </Field>
          </div>
        ) : null}

        <MovementChips
          filters={filters}
          facets={operationFacets.data}
          currentYear={currentYear}
          onOpen={openGroup}
          onRemove={(group) => apply(clearedGroup(group))}
          onClear={clearAll}
        />

        <div aria-busy={stale} className={cn('transition-opacity duration-150', stale && 'opacity-60')}>
          {view === 'totals' ? (
            <MovementTotals totals={operationTotals} filters={filters} base={base} />
          ) : operations.isPending ? (
            <MovementsSkeleton />
          ) : operations.isError ? (
            <div className="rounded-card bg-surface shadow-raised">
              <QueryErrorState error={operations.error} onRetry={() => void operations.refetch()} />
            </div>
          ) : (
            <MovementsView
              operations={operations.data.pages.flatMap((page) => page.items)}
              base={base}
              timeZone={timeZone}
              filtered={active.length > 0}
              hasMore={operations.hasNextPage}
              onClearFilters={clearAll}
            />
          )}
        </div>
        {view === 'detail' && operations.hasNextPage ? (
          <div className="mt-5 text-center">
            <Button variant="ghost" size="sm" loading={operations.isFetchingNextPage} onClick={() => void operations.fetchNextPage()}>
              Cargar movimientos anteriores
            </Button>
          </div>
        ) : null}
      </div>

      {showPanel ? (
        <aside
          id={panelId}
          aria-label="Filtros"
          className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-panel bg-surface p-2 shadow-raised"
        >
          {panel}
        </aside>
      ) : null}
      <Drawer
        open={drawerOpen && !wide}
        onOpenChange={setDrawerOpen}
        title="Filtros"
        footer={
          <Button variant="primary" className="h-[44px] w-full" onClick={() => setDrawerOpen(false)}>
            {total === undefined ? 'Ver movimientos' : `Ver ${movementsText(total)}`}
          </Button>
        }
      >
        {panel}
      </Drawer>
    </div>
  );
}

/** Esqueleto con la forma real: encabezado de día y una tarjeta de filas con círculo, dos líneas y cantidad. */
function MovementsSkeleton() {
  return (
    <div className="grid gap-3" role="status" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-4 w-48" />
      <div className="rounded-card bg-surface shadow-raised">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3.5 px-4 py-3.5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Día civil de un instante en la zona del espacio, «AAAA-MM-DD», para agrupar y comparar. */
function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** «Hoy», «Ayer» o el día completo; la fecha larga va siempre, para no depender de recordar qué es hoy. */
function dayHeading(key: string, timeZone: string, now: Date): { relative: string | null; long: string } {
  const [year = 1970, month = 1, day = 1] = key.split('-').map(Number);
  // Mediodía UTC del día civil: formateado en UTC conserva el día sin cruzar de zona.
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const text = new Intl.DateTimeFormat('es-EC', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(noon);
  const today = dayKey(now, timeZone);
  return {
    relative: key === today ? 'Hoy' : key === addDays(today, -1) ? 'Ayer' : null,
    long: text.charAt(0).toUpperCase() + text.slice(1),
  };
}

function hourOf(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-EC', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

const typeLabel: Record<Operation['type'], { label: string; icon: typeof Scale }> = {
  receipt: { label: 'Ingreso', icon: ArrowDownToLine },
  issue: { label: 'Salida', icon: ArrowUpFromLine },
  adjustment: { label: 'Ajuste', icon: Scale },
  transfer: { label: 'Traslado', icon: ArrowLeftRight },
};

/** Historial por días: cada día una tarjeta, cada fila un movimiento que abre la ficha del reactivo. */
function MovementsView({
  operations,
  base,
  timeZone,
  filtered,
  hasMore,
  onClearFilters,
}: {
  operations: Operation[];
  base: string;
  timeZone: string;
  filtered: boolean;
  hasMore: boolean;
  onClearFilters: () => void;
}) {
  const now = useNow(60_000);
  const days = useMemo(() => {
    const groups: Array<{ key: string; items: Operation[] }> = [];
    for (const operation of operations) {
      const key = dayKey(new Date(operation.effectiveAt), timeZone);
      const last = groups.at(-1);
      if (last?.key === key) last.items.push(operation);
      else groups.push({ key, items: [operation] });
    }
    return groups;
  }, [operations, timeZone]);

  if (operations.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        {filtered ? (
          <StatePanel
            icon={History}
            title="Sin movimientos con estos filtros"
            description="Cambia o quita algún filtro para ver más del historial."
            action={
              <Button variant="secondary" size="sm" onClick={onClearFilters}>
                Quitar filtros
              </Button>
            }
          />
        ) : (
          <StatePanel
            icon={History}
            title="Todavía no hay movimientos"
            description="Cada ingreso, salida o ajuste quedará aquí con su responsable y no se podrá editar."
          />
        )}
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      {days.map((day, index) => {
        const heading = dayHeading(day.key, timeZone, new Date(now));
        return (
          <section key={day.key} aria-labelledby={`dia-${day.key}`}>
            {/* Fijo bajo la cabecera (en el móvil, la barra y la fila de secciones) mientras se recorre el día. */}
            <h2
              id={`dia-${day.key}`}
              className="sticky top-[7.25rem] z-20 md:top-16 -mx-1 mb-2 flex items-baseline gap-2 bg-canvas/90 px-1 py-2 text-sm backdrop-blur-sm"
            >
              {heading.relative ? <span className="font-bold text-ink">{heading.relative}</span> : null}
              <span className={heading.relative ? 'text-ink-muted' : 'font-bold text-ink'}>{heading.long}</span>
              {/* La lista llega por páginas: el último día puede seguir en la siguiente, y su cuenta sería parcial. */}
              {hasMore && index === days.length - 1 ? null : (
                <span className="ml-auto text-[13px] font-normal tabular-nums text-ink-muted">
                  {movementsText(day.items.length)}
                </span>
              )}
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
              {day.items.map((operation) => (
                <li key={operation.entryId}>
                  <MovementRow operation={operation} to={`${base}/inventario/${operation.product.id}`} timeZone={timeZone} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Un asiento del libro: hora, tipo (icono y texto), reactivo con frasco y ubicación, motivo y
 * responsable a la izquierda; cantidad con signo y saldo a la derecha. Nada se edita aquí.
 */
function MovementRow({ operation, to, timeZone }: { operation: Operation; to: string; timeZone: string }) {
  const kind = typeLabel[operation.type];
  const Icon = kind.icon;
  const tone = operation.type === 'adjustment' || operation.type === 'transfer' ? 'accent' : operation.quantity.startsWith('-') ? 'out' : 'in';
  const purpose = purposeOf(operation);
  const actor = operation.actor.displayName ?? 'Miembro anterior';
  const hour = hourOf(operation.effectiveAt, timeZone);
  return (
    <Link
      to={to}
      className="@container group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-sunken/60 focus-visible:-outline-offset-2"
    >
      <time dateTime={operation.effectiveAt} className="hidden w-12 shrink-0 text-[13px] tabular-nums text-ink-muted @lg:block">
        {hour}
      </time>
      {/* Siempre en el acento: el icono dice el tipo y el color de la cifra, el sentido. */}
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-action-soft text-action">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words font-bold text-ink">{tight(operation.product.name)}</p>
        <p className="line-clamp-2 text-[13px] text-ink-muted">
          {operation.container?.code ?? operation.lot.code} · {operation.location.code}
          {purpose ? ` · ${purpose}` : ''}
          {operation.reference ? ` · ${operation.reference}` : ''}
        </p>
        <p className="truncate text-[13px] text-ink-muted">
          {kind.label}
          <span className="@lg:hidden"> · {hour}</span> · {actor}
          {/* Una salida aprobada (ADR 0012) lleva a quien la aprobó y a quien la pidió. */}
          {operation.requestedBy ? ` · Pidió ${operation.requestedBy.displayName ?? 'un miembro anterior'}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Quantity
          value={operation.quantity}
          unit={operation.unit}
          signed
          className={cn(
            'inline-block rounded-md px-2 py-0.5 text-[13px] font-bold [&>span]:font-semibold [&>span]:text-current',
            tone === 'in' && 'bg-success-soft text-success',
            tone === 'out' && 'bg-danger-soft text-danger',
            tone === 'accent' && 'bg-action-soft text-action',
          )}
        />
        <p className="mt-1 text-[13px] text-ink-muted">
          Saldo <Quantity value={operation.balanceAfter} unit={operation.unit} className="text-ink-muted" />
        </p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
