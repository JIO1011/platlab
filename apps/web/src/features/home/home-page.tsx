import type { HomeResponse } from '@platlab/contracts';
import { IconChip, Skeleton, StatePanel } from '@platlab/ui';
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

/**
 * Lo pendiente de cada módulo, con las mismas palabras que el aviso de su Resumen: quien aprueba
 * ve lo que espera su decisión; quien pidió, lo que espera la de otro (ADR 0012).
 */
const pendingLabels: Record<string, { permission: string; approver: (n: number) => string; requester: (n: number) => string }> = {
  reagents: {
    permission: 'reagents.issue.approve',
    approver: (n) => (n === 1 ? '1 salida espera tu aprobación' : `${n} salidas esperan tu aprobación`),
    requester: (n) => (n === 1 ? 'Tienes 1 solicitud de salida pendiente' : `Tienes ${n} solicitudes de salida pendientes`),
  },
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
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-display text-ink">
            {greeting(me.workspace.timeZone)}, {firstName}
          </h1>
          <p className="mt-2 text-body-lg font-medium text-ink-muted">Elige un módulo para empezar a trabajar.</p>
        </div>
        <p className="w-fit rounded-full bg-surface-sunken px-3 py-1 text-sm text-ink-muted">{formatToday(me.workspace.timeZone)}</p>
      </div>

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

/** Tarjeta de un módulo: nombre, cifras y gráfico en su color; abre la app del módulo. */
function ModuleCard({ card }: { card: Card }) {
  const { workspaceId, me } = useShell();
  const statsId = useId();
  const pendingId = useId();
  const app = moduleApps(me).find((entry) => entry.code === card.moduleCode);
  if (!app) return null;
  const Icon = moduleIcons[card.moduleCode] ?? Boxes;
  const noun = trendNouns[card.moduleCode] ?? { one: 'movimiento', many: 'movimientos' };
  const trendTotal = card.trend?.points.reduce((sum, point) => sum + point.value, 0) ?? 0;
  const pending = card.summary?.['pendingRequests'] ?? 0;
  const labels = pendingLabels[card.moduleCode];
  const pendingText = labels
    ? me.permissions.includes(labels.permission)
      ? labels.approver(pending)
      : labels.requester(pending)
    : null;

  return (
    // La tarjeta lleva el color de su módulo (ADR 0010): el Inicio se colorea con los módulos.
    <Link
      to={`/e/${workspaceId}/${app.path}`}
      data-module={card.moduleCode}
      aria-label={`Abrir ${card.name}`}
      aria-describedby={pending > 0 && pendingText ? `${pendingId} ${statsId}` : statsId}
      className="group relative flex min-h-64 flex-col overflow-hidden rounded-card bg-surface p-6 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-1"
    >
      {/* Marca de agua del módulo, como en ReactiLab: decorativa y casi invisible. */}
      <Icon
        className="pointer-events-none absolute -bottom-6 -right-6 size-40 text-action-soft/50 transition-transform duration-500 motion-safe:group-hover:scale-110"
        aria-hidden
      />
      <div className="relative flex items-center gap-3">
        <IconChip icon={Icon} />
        <h2 className="text-lg font-bold text-ink">{card.name}</h2>
        <ArrowRight
          className="ml-auto size-5 text-action transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
      {/* Lo pendiente de decidir (ADR 0012) se ve desde el Inicio; es un estado, va en ámbar. */}
      {pending > 0 && pendingText ? (
        <p id={pendingId} className="mt-4 self-start rounded-full bg-warning-soft px-2.5 py-1 text-[13px] font-medium text-warning">
          {pendingText}
        </p>
      ) : null}
      <div id={statsId} className="relative mt-auto pt-8">
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
