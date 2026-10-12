import type { Operation } from '@platlab/contracts';
import { Button, Quantity, Skeleton, StatePanel, cn } from '@platlab/ui';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ChevronRight, History, Scale } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { addDays } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { useReagents } from './context';
import { serializeMovementFilters, type MovementFilters } from './movement-filters';
import { purposeOf } from './operation-text';
import { useNow } from './use-now';

const typeFilters = [
  { value: undefined, label: 'Todos' },
  { value: 'receipt', label: 'Ingresos' },
  { value: 'issue', label: 'Salidas' },
  { value: 'adjustment', label: 'Ajustes' },
  { value: 'transfer', label: 'Traslados' },
] as const;

const periodFilters = [
  { days: undefined, label: 'Todo' },
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
] as const;

/** Píldora de filtro con el estilo de las del inventario (que además llevan su cuenta); `aria-pressed` dice el estado, no solo el color. */
function ChoicePill({ label, active, onSelect }: { label: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        'inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors',
        active ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}

/**
 * Movimientos (ADR 0012, 05-10-2026): el libro del módulo como una línea de tiempo por días, con la
 * misma fila que la actividad del Resumen. Los filtros viven en la URL, así que la cifra del Resumen
 * abre exactamente su lista.
 */
export function ReagentsMovementsPage() {
  const { me, base, operations, movementFilters } = useReagents();
  const [, setParams] = useSearchParams();
  const { types, period } = movementFilters;
  const filtered =
    types.length > 0 ||
    period.kind !== 'all' ||
    [movementFilters.productIds, movementFilters.responsibleIds, movementFilters.destinations, movementFilters.reasons, movementFilters.locationIds].some(
      (list) => list.length > 0,
    );
  // Las píldoras eligen un tipo y una ventana de días; el panel de R-01C llegará con varios valores.
  const activeType = types.length === 1 ? types[0] : types.length === 0 ? undefined : null;
  const activeDays = period.kind === 'days' ? period.days : period.kind === 'all' ? undefined : null;
  const select = (change: Partial<MovementFilters>) =>
    setParams(serializeMovementFilters({ ...movementFilters, ...change }), { replace: true });
  const periodIsStandard = periodFilters.some((entry) => entry.days === activeDays);
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        <div role="group" aria-label="Tipo de movimiento" className="flex flex-wrap items-center gap-2">
          {typeFilters.map((filter) => (
            <ChoicePill
              key={filter.label}
              label={filter.label}
              active={activeType === filter.value}
              onSelect={() => select({ types: filter.value ? [filter.value] : [] })}
            />
          ))}
        </div>
        <div role="group" aria-label="Periodo" className="flex flex-wrap items-center gap-2">
          {periodFilters.map((period) => (
            <ChoicePill
              key={period.label}
              label={period.label}
              active={activeDays === period.days}
              onSelect={() => select({ period: period.days === undefined ? { kind: 'all' } : { kind: 'days', days: period.days } })}
            />
          ))}
          {/* Un enlace puede traer otro número de días (hasta 90): se muestra activo y se puede quitar. */}
          {periodIsStandard || !activeDays ? null : (
            <ChoicePill label={`${activeDays} días`} active onSelect={() => select({ period: { kind: 'all' } })} />
          )}
        </div>
      </div>

      {operations.isPending ? (
        <MovementsSkeleton />
      ) : operations.isError ? (
        <div className="rounded-card bg-surface shadow-raised">
          <QueryErrorState error={operations.error} onRetry={() => void operations.refetch()} />
        </div>
      ) : (
        <MovementsView
          operations={operations.data.pages.flatMap((page) => page.items)}
          base={base}
          timeZone={me.workspace.timeZone}
          filtered={filtered}
          hasMore={operations.hasNextPage}
          onClearFilters={() => setParams({}, { replace: true })}
        />
      )}
      {operations.hasNextPage ? (
        <div className="mt-5 text-center">
          <Button variant="ghost" size="sm" loading={operations.isFetchingNextPage} onClick={() => void operations.fetchNextPage()}>
            Cargar movimientos anteriores
          </Button>
        </div>
      ) : null}
    </>
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

/** Historial por días: cada día una tarjeta, cada fila un asiento que abre la ficha del reactivo. */
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
            title="Ningún movimiento con este filtro"
            description="Cambia el tipo o el periodo para ver más del historial."
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
                  {day.items.length === 1 ? '1 asiento' : `${day.items.length} asientos`}
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
        <p className="truncate font-bold text-ink">{operation.product.name}</p>
        <p className="text-[13px] text-ink-muted @lg:truncate">
          {operation.container?.code ?? operation.lot.code} · {operation.location.code}
          {purpose ? ` · ${purpose}` : ''}
          {operation.reference ? ` · ${operation.reference}` : ''}
        </p>
        <p className="text-[13px] text-ink-muted @lg:truncate">
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
