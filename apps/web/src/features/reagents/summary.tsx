import { Skeleton, StatCard, type StatCardProps } from '@platlab/ui';
import {
  ArrowRight,
  PackagePlus,
  CalendarClock,
  CalendarX,
  CircleCheck,
  Clock,
  FlaskConical,
  ScanLine,
  TrendingDown,
} from 'lucide-react';
import { Link } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { ModuleMark } from '../../app/module-mark';
import { QueryErrorState } from '../../app/states';
import { TrendChart } from '../../app/trend-chart';
import { useReagents, type Allowed, type SheetRequest } from './context';

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
function QuickActions({ allowed, openSheet }: { allowed: Allowed; openSheet: (request: SheetRequest) => void }) {
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
          {/* «Escanear» (14-10-2026) ocupa el lugar de «Registrar salida»: lo puede usar quien lee Reactivos. */}
          <button
            type="button"
            onClick={() => openSheet({ kind: 'scan' })}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-surface px-6 text-sm font-bold text-action shadow-lg transition-[background-color,transform] duration-150 hover:bg-action-soft motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98]"
          >
            <ScanLine className="size-[18px]" aria-hidden />
            Escanear
          </button>
          {allowed.receipt ? (
            <button
              type="button"
              onClick={() => openSheet({ kind: 'ingress' })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-white/40 px-5 text-sm font-medium backdrop-blur-sm transition-colors duration-150 hover:bg-white/10"
            >
              <PackagePlus className="size-[18px]" aria-hidden />
              Nuevo reactivo
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
  const { me, base, summary, allowed, openSheet } = useReagents();

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
          <QuickActions allowed={allowed} openSheet={openSheet} />
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
