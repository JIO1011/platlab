import { ChevronDown } from 'lucide-react';
import { formatDateTime } from '../../app/format';
import type { RequestView } from './request-draft';
import { softCard } from './style';

const eventLabels: Record<RequestView['events'][number]['action'], string> = {
  submitted: 'Enviada',
  changes_requested: 'Cambios solicitados',
  resubmitted: 'Reenviada',
  scheduled: 'Programada',
  completed: 'Finalizada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const eventDots: Record<RequestView['events'][number]['action'], string> = {
  submitted: 'bg-action',
  changes_requested: 'bg-warning',
  resubmitted: 'bg-action',
  scheduled: 'bg-success',
  completed: 'bg-success',
  rejected: 'bg-danger',
  cancelled: 'bg-ink-subtle',
};

/** El historial de la solicitud con sus motivos, en una línea de tiempo: va fuera de la hoja (la hoja es lo que se imprime). Con `collapsible` va plegado bajo «Historial (N)» hasta que se abre. */
export function RequestHistory({ events, timeZone, collapsible = false }: { events: RequestView['events']; timeZone: string; collapsible?: boolean }) {
  const timeline =
    events.length === 0 ? (
      <p className="text-sm text-ink-muted">Todavía no se envía.</p>
    ) : (
      <ol className="grid">
        {events.map((event) => (
          <li key={`${event.action}-${event.at}`} className="relative grid gap-0.5 pb-5 pl-7 last:pb-0 before:absolute before:bottom-0 before:left-[5px] before:top-3 before:w-px before:bg-line-strong last:before:hidden">
            <span aria-hidden className={`absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-surface ${eventDots[event.action]}`} />
            <p className="text-sm font-semibold text-ink">{eventLabels[event.action]}</p>
            <p className="text-[13px] text-ink-muted">
              {event.by} · {formatDateTime(event.at, timeZone)}
            </p>
            {event.reason ? <p className="mt-0.5 break-words text-sm text-ink">Motivo: {event.reason}</p> : null}
          </li>
        ))}
      </ol>
    );
  return (
    <section aria-label="Historial" className={`${softCard} print:hidden`}>
      {collapsible ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 text-base font-bold tracking-tight text-ink focus-visible:outline-2 -outline-offset-2 focus-visible:outline-action sm:px-5 [&::-webkit-details-marker]:hidden">
            Historial ({events.length})
            <ChevronDown className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5">{timeline}</div>
        </details>
      ) : (
        <div className="grid gap-4 p-5 sm:p-6">
          <h2 className="text-lg font-bold tracking-tight text-ink">Historial</h2>
          {timeline}
        </div>
      )}
    </section>
  );
}
