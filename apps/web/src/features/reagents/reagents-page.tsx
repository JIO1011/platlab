import type { Operation } from '@platlab/contracts';
import {
  Button,
  Quantity,
  Skeleton,
  StatCard,
  StatePanel,
  type StatCardProps,
  cn,
} from '@platlab/ui';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpFromLine,
  CalendarClock,
  CalendarX,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Eye,
  FlaskConical,
  History,
  Plus,
  RefreshCw,
  Scale,
  TrendingDown,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { ModuleMark } from '../../app/module-mark';
import { moduleApps, useShell } from '../../app/app-shell';
import { addDays, formatAgo } from '../../app/format';
import {
  useIssueRequests,
  useOperations,
  usePositions,
  useProducts,
  useReagentsKey,
  useReagentsSummary,
  type OperationFilter,
} from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { TrendChart } from '../../app/trend-chart';
import { useReagents, type Allowed, type ReagentsContext, type SheetRequest } from './context';
import { purposeOf } from './operation-text';
import { AdjustmentSheet, CountSheet, IssueSheet, MinimumSheet, NewProductSheet, ReceiptSheet, TransferSheet } from './sheets';

export { ReagentsInventoryPage, ReagentsProductPage } from './inventory';
export { ReagentsRequestsPage } from './requests';

/**
 * La hoja se monta de nuevo en cada apertura (clave nueva: formulario limpio y clave idempotente
 * nueva) y sigue montada al cerrarse para que su salida pueda animarse.
 */
function useSheets() {
  const [state, setState] = useState<{ open: boolean; id: number; request: SheetRequest } | null>(null);
  return {
    current: state,
    open: (request: SheetRequest) => setState((previous) => ({ open: true, id: (previous?.id ?? 0) + 1, request })),
    close: () => setState((previous) => (previous ? { ...previous, open: false } : previous)),
  };
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/**
 * Filtro del historial en la URL, para que la cifra del Resumen abra exactamente su lista:
 * `?tipo=salida&dias=30` son las salidas de los últimos 30 días, la misma ventana del gráfico.
 */
const typeParams = { ingreso: 'receipt', salida: 'issue', ajuste: 'adjustment', traslado: 'transfer' } as const;

function readOperationFilter(params: URLSearchParams): OperationFilter {
  const type = typeParams[params.get('tipo') as keyof typeof typeParams] as OperationFilter['type'];
  const days = Number(params.get('dias'));
  return { type, days: Number.isInteger(days) && days >= 1 && days <= 90 ? days : undefined };
}

/**
 * La app de Reactivos (ADR 0011): una cabecera común con el título de la sección, las acciones que
 * permite el rol y las hojas de registro; cada sección se dibuja debajo. Las acciones viven aquí
 * para que registrar una salida esté a un clic desde cualquier sección.
 */
export function ReagentsLayout() {
  const { workspaceId, me } = useShell();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const reagentsKey = useReagentsKey(workspaceId);
  const operationFilter = readOperationFilter(params);
  const products = useProducts(workspaceId);
  const positions = usePositions(workspaceId);
  const operations = useOperations(workspaceId, operationFilter);
  const sheets = useSheets();
  const now = useNow(15_000);

  const module = me.modules.find((entry) => entry.code === 'reagents');
  const canOperate = module?.access.includes('new_operation') ?? false;
  const can = (permission: string) => canOperate && me.permissions.includes(permission);
  const allowed: Allowed = {
    product: can('reagents.catalog.manage'),
    receipt: can('reagents.receipt.create'),
    issue: can('reagents.issue.create'),
    adjustment: can('reagents.adjustment.create'),
    lists: can('reagents.catalog.manage'),
    approve: can('reagents.issue.approve'),
    transfer: can('reagents.transfer.create'),
  };
  const canResolve = module?.access.includes('resolve_pending') ?? false;

  const app = moduleApps(me).find((entry) => entry.code === 'reagents');
  const base = `/e/${workspaceId}/${app?.path ?? 'reactivos'}`;
  const [sectionPath = '', detailId] = pathname.slice(base.length + 1).split('/');
  const section = app?.sections.find((entry) => entry.path === sectionPath);
  // El Resumen es la portada de la app: lleva el nombre del módulo; las demás, el de su sección.
  const productList = products.data?.items ?? [];
  // La ficha (inventario/:id, ADR 0012) lleva el nombre del reactivo; el Resumen, el del módulo.
  const detailName = detailId ? productList.find((entry) => entry.id === detailId)?.name : undefined;
  const title =
    detailId !== undefined
      ? (detailName ?? 'Reactivo')
      : sectionPath === ''
        ? (module?.name ?? 'Reactivos')
        : (section?.label ?? module?.name ?? 'Reactivos');
  const summary = useReagentsSummary(workspaceId, sectionPath === '');
  const requests = useIssueRequests(workspaceId, params.get('estado') === 'todas', sectionPath === 'solicitudes');

  const positionList = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  // Por debajo de 1024 px (móvil y tableta), la primaria ocupa su fila y las secundarias van de dos
  // en dos: si son impares, la última toma la fila entera para no dejar un hueco.
  // En la ficha (ADR 0012) las acciones se acotan a ese reactivo: ingreso y salida con él ya
  // elegido; «Nuevo reactivo» no corresponde y «Ajustar» vive en cada frasco.
  const inProduct = detailId !== undefined;
  const secondaryActions = [
    { kind: 'product', label: 'Nuevo reactivo', icon: Plus, shown: allowed.product && !inProduct },
    { kind: 'receipt', label: 'Registrar ingreso', icon: ArrowDownToLine, shown: allowed.receipt },
    { kind: 'adjustment', label: 'Ajustar', icon: Scale, shown: allowed.adjustment && positionList.length > 0 && !inProduct },
    // Conteo por ubicación (ADR 0012, entrega 4): tarea del inventario, no de cada reactivo.
    { kind: 'count', label: 'Conteo', icon: ClipboardCheck, shown: allowed.adjustment && sectionPath === 'inventario' && !inProduct },
  ] as const;
  const visibleSecondary = secondaryActions.filter((action) => action.shown);
  // «Actualizado hace…» informa lo más antiguo de lo que la sección muestra, nunca lo más fresco.
  const shown: Array<{ dataUpdatedAt: number }> =
    sectionPath === ''
      ? [summary]
      : sectionPath === 'movimientos'
        ? [operations]
        : sectionPath === 'solicitudes'
          ? [requests]
          : [products, positions];
  const stamps = shown.map((query) => query.dataUpdatedAt).filter((stamp) => stamp > 0);
  const updatedAt = stamps.length === shown.length ? Math.min(...stamps) : 0;
  const refreshing = useIsFetching({ queryKey: reagentsKey }) > 0;

  if (products.isError || positions.isError) {
    return (
      <QueryErrorState
        error={products.error ?? positions.error}
        onRetry={() => {
          void products.refetch();
          void positions.refetch();
        }}
      />
    );
  }

  const current = sheets.current;
  const sheetProps = (kind: SheetRequest['kind']) => ({
    workspaceId,
    open: current?.open === true && current.request.kind === kind,
    onOpenChange: (open: boolean) => {
      if (!open) sheets.close();
    },
  });

  // El Resumen cabe en una ventana en escritorio (ADR 0012, 05-10-2026): ocupa el alto que deja el
  // shell (barra superior y rellenos del main) y reparte el resto entre sus tarjetas.
  const fitsWindow = sectionPath === '' && detailId === undefined;

  return (
    <div className={cn('mx-auto max-w-6xl', fitsWindow && 'fit:flex fit:h-[calc(100dvh-8rem-1px)] fit:flex-col')}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className={cn('min-w-0', fitsWindow && 'fit:flex fit:flex-wrap fit:items-baseline fit:gap-x-4')}>
          <h1 className="text-display text-ink">{title}</h1>
          <p className={cn('mt-1 flex items-center gap-2 text-[13px] text-ink-muted', fitsWindow && 'fit:mt-0')}>
            {updatedAt > 0 ? <span>Actualizado {formatAgo(updatedAt, now)}</span> : <span>Cargando…</span>}
            <button
              type="button"
              // Todo lo de Reactivos: las consultas activas se vuelven a pedir y las demás quedan viejas.
              onClick={() => void queryClient.invalidateQueries({ queryKey: reagentsKey })}
              className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-medium text-action transition-colors hover:bg-action-soft"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </p>
        </div>
        {/* En el Resumen, la tarjeta de acción rápida hace de acciones (ADR 0010, 04-10-2026); en Solicitudes, la tarea es decidir, y «Aprobar salida» es la primaria. */}
        {sectionPath !== '' && sectionPath !== 'solicitudes' ? (
          <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-wrap">
            {visibleSecondary.map(({ kind, label, icon: Icon }, index) => (
              <Button
                key={kind}
                className={cn(index === visibleSecondary.length - 1 && index % 2 === 0 && 'col-span-2 lg:col-span-1')}
                onClick={() => sheets.open(kind === 'receipt' && detailId ? { kind, productId: detailId } : { kind })}
              >
                <Icon aria-hidden />
                {label}
              </Button>
            ))}
            {allowed.issue && positionList.length > 0 ? (
              <Button
                variant="primary"
                className="order-first col-span-2 lg:order-none"
                onClick={() => sheets.open(detailId ? { kind: 'issue', productId: detailId } : { kind: 'issue' })}
              >
                <ArrowUpFromLine aria-hidden />
                {allowed.approve ? 'Registrar salida' : 'Solicitar salida'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {!canOperate ? (
        <p role="status" className="mt-5 flex items-center gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
          <Eye className="size-4 shrink-0" aria-hidden />
          Reactivos está en modo consulta: puedes ver el inventario y el historial, pero no registrar movimientos.
        </p>
      ) : null}

      <div className={cn('mt-6', fitsWindow && 'fit:mt-3 fit:min-h-0 fit:flex-1 fit-tall:mt-6')}>
        <Outlet
          context={
            {
              workspaceId,
              me,
              base,
              allowed,
              products,
              productList,
              positions,
              positionList,
              operations,
              operationFilter,
              summary,
              requests,
              canResolve,
              openSheet: sheets.open,
            } satisfies ReagentsContext
          }
        />
      </div>

      {current?.request.kind === 'product' ? <NewProductSheet key={current.id} {...sheetProps('product')} /> : null}
      {current?.request.kind === 'receipt' ? (
        <ReceiptSheet key={current.id} {...sheetProps('receipt')} products={productList} productId={current.request.productId} />
      ) : null}
      {current?.request.kind === 'issue' ? (
        <IssueSheet
          key={current.id}
          {...sheetProps('issue')}
          positions={positionList}
          positionId={current.request.positionId}
          productId={current.request.productId}
          timeZone={me.workspace.timeZone}
          canManageLists={allowed.lists}
          needsApproval={!allowed.approve}
        />
      ) : null}
      {current?.request.kind === 'minimum' ? (
        <MinimumSheet
          key={current.id}
          {...sheetProps('minimum')}
          product={productList.find((entry) => entry.id === (current.request.kind === 'minimum' ? current.request.productId : ''))}
        />
      ) : null}
      {current?.request.kind === 'count' ? <CountSheet key={current.id} {...sheetProps('count')} /> : null}
      {current?.request.kind === 'transfer' ? (
        <TransferSheet
          key={current.id}
          {...sheetProps('transfer')}
          position={positionList.find((entry) => entry.id === (current.request.kind === 'transfer' ? current.request.positionId : ''))}
        />
      ) : null}
      {current?.request.kind === 'adjustment' ? (
        <AdjustmentSheet
          key={current.id}
          {...sheetProps('adjustment')}
          positions={positionList}
          positionId={current.request.positionId}
          canManageLists={allowed.lists}
        />
      ) : null}
    </div>
  );
}

/** Indicador del Resumen que abre la lista que lo explica (ADR 0011): el enlace envuelve la tarjeta. */
function StatLink({ to, ...stat }: { to: string } & StatCardProps) {
  return (
    <Link to={to} className="group block rounded-card focus-visible:outline-offset-4">
      <StatCard {...stat} />
    </Link>
  );
}

/**
 * Acción rápida (ADR 0010, 04-10-2026) en banda compacta (ADR 0012, 05-10-2026): el degradado del
 * acento con las acciones de ingreso y salida, debajo de los indicadores para no empujar los datos.
 * Sustituye a las acciones de la cabecera en el Resumen: sus botones son la acción primaria.
 */
function QuickActions({ allowed, canIssue, openSheet }: { allowed: Allowed; canIssue: boolean; openSheet: (request: SheetRequest) => void }) {
  const issue = canIssue && allowed.issue;
  if (!issue && !allowed.receipt) return null;
  return (
    <section
      aria-labelledby="acciones-rapidas"
      className="@container relative shrink-0 overflow-hidden rounded-card bg-linear-to-br from-action to-action-deep px-6 py-[30px] text-on-action xl:py-[60px] fit:py-[26px] fit-tall:py-[60px] shadow-xl shadow-action/20 md:px-7"
    >
      {/* Se adapta a su ancho, no al de la pantalla: en el Resumen comparte fila con la actividad. */}
      <div className="relative z-10 flex flex-col gap-4 @2xl:flex-row @2xl:items-center @2xl:justify-between">
        <div className="min-w-0 max-w-xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 id="acciones-rapidas" className="text-2xl font-bold tracking-tight">
              Registrar movimiento
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-md">
              <FlaskConical className="size-3.5" aria-hidden />
              Gestión rápida
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-on-action/90">
            {allowed.approve
              ? 'Las salidas que piden los Operadores te esperan en Solicitudes.'
              : 'La salida que pidas queda apartada hasta que la aprueben.'}
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap @2xl:shrink-0">
          {issue ? (
            <button
              type="button"
              onClick={() => openSheet({ kind: 'issue' })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-surface px-6 text-sm font-bold text-action shadow-lg transition-[background-color,transform] duration-150 hover:bg-action-soft motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98]"
            >
              <ArrowUpFromLine className="size-[18px]" aria-hidden />
              {allowed.approve ? 'Registrar salida' : 'Solicitar salida'}
            </button>
          ) : null}
          {allowed.receipt ? (
            <button
              type="button"
              onClick={() => openSheet({ kind: 'receipt' })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-white/40 px-5 text-sm font-medium backdrop-blur-sm transition-colors duration-150 hover:bg-white/10"
            >
              <ArrowDownToLine className="size-[18px]" aria-hidden />
              Registrar ingreso
            </button>
          ) : null}
        </div>
      </div>
      <ModuleMark code="reagents" className="pointer-events-none absolute -bottom-10 right-6 size-44 rotate-12 text-white/15" />
      <div className="pointer-events-none absolute right-40 top-0 size-28 rounded-full bg-white/20 blur-3xl" aria-hidden />
    </section>
  );
}

/**
 * Resumen (ADR 0012, 05-10-2026): primero los indicadores, por urgencia (lo que espera una decisión,
 * lo vencido, lo que vence pronto y el tamaño del inventario); después la acción rápida, y abajo
 * el gráfico de salidas con su total y la actividad reciente.
 */
export function ReagentsSummaryPage() {
  const { me, base, summary, allowed, positionList, openSheet } = useReagents();

  if (summary.isPending) {
    return (
      // Replica la estructura real (indicadores, banda y dos paneles) para que no haya salto al cargar.
      <div className="grid gap-5 sm:gap-6" role="status" aria-busy="true" aria-label="Cargando">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28 rounded-card" />
          ))}
        </div>
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 xl:grid-cols-12">
          <div className="grid gap-5 sm:gap-6 xl:col-span-7">
            <Skeleton className="h-40 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
          </div>
          <Skeleton className="h-96 rounded-card xl:col-span-5" />
        </div>
      </div>
    );
  }
  if (summary.isError) return <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />;

  const { summary: counters, trend, activity } = summary.data;
  const issues = trend?.points.reduce((sum, point) => sum + point.value, 0) ?? 0;
  const pending = counters.pendingRequests;
  const expired = counters.expiredContainers;
  const expiring = counters.expiringContainers;
  const approves = me.permissions.includes('reagents.issue.approve');
  // Lo pendiente de decidir va en ámbar y solo si existe; sin pendientes, «Al día» en verde.
  const pendingHint =
    pending === 0
      ? 'Al día'
      : approves
        ? pending === 1
          ? '1 salida espera tu aprobación'
          : `${pending} salidas esperan tu aprobación`
        : pending === 1
          ? 'Tienes 1 solicitud de salida pendiente'
          : `Tienes ${pending} solicitudes de salida pendientes`;
  const belowMinimum = counters.belowMinimum;
  const frascos = (n: number) => (n === 1 ? '1 frasco' : `${n} frascos`);
  const reactivos = (n: number) => (n === 1 ? '1 reactivo' : `${n} reactivos`);

  return (
    // En una ventana: indicadores arriba y, debajo, dos columnas que llenan el resto. A la izquierda,
    // la acción rápida y el gráfico, que crece; a la derecha, la actividad, a la altura de la acción
    // rápida y con desplazamiento propio. En pantallas menores, todo fluye en una columna.
    <div className="grid grid-cols-1 gap-5 sm:gap-6 fit:h-full fit:grid-rows-[auto_minmax(0,1fr)] fit:gap-4 fit-tall:gap-6">
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4 fit:gap-4 fit-tall:gap-6">
        <StatLink
          to={`${base}/solicitudes`}
          label={approves ? 'Por aprobar' : 'Mis solicitudes'}
          value={pending}
          hint={pendingHint}
          hintTone={pending === 0 ? 'success' : 'warning'}
          icon={pending === 0 ? CircleCheck : Clock}
          tone={pending === 0 ? 'success' : 'warning'}
          compact
        />
        {/* Vencidos y por vencer (02 §12): frascos con saldo. Sin ellos no hay estado que decir. */}
        <StatLink
          to={expired ? `${base}/inventario?caducidad=vencidos` : `${base}/inventario`}
          label="Vencidos"
          value={expired}
          hint={expired === 0 ? 'Ninguno' : expired === 1 ? 'frasco con saldo' : 'frascos con saldo'}
          hintTone={expired === 0 ? 'neutral' : 'danger'}
          icon={CalendarX}
          tone={expired === 0 ? 'neutral' : 'danger'}
          compact
        />
        <StatLink
          to={expiring ? `${base}/inventario?caducidad=por-vencer` : `${base}/inventario`}
          label="Por vencer"
          value={expiring}
          hint={expiring === 0 ? 'Nada en 30 días' : `${expiring === 1 ? 'frasco' : 'frascos'} en 30 días`}
          hintTone={expiring === 0 ? 'neutral' : 'warning'}
          icon={CalendarClock}
          tone={expiring === 0 ? 'neutral' : 'warning'}
          compact
        />
        {/* Bajo mínimo (ADR 0012, 05-10-2026): existencia física por debajo del mínimo de cada reactivo.
            El tamaño del inventario, que antes tenía su tarjeta, queda como dato secundario. */}
        {/* Sin mínimos fijados, un 0 no quiere decir «todo bien»: se dice y no se filtra. */}
        <StatLink
          to={belowMinimum ? `${base}/inventario?minimo=bajo` : `${base}/inventario`}
          label="Bajo mínimo"
          value={belowMinimum}
          hint={
            counters.productsWithMinimum === 0
              ? 'Sin mínimos fijados'
              : `Inventario: ${reactivos(counters.productsWithStock)} · ${frascos(counters.containersWithStock)}`
          }
          hintTone="neutral"
          icon={TrendingDown}
          tone={belowMinimum === 0 ? 'neutral' : 'warning'}
          compact
        />
      </section>
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 xl:grid-cols-12 fit:min-h-0 fit:gap-4 fit-tall:gap-6">
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-7 fit:min-h-0 fit:gap-4 fit-tall:gap-6">
          <QuickActions allowed={allowed} canIssue={positionList.length > 0} openSheet={openSheet} />
          {/* Crece hasta llenar la columna, pero nunca por debajo de su contenido. */}
          <article className="flex min-w-0 flex-col rounded-card bg-surface p-6 shadow-raised fit:flex-1 fit:p-5">
            {/* El total va con su gráfico (ADR 0012, 05-10-2026), junto al título y a la izquierda, para
                que la etiqueta del día, arriba a la derecha, no lo tape. Sin salidas, lo dice el aviso. */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-bold text-ink">Salidas por día</h2>
              {trend ? (
                <Link
                  to={`${base}/movimientos?tipo=salida&dias=30`}
                  className="group/total inline-flex items-baseline gap-1.5 rounded-control"
                >
                  <span className="text-2xl font-bold tracking-tight text-ink tabular-nums transition-colors group-hover/total:text-action">
                    {issues}
                  </span>
                  <span className="text-sm font-medium text-ink-muted">{issues === 1 ? 'salida' : 'salidas'} en 30 días</span>
                </Link>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">En las ubicaciones que puedes consultar.</p>
            {/* Aire para la marca superior del eje, que asoma por encima del área del gráfico. */}
            <div className="mt-6 fit:min-h-0 fit:flex-1">
              {trend ? (
                <TrendChart title="Salidas por día, últimos 30 días" points={trend.points} unit={{ one: 'salida', many: 'salidas' }} fill />
              ) : (
                // Sin salidas no hay gráfico: uno vacío no informa (ADR 0011).
                <p className="rounded-panel bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted">
                  No hubo salidas en los últimos 30 días.
                </p>
              )}
            </div>
          </article>
        </div>
        <article
          aria-labelledby="actividad-reciente"
          className="flex min-w-0 flex-col rounded-card bg-surface p-6 shadow-raised xl:col-span-5 fit:min-h-0 fit:p-5"
        >
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <h2 id="actividad-reciente" className="text-lg font-bold text-ink">
              Actividad reciente
            </h2>
            <Link to={`${base}/movimientos`} className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-action transition-colors hover:text-action-hover">
              Ver movimientos
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {activity.length ? (
            // En una ventana, la lista se desplaza dentro de la tarjeta; se puede enfocar para hacerlo
            // con el teclado. El hilo de la línea de tiempo vive en la lista, y se desplaza con ella.
            <div
              tabIndex={0}
              role="region"
              aria-label="Movimientos recientes"
              // Un desvanecido al pie, sobre el relleno, avisa de que hay más movimientos por debajo.
              className="-mx-2 mt-1 rounded-control px-2 pt-4 fit:min-h-0 fit:flex-1 fit:overflow-y-auto fit:pb-4 fit:pt-3 fit:[mask-image:linear-gradient(to_bottom,black_calc(100%-1rem),transparent)]"
            >
              {/* En una ventana, los movimientos se reparten el alto de la tarjeta: sin huecos al pie. */}
              <ul className="relative flex flex-col gap-6 pb-1 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-0.5 before:bg-line fit:min-h-full fit:justify-between fit:gap-3.5 fit:pb-0">
                {activity.map((entry) => (
                  <li key={entry.id}>
                    <ActivityRow {...entry} timeZone={me.workspace.timeZone} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Todavía no hay movimientos en tus ubicaciones.</p>
          )}
        </article>
      </div>
    </div>
  );
}

const typeFilters = [
  { value: undefined, param: null, label: 'Todos' },
  { value: 'receipt', param: 'ingreso', label: 'Ingresos' },
  { value: 'issue', param: 'salida', label: 'Salidas' },
  { value: 'adjustment', param: 'ajuste', label: 'Ajustes' },
  { value: 'transfer', param: 'traslado', label: 'Traslados' },
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
  const { me, base, operations, operationFilter } = useReagents();
  const [params, setParams] = useSearchParams();
  const filtered = Boolean(operationFilter.type || operationFilter.days);
  const select = (key: 'tipo' | 'dias', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const periodIsStandard = periodFilters.some((period) => period.days === operationFilter.days);
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        <div role="group" aria-label="Tipo de movimiento" className="flex flex-wrap items-center gap-2">
          {typeFilters.map((filter) => (
            <ChoicePill
              key={filter.label}
              label={filter.label}
              active={operationFilter.type === filter.value}
              onSelect={() => select('tipo', filter.param)}
            />
          ))}
        </div>
        <div role="group" aria-label="Periodo" className="flex flex-wrap items-center gap-2">
          {periodFilters.map((period) => (
            <ChoicePill
              key={period.label}
              label={period.label}
              active={operationFilter.days === period.days}
              onSelect={() => select('dias', period.days === undefined ? null : String(period.days))}
            />
          ))}
          {/* Un enlace puede traer otro número de días (hasta 90): se muestra activo y se puede quitar. */}
          {periodIsStandard || !operationFilter.days ? null : (
            <ChoicePill label={`${operationFilter.days} días`} active onSelect={() => select('dias', null)} />
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
