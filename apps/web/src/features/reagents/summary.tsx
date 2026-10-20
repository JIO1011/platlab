import { Skeleton } from '@platlab/ui';
import {
  ArrowRight,
  PackagePlus,
  CalendarClock,
  CalendarX,
  CircleCheck,
  Clock,
  FileWarning,
  FlaskConical,
  Gauge,
  ScanLine,
  TrendingDown,
} from 'lucide-react';
import { Link } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { NoticeCard } from '../../app/notice-card';
import { QuickActions, quickActionPrimary, quickActionSecondary } from '../../app/quick-actions';
import { StatLink } from '../../app/stat-link';
import { QueryErrorState } from '../../app/states';
import { TrendChart } from '../../app/trend-chart';
import { AttentionCard } from './attention-card';
import { useReagents, type Allowed, type SheetRequest } from './context';

/**
 * Acción rápida de Reactivos (ADR 0010, 04-10-2026): ingreso y escaneo. «Escanear» (14-10-2026) ocupa el
 * lugar de «Registrar salida»: lo puede usar quien lee Reactivos.
 */
function ReagentsQuickActions({ allowed, openSheet }: { allowed: Allowed; openSheet: (request: SheetRequest) => void }) {
  return (
    <QuickActions
      moduleCode="reagents"
      title="Registrar movimiento"
      badge={{ icon: FlaskConical, label: 'Gestión rápida' }}
      description={
        allowed.approve
          ? 'Las salidas que piden los Operadores te esperan en Solicitudes.'
          : 'La salida que pidas queda apartada hasta que la aprueben.'
      }
      className="order-1 xl:order-none xl:py-9"
    >
      <button type="button" onClick={() => openSheet({ kind: 'scan' })} className={quickActionPrimary}>
        <ScanLine className="size-[18px]" aria-hidden />
        Escanear
      </button>
      {allowed.receipt ? (
        <button type="button" onClick={() => openSheet({ kind: 'ingress' })} className={quickActionSecondary}>
          <PackagePlus className="size-[18px]" aria-hidden />
          Nuevo reactivo
        </button>
      ) : null}
    </QuickActions>
  );
}

const reactivos = (n: number) => (n === 1 ? '1 reactivo' : `${n} reactivos`);

/**
 * Los avisos del pie, en tarjeta y con su acción (ADR 0021): reactivos sin ficha de seguridad y sin mínimo. Cada uno
 * aparece solo si su cuenta es mayor que cero y abre el Inventario ya filtrado. Salen de los reactivos que ya llegan al
 * Inventario; si no cargan, ya lo dice «Por atender».
 */
function Notices() {
  const { base, products, productList } = useReagents();
  if (products.isPending) return <Skeleton aria-busy="true" className="h-20 rounded-card" />;
  const withoutSheet = productList.filter((product) => product.sdsKind === null).length;
  const withoutMinimum = productList.filter((product) => product.minimum === null).length;
  const action = 'Ver en el Inventario';
  // Avisos cortos: en una fila de dos desde 1280 px, apilados antes.
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {withoutSheet > 0 ? (
        <NoticeCard
          icon={FileWarning}
          title={`${reactivos(withoutSheet)} sin ficha de seguridad`}
          text="Aún no se indica si tienen ficha."
          action={action}
          to={`${base}/inventario?ficha=sin`}
        />
      ) : null}
      {withoutMinimum > 0 ? (
        <NoticeCard
          icon={Gauge}
          tone="neutral"
          title={`${reactivos(withoutMinimum)} sin mínimo`}
          text="No se avisa cuando se acaban."
          action={action}
          to={`${base}/inventario?minimo=sin`}
        />
      ) : null}
    </div>
  );
}

/**
 * Resumen (ADR 0012, 05-10-2026; ADR 0021) con la estructura de los de Equipos y Mantenimiento: primero los
 * indicadores, por urgencia (lo que espera una decisión, lo vencido, lo que vence pronto y el tamaño del
 * inventario); debajo, a la izquierda, la acción rápida y el gráfico de salidas con su total y, a la derecha,
 * «Por atender» y la actividad reciente; al pie, los avisos, solo si los hay. En el móvil, una columna: cifras,
 * acción rápida, por atender, gráfico, actividad y avisos.
 */
export function ReagentsSummaryPage() {
  const { me, base, summary, allowed, openSheet } = useReagents();

  if (summary.isPending) {
    return (
      // Esqueleto quieto con la forma real: cuatro cifras y las tarjetas de las dos columnas.
      <div className="grid gap-5 sm:gap-6" role="status" aria-busy="true" aria-label="Cargando">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28 rounded-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-7">
            <Skeleton className="h-40 rounded-card" />
            <Skeleton className="h-96 rounded-card" />
          </div>
          <div className="flex min-w-0 flex-col gap-5 sm:gap-6 xl:col-span-5">
            <Skeleton className="h-96 rounded-card" />
            <Skeleton className="h-96 rounded-card" />
          </div>
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

  return (
    <div className="grid gap-5 sm:gap-6">
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
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
              : `${frascos(counters.containersWithStock)} en ${reactivos(counters.productsWithStock)}`
          }
          hintTone="neutral"
          icon={TrendingDown}
          tone={belowMinimum === 0 ? 'neutral' : 'warning'}
          compact
        />
      </section>
      {/* En el móvil las columnas se disuelven y `order` fija la lectura; desde xl, cada columna es la suya. */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-12">
        <div className="contents min-w-0 xl:col-span-7 xl:flex xl:flex-col xl:gap-6">
          <ReagentsQuickActions allowed={allowed} openSheet={openSheet} />
          <article className="order-3 flex min-w-0 flex-col rounded-card bg-surface p-6 shadow-raised xl:order-none">
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
            <div className="mt-6">
              {trend ? (
                <TrendChart title="Salidas por día, últimos 30 días" points={trend.points} unit={{ one: 'salida', many: 'salidas' }} />
              ) : (
                // Sin salidas no hay gráfico: uno vacío no informa (ADR 0011).
                <p className="rounded-panel bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted">
                  No hubo salidas en los últimos 30 días.
                </p>
              )}
            </div>
          </article>
        </div>
        <div className="contents min-w-0 xl:col-span-5 xl:flex xl:flex-col xl:gap-6">
          <div className="order-2 min-w-0 xl:order-none">
            <AttentionCard />
          </div>
          <article
            aria-labelledby="actividad-reciente"
            className="order-4 flex min-w-0 flex-col rounded-card bg-surface p-6 shadow-raised xl:order-none"
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
              // El hilo de la línea de tiempo vive en la lista.
              <ul className="relative mt-5 flex flex-col gap-6 pb-1 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-0.5 before:bg-line">
                {/* Cuatro bastan: así las dos columnas terminan parejas. */}
                {activity.slice(0, 4).map((entry) => (
                  <li key={entry.id}>
                    <ActivityRow {...entry} timeZone={me.workspace.timeZone} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">Todavía no hay movimientos en tus ubicaciones.</p>
            )}
          </article>
        </div>
      </div>
      <Notices />
    </div>
  );
}
