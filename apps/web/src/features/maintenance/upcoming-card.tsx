import type { DueList } from '@platlab/contracts';
import { Skeleton } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { assetFichaPath } from './asset-path';
import { CodeTag } from '../../app/code-tag';
import { useMaintenance } from './context';
import { dueTone, firstDue, workStatus } from './due';
import { DuePill } from './due-view';
import { Panel } from './panel';
import { titleWithKind } from './work-text';

/** Cuántos trabajos muestra el Resumen: los primeros de «Por hacer». */
const LIMIT = 5;

/**
 * «Próximos trabajos» del Resumen (ADR 0021): los primeros cinco de Por hacer, con los atrasados primero. Cada fila
 * dice el equipo (enlace a su ficha), el trabajo y la fecha con su tono y su plazo en palabras; «Ver Por hacer» lleva
 * a la lista entera, donde se registra.
 */
export function UpcomingCard({ due }: { due: UseQueryResult<DueList> }) {
  const { workspaceId, me, base } = useMaintenance();

  if (due.isPending) return <Skeleton aria-busy="true" className="h-80 rounded-card" />;
  if (due.isError) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <QueryErrorState error={due.error} onRetry={() => void due.refetch()} />
      </div>
    );
  }

  const { today, items } = due.data;
  const next = firstDue(items, today, LIMIT);
  return (
    <Panel
      title="Próximos trabajos"
      description="Primero lo atrasado y lo No conforme; después, lo que toca en 30 días."
      action={
        <Link
          to={`${base}/por-hacer`}
          className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-control text-sm font-medium text-action transition-colors hover:text-action-hover sm:min-h-0"
        >
          Ver Por hacer
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      }
    >
      {next.length === 0 ? (
        <p className="rounded-panel bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted">Nada vence ni quedó No conforme en los próximos 30 días.</p>
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {next.map((item) => {
            const tone = dueTone(item, today);
            const status = workStatus({ ...item, lastPerformedOn: item.lastRecord?.performedOn ?? null }, today);
            const ficha = assetFichaPath(me, workspaceId, item.asset.id);
            return (
              // El nombre del equipo lleva todo el ancho; la fecha y su plazo van debajo, para no cortarlo en la columna estrecha.
              <li key={`${item.plan.id}-${item.asset.id}`} className="relative rounded-control px-2 py-3 transition-colors hover:bg-surface-sunken/60">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 font-semibold text-ink">
                    <CodeTag>{item.asset.code}</CodeTag>
                    {ficha ? (
                      <Link to={ficha} className="min-w-0 truncate rounded-[4px] after:absolute after:inset-0 hover:text-action focus-visible:outline-offset-[-2px]">
                        {item.asset.name}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate">{item.asset.name}</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-ink-muted">{titleWithKind(item.plan.title, item.plan.kind)}</p>
                </div>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                  <span className="tabular-nums text-ink">{formatDate(status.date)}</span>
                  <DuePill tone={tone}>{status.text}</DuePill>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
