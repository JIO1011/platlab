import type { HomeResponse } from '@platlab/contracts';
import { IconChip, Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, Boxes, LayoutGrid } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { moduleApps, useShell } from '../../app/app-shell';
import { ModuleMark } from '../../app/module-mark';
import { webModule } from '../../app/modules';
import { useHome } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { Sparkline } from '../../app/trend-chart';

type Card = HomeResponse['cards'][number];

/**
 * La vista «Módulos» del Inicio (ADR 0011 y 0026): una tarjeta por módulo con cifras y, si hay datos, un gráfico
 * pequeño; toda la tarjeta abre la app del módulo.
 */
export function ModuleCards() {
  const { workspaceId, me } = useShell();
  const home = useHome(workspaceId);
  if (home.isPending) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }
  if (home.isError) return <QueryErrorState error={home.error} onRetry={() => void home.refetch()} />;
  if (home.data.cards.length === 0) {
    return (
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
    );
  }
  return (
    // Cada tarjeta mide al menos 20rem: junto al menú lateral de la tableta no se estrecha.
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
      {home.data.cards.map((card) => (
        <ModuleCard key={card.moduleCode} card={card} />
      ))}
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
  const descriptor = webModule(card.moduleCode);
  const Icon = descriptor?.Icon ?? Boxes;
  const noun = descriptor?.home.trendNoun ?? { one: 'movimiento', many: 'movimientos' };
  const trendTotal = card.trend?.points.reduce((sum, point) => sum + point.value, 0) ?? 0;
  const pending = card.summary?.['pendingRequests'] ?? 0;
  const labels = descriptor?.home.pending;
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
      <ModuleMark
        code={card.moduleCode}
        className="pointer-events-none absolute -bottom-6 -right-4 size-40 rotate-12 text-action-soft transition-transform duration-500 motion-safe:group-hover:scale-110"
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
          {/* Cada cifra, si el módulo la envía: Laboratorios envía unas a quien pide y otras a quien las recibe. */}
          {(descriptor?.home.counters ?? []).filter((counter) => card.summary !== null && counter.key in card.summary).map((counter) => {
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
