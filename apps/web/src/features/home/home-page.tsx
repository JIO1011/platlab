import type { HomeResponse } from '@platlab/contracts';
import { Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, Boxes, LayoutGrid } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { moduleApps, moduleIcons, useShell } from '../../app/app-shell';
import { useHome } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { Sparkline } from '../../app/trend-chart';

/** Fecha de hoy en la zona del espacio, con mayúscula inicial: «Jueves, 2 de octubre». */
function formatToday(timeZone: string): string {
  const text = new Intl.DateTimeFormat('es-EC', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Saludo según la hora en la zona del espacio, la misma que usan fechas y movimientos. */
function greeting(timeZone: string): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Cifras de cada módulo en su tarjeta, con claves propias de su resumen (01 §7). */
const counters: Record<string, Array<{ key: string; label: (n: number) => string }>> = {
  reagents: [
    { key: 'productsWithStock', label: (n) => (n === 1 ? 'reactivo con existencias' : 'reactivos con existencias') },
    { key: 'positionsWithStock', label: (n) => (n === 1 ? 'ubicación con existencias' : 'ubicaciones con existencias') },
  ],
};

/** Qué cuenta el gráfico de cada módulo, para la frase que lo acompaña. */
const trendNouns: Record<string, { one: string; many: string }> = {
  reagents: { one: 'salida', many: 'salidas' },
};

type Card = HomeResponse['cards'][number];

/**
 * Inicio (ADR 0011): un tablero con una tarjeta por módulo. Cada tarjeta resume el módulo con
 * cifras y, si hay datos, un gráfico pequeño; toda la tarjeta abre la app del módulo.
 */
export function HomePage() {
  const { workspaceId, me } = useShell();
  const home = useHome(workspaceId);
  const firstName = me.member.displayName.split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-display text-ink">
        {greeting(me.workspace.timeZone)}, {firstName}
      </h1>
      <p className="mt-2 text-body-lg text-ink-muted">{formatToday(me.workspace.timeZone)}</p>

      <section className="mt-8" aria-label="Módulos">
        {home.isPending ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : home.isError ? (
          <QueryErrorState error={home.error} onRetry={() => void home.refetch()} />
        ) : home.data.cards.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={LayoutGrid}
              title="No hay módulos para tu rol en este espacio"
              description={
                me.member.isOwner
                  ? 'Este espacio todavía no tiene módulos habilitados. Se habilitan por contrato con el Equipo PlatLab.'
                  : 'Los módulos se habilitan por contrato y se muestran según tu rol. Si esperabas ver alguno, consúltalo con quien administra el espacio.'
              }
            />
          </div>
        ) : (
          // Cada tarjeta mide al menos 20rem: junto al menú lateral de la tableta no se estrecha.
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
            {home.data.cards.map((card) => (
              <ModuleCard key={card.moduleCode} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Tarjeta de un módulo: nombre, cifras y gráfico; abre la app del módulo. */
function ModuleCard({ card }: { card: Card }) {
  const { workspaceId, me } = useShell();
  const statsId = useId();
  const app = moduleApps(me).find((entry) => entry.code === card.moduleCode);
  if (!app) return null;
  const Icon = moduleIcons[card.moduleCode] ?? Boxes;
  const noun = trendNouns[card.moduleCode] ?? { one: 'movimiento', many: 'movimientos' };
  const trendTotal = card.trend?.points.reduce((sum, point) => sum + point.value, 0) ?? 0;

  return (
    <Link
      to={`/e/${workspaceId}/${app.path}`}
      aria-label={`Abrir ${card.name}`}
      aria-describedby={statsId}
      className="group flex min-h-64 flex-col rounded-card bg-surface p-6 shadow-raised transition-shadow duration-150 hover:shadow-float"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-action-soft text-action">
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-ink">{card.name}</h2>
        <ArrowRight
          className="ml-auto size-5 text-action transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
      <div id={statsId} className="mt-auto pt-8">
        <dl className="grid grid-cols-2 gap-4">
          {(counters[card.moduleCode] ?? []).map((counter) => {
            const value = card.summary?.[counter.key] ?? 0;
            return (
              <div key={counter.key} className="flex flex-col-reverse gap-1">
                <dt className="text-sm text-ink-muted">{counter.label(value)}</dt>
                <dd className="text-metric-sm text-ink">{value}</dd>
              </div>
            );
          })}
        </dl>
        <div className="mt-6">
          {card.trend ? <Sparkline points={card.trend.points} /> : null}
          <p className="mt-2 text-[13px] text-ink-muted">
            {trendTotal === 0
              ? `Sin ${noun.many} en los últimos 30 días`
              : `${trendTotal} ${trendTotal === 1 ? noun.one : noun.many} en los últimos 30 días`}
          </p>
        </div>
      </div>
    </Link>
  );
}
