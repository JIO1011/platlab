import type { Operation, OperationGroupBy } from '@platlab/contracts';
import { Button, Field, Quantity, Segmented, Select, Skeleton, StatePanel, cn } from '@platlab/ui';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, History, Scale } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { dayInZone, formatDate } from '../../app/format';
import { MovementAmount } from '../../app/movement-amount';
import { QueryErrorState } from '../../app/states';
import { useReagents } from './context';
import { serializeMovementFilters, type MovementFilters } from './movement-filters';
import { MovementFilterBar } from './movement-filter-bar';
import { activeGroups, currentYearIn, groupNames, hourOf, movementsText, periodText, tight, typeSingular } from './movement-text';
import { MovementTotals } from './movement-totals';
import { placeOf, purposeOf } from './operation-text';
import { canReadReports } from './queries';

const groupOptions: ReadonlyArray<{ value: OperationGroupBy; label: string }> = (['product', 'responsible', 'destination', 'month'] as const).map(
  (value) => ({ value, label: groupNames[value] }),
);
const isGroupBy = (value: string): value is OperationGroupBy => groupOptions.some((option) => option.value === value);

/**
 * Las columnas del Detalle cuando la lista mide 48 rem o más (consulta de contenedor: el ancho de la ventana no dice
 * cuánto cabe junto al menú lateral): hora, reactivo y frasco, tipo, motivo y destino, responsable, cantidad y saldo.
 * Más angosta, cada movimiento se apila.
 */
const columns = '@3xl:grid-cols-[6.5rem_minmax(0,1.6fr)_5.5rem_minmax(0,1.6fr)_minmax(0,1.3fr)_5rem_5rem]';

/**
 * Movimientos como informe (R-01C, ADR 0014 y 0021): el libro por días (Detalle) o sus totales, con la barra de
 * filtros sobre la lista. Los filtros viven en la URL: la cifra del Resumen abre exactamente su lista y un informe
 * es un enlace. Se aplican al marcarlos.
 */
export function ReagentsMovementsPage() {
  const { workspaceId, me, base, operations, movementFilters: filters, operationQuery, operationFacets, operationTotals } = useReagents();
  const [, setParams] = useSearchParams();
  const timeZone = me.workspace.timeZone;
  const canReport = canReadReports(me);
  const view = canReport ? filters.view : 'detail';
  const apply = (change: Partial<MovementFilters>) =>
    setParams(serializeMovementFilters({ ...filters, ...change }), { replace: true });
  const active = activeGroups(filters);
  const total = operationFacets.data?.total;
  const currentYear = currentYearIn(timeZone);
  // La lista anterior queda atenuada, sin saltos, mientras llega la respuesta de un filtro nuevo.
  const stale = view === 'totals' ? operationTotals.isPlaceholderData : operations.isPlaceholderData;
  const settled = operationFacets.data !== undefined && !operationFacets.isPlaceholderData;

  const clearAll = () =>
    setParams(serializeMovementFilters({ ...filters, types: [], productIds: [], responsibleIds: [], destinations: [], reasons: [], locationIds: [], period: { kind: 'all' } }), {
      replace: true,
    });

  return (
    <div className="grid min-w-0 gap-4">
      {/* La barra de filtros, a todo el ancho; debajo, la vista y la cuenta. */}
      <MovementFilterBar
        workspaceId={workspaceId}
        filters={filters}
        query={operationQuery}
        facets={operationFacets}
        currentYear={currentYear}
        onChange={apply}
        onClear={clearAll}
      />
      {/* Anuncia el total al cambiar los filtros, sin mover el foco. */}
      <p role="status" className="sr-only">
        {settled && total !== undefined ? `${movementsText(total)}. ${periodText(filters.period, currentYear)}.` : ''}
      </p>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        {canReport ? (
          <>
            <Segmented
              label="Vista"
              value={view}
              options={[
                { value: 'detail', label: 'Detalle' },
                { value: 'totals', label: 'Totales' },
              ]}
              onValueChange={(next) => apply({ view: next })}
            />
            {view === 'totals' ? (
              <div className="w-full max-w-[14rem]">
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
          </>
        ) : null}
        {/* La cuenta se dice en voz baja: las filas ya están a la vista. `div`, no `p`: el esqueleto es un bloque. */}
        <div className="ml-auto self-center text-sm tabular-nums text-ink-muted">
          {total === undefined ? (
            <Skeleton className="h-5 w-44" />
          ) : (
            <>
              <span>{movementsText(total)}</span>
              <span> · {periodText(filters.period, currentYear)}</span>
            </>
          )}
        </div>
      </div>

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
            onClearFilters={clearAll}
          />
        )}
      </div>
      {view === 'detail' && operations.hasNextPage ? (
        <div className="text-center">
          <Button variant="ghost" size="sm" loading={operations.isFetchingNextPage} onClick={() => void operations.fetchNextPage()}>
            Cargar movimientos anteriores
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Esqueleto con la forma real: filas con las mismas columnas que el Detalle (nombre, tipo, cantidad…). */
function MovementsSkeleton() {
  return (
    <div className="@container" role="status" aria-busy="true" aria-label="Cargando">
      <div className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 sm:px-5 @3xl:min-h-[4.5rem]', columns)}
          >
            <Skeleton className="hidden h-4 w-20 @3xl:block" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
            <Skeleton className="hidden h-4 w-16 @3xl:block" />
            <Skeleton className="hidden h-4 w-3/4 @3xl:block" />
            <Skeleton className="hidden h-4 w-2/3 @3xl:block" />
            <Skeleton className="h-4 w-20 justify-self-end" />
            <Skeleton className="hidden h-4 w-16 justify-self-end @3xl:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

const typeLabel: Record<Operation['type'], { label: string; icon: typeof Scale }> = {
  receipt: { label: typeSingular.receipt, icon: ArrowDownToLine },
  issue: { label: typeSingular.issue, icon: ArrowUpFromLine },
  adjustment: { label: typeSingular.adjustment, icon: Scale },
  transfer: { label: typeSingular.transfer, icon: ArrowLeftRight },
};

/** El libro en una sola tarjeta, como el Historial de Mantenimiento: cada fila es un movimiento que abre la ficha del reactivo. El periodo se acota con su filtro. */
function MovementsView({
  operations,
  base,
  timeZone,
  filtered,
  onClearFilters,
}: {
  operations: Operation[];
  base: string;
  timeZone: string;
  filtered: boolean;
  onClearFilters: () => void;
}) {
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
    <div className="@container">
      <div className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-raised">
        {/* Encabezado solo visual: cada celda dice su rótulo al lector de pantalla. */}
        <div aria-hidden className={cn('hidden gap-x-3 px-5 py-2.5 text-[13px] font-medium text-ink-muted @3xl:grid', columns)}>
          <span>Fecha</span>
          <span>Reactivo y frasco</span>
          <span>Tipo</span>
          <span>Motivo y destino</span>
          <span>Responsable</span>
          <span className="text-right">Cantidad</span>
          <span className="text-right">Saldo</span>
        </div>
        <ul className="divide-y divide-line">
          {operations.map((operation) => (
            <li key={operation.entryId}>
              <MovementRow operation={operation} to={`${base}/inventario/${operation.product.id}`} timeZone={timeZone} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Un asiento del libro: fecha y hora, reactivo con el código de su frasco, tipo, motivo y destino con el lugar, responsable y
 * quién lo pidió; cantidad con signo y saldo a la derecha. Desde 48 rem de lista son columnas de hasta dos líneas (el lugar y el
 * responsable, una) que se cortan con su texto completo en el `title`; más angosta se apila y nada se corta. Nada se edita aquí.
 */
function MovementRow({ operation, to, timeZone }: { operation: Operation; to: string; timeZone: string }) {
  const kind = typeLabel[operation.type];
  const Icon = kind.icon;
  const purpose = purposeOf(operation);
  const place = [placeOf(operation), operation.reference].filter(Boolean).join(' · ');
  const actor = operation.actor.displayName ?? 'Miembro anterior';
  const requestedBy = operation.requestedBy ? `Pidió ${operation.requestedBy.displayName ?? 'un miembro anterior'}` : null;
  const hour = hourOf(operation.effectiveAt, timeZone);
  const day = formatDate(dayInZone(operation.effectiveAt, timeZone));
  return (
    <Link
      to={to}
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-sunken/60 focus-visible:-outline-offset-2 sm:px-5 @3xl:min-h-[4.5rem] @3xl:items-center',
        columns,
      )}
    >
      <div className="min-w-0 @3xl:col-start-2 @3xl:row-start-1">
        <p className="break-words font-semibold text-ink @3xl:line-clamp-2" title={tight(operation.product.name)}>
          {tight(operation.product.name)}
        </p>
        <p className="mt-1 @3xl:mt-0.5">
          <CodeTag>{operation.container?.code ?? operation.lot.code}</CodeTag>
        </p>
      </div>
      {/* Apilados, la cantidad y el saldo van a la derecha del nombre; en columnas, cada uno a la suya. */}
      <div className="text-right @3xl:contents">
        <p className="text-sm @3xl:col-start-6 @3xl:row-start-1">
          <span className="sr-only">Cantidad: </span>
          <MovementAmount type={operation.type} quantity={operation.quantity} unit={operation.unit} />
        </p>
        <p className="text-[13px] text-ink-muted @3xl:col-start-7 @3xl:row-start-1 @3xl:text-sm">
          <span className="@3xl:sr-only">Saldo </span>
          <Quantity value={operation.balanceAfter} unit={operation.unit} className="text-ink-muted" />
        </p>
      </div>
      {/* Apilado, lo demás va debajo: el motivo y el lugar en su línea; el tipo, la hora y el responsable, en la siguiente. */}
      <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted @3xl:contents">
        <div className="min-w-0 basis-full @3xl:col-start-4 @3xl:row-start-1 @3xl:basis-auto">
          <p className="break-words @3xl:line-clamp-2 @3xl:text-sm @3xl:text-ink" title={purpose ?? undefined}>
            <span className="sr-only">Motivo: </span>
            {purpose ?? <span aria-hidden>—</span>}
          </p>
          {place ? (
            <p className="break-words @3xl:truncate" title={place}>
              {place}
            </p>
          ) : null}
        </div>
        <time dateTime={operation.effectiveAt} className="tabular-nums @3xl:col-start-1 @3xl:row-start-1 @3xl:text-sm @3xl:text-ink">
          {day}
          <span className="@3xl:hidden"> · </span>
          <span className="@3xl:block @3xl:text-[13px] @3xl:text-ink-muted">{hour}</span>
        </time>
        {/* Tipo en tinta neutra: el color solo cuenta el sentido de la cifra, y esa ya lo dice con su signo. */}
        <span className="inline-flex items-center gap-1.5 @3xl:col-start-3 @3xl:row-start-1 @3xl:text-sm @3xl:text-ink">
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Tipo: </span>
          {kind.label}
        </span>
        <div className="min-w-0 @3xl:col-start-5 @3xl:row-start-1">
          <p className="break-words @3xl:truncate @3xl:text-sm @3xl:text-ink" title={actor}>
            <span className="sr-only">Responsable: </span>
            {actor}
          </p>
          {/* Una salida aprobada (ADR 0012) lleva a quien la aprobó y, en la segunda línea, a quien la pidió. */}
          {requestedBy ? (
            <p className="break-words @3xl:line-clamp-2" title={requestedBy}>
              {requestedBy}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
