import type { AssetConservation, AssetEvent, AssetHistory as AssetHistoryData } from '@platlab/contracts';
import { Skeleton, StatePanel } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { Activity, ArrowLeftRight, ArrowRight, CirclePlus, History, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDateTime, formatShortDateTime } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { conditionLabel, conservationLabel } from './asset-text';

/** «Antes → después», con el icono dibujado y la palabra «a» para quien lee con lector de pantalla. */
function FromTo({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span>{from}</span>
      <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <span className="sr-only">a</span>
      <span>{to}</span>
    </span>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="break-words text-[13px] text-ink-muted">
      <span className="font-medium text-ink">{label}</span> {children}
    </p>
  );
}

/** El estado físico de un hecho del historial; sin dato, «Sin dato». */
const conservationText = (value: AssetConservation | null) => (value ? conservationLabel[value] : 'Sin dato');

/** Lo que dice cada hecho del historial: el título, su icono y las líneas que lo explican. La hoja de vida lo imprime con el mismo texto. */
export function describeEvent(event: AssetEvent): { icon: LucideIcon; title: ReactNode; details: ReactNode } {
  if (event.kind === 'created') {
    return { icon: CirclePlus, title: 'Alta del equipo', details: null };
  }
  if (event.kind === 'condition') {
    return {
      icon: Activity,
      title: <FromTo from={conditionLabel[event.from]} to={conditionLabel[event.to]} />,
      details: (
        <>
          <Detail label="Motivo:">{event.reason}</Detail>
          {event.result ? <Detail label="Resultado:">{event.result}</Detail> : null}
        </>
      ),
    };
  }
  if (event.kind === 'conservation') {
    return {
      icon: ShieldCheck,
      title: (
        <>
          Estado físico: <FromTo from={conservationText(event.from)} to={conservationText(event.to)} />
        </>
      ),
      details: null,
    };
  }
  return {
    icon: ArrowLeftRight,
    title: <FromTo from={event.from} to={event.to} />,
    details: event.note ? <Detail label="Nota:">{event.note}</Detail> : null,
  };
}

/**
 * Pestaña «Historial»: una línea de tiempo con el alta, cada cambio de estado (con su motivo y su resultado),
 * cada cambio de estado físico y cada traslado (con su nota), del más reciente al más antiguo; quién y cuándo, en la zona del espacio.
 */
export function AssetHistory({ history, timeZone }: { history: UseQueryResult<AssetHistoryData>; timeZone: string }) {
  return (
    <section aria-label="Historial del equipo" className="rounded-card bg-surface p-6 shadow-raised md:p-8">
      {history.isPending ? (
        <div role="status" aria-busy="true" aria-label="Cargando el historial">
          <Skeleton className="h-24" />
        </div>
      ) : history.isError ? (
        <QueryErrorState error={history.error} onRetry={() => void history.refetch()} />
      ) : history.data.items.length === 0 ? (
        <StatePanel icon={History} title="Sin historial" description="El alta, los cambios de estado y los traslados quedarán aquí." />
      ) : (
        // Línea de tiempo, como en el Resumen: el hilo pasa por detrás de los círculos de icono.
        <ol className="relative space-y-6 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-0.5 before:bg-line">
          {history.data.items.map((event, index) => {
            const { icon: Icon, title, details } = describeEvent(event);
            return (
              <li key={`${event.kind}-${event.occurredAt}-${index}`} className="flex items-start gap-3.5">
                <span className="relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-action-soft text-action ring-4 ring-surface">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <div className="grid min-w-0 flex-1 gap-1 pt-1.5">
                  <p className="font-bold text-ink">{title}</p>
                  {details}
                  <p className="text-[13px] text-ink-muted">
                    {event.actor ? `${event.actor} · ` : ''}
                    <time dateTime={event.occurredAt} title={formatDateTime(event.occurredAt, timeZone)}>
                      {formatShortDateTime(event.occurredAt, timeZone)}
                    </time>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
