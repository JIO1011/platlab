import { Skeleton, StatePanel } from '@platlab/ui';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router';
import { useShell } from '../../app/app-shell';
import { useHome } from '../../app/queries';
import { QueryErrorState } from '../../app/states';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Contadores accionables por módulo (01 §7): cada número abre la vista que lo explica. */
const counters: Record<string, Array<{ key: string; label: (n: number) => string }>> = {
  reagents: [
    { key: 'productsWithStock', label: (n) => (n === 1 ? 'reactivo con existencias' : 'reactivos con existencias') },
    { key: 'positionsWithStock', label: (n) => (n === 1 ? 'ubicación con existencias' : 'ubicaciones con existencias') },
  ],
};

export function HomePage() {
  const { workspaceId, me } = useShell();
  const home = useHome(workspaceId);
  const firstName = me.member.displayName.split(' ')[0];
  const moduleHref = (code: string) => {
    const entry = me.modules.find((module) => module.code === code)?.nav[0];
    return entry ? `/e/${workspaceId}/${entry.path}` : null;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
        {greeting()}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{me.workspace.name}</p>

      <section className="mt-8" aria-label="Módulos">
        {home.isPending ? (
          <Skeleton className="h-40 w-full max-w-md" />
        ) : home.isError ? (
          <QueryErrorState error={home.error} onRetry={() => void home.refetch()} />
        ) : home.data.cards.length === 0 ? (
          <div className="rounded-card border border-line bg-surface">
            <StatePanel
              icon={LayoutGrid}
              title="No hay módulos para tu rol en este espacio"
              description={
                me.member.isOwner
                  ? 'Como propietario gobiernas el espacio; para operar inventarios necesitas un rol operativo, que puede asignarte un administrador.'
                  : 'Los módulos se habilitan por contrato y se muestran según tu rol. Si esperabas ver alguno, consúltalo con quien administra el espacio.'
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.data.cards.map((card) => {
              const href = moduleHref(card.moduleCode);
              return (
                <article key={card.moduleCode} className="rounded-card border border-line bg-surface shadow-raised">
                  <h2 className="px-5 pt-5 text-sm font-semibold text-ink-muted">{card.name}</h2>
                  <ul className="mt-3 divide-y divide-line border-t border-line">
                    {(counters[card.moduleCode] ?? []).map((counter) => {
                      const value = card.summary?.[counter.key] ?? 0;
                      const content = (
                        <>
                          <span className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-ink">{value}</span>
                          <span className="text-sm text-ink-muted">{counter.label(value)}</span>
                          {href ? (
                            <ArrowRight
                              className="ml-auto size-4 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-action"
                              aria-hidden
                            />
                          ) : null}
                        </>
                      );
                      return (
                        <li key={counter.key}>
                          {href ? (
                            <Link to={href} className="group flex items-baseline gap-2.5 px-5 py-3.5 transition-colors hover:bg-canvas">
                              {content}
                            </Link>
                          ) : (
                            <div className="flex items-baseline gap-2.5 px-5 py-3.5">{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {href ? (
                    <Link
                      to={href}
                      className="flex items-center gap-1.5 border-t border-line px-5 py-3 text-sm font-medium text-action transition-colors hover:bg-action-soft"
                    >
                      Abrir {card.name}
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
