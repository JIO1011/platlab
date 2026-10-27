import { formatDateTime } from '../../app/format';
import type { RequestView } from './request-draft';
import { softCard } from './style';

const eventLabels: Record<RequestView['events'][number]['action'], string> = {
  submitted: 'Enviada',
  changes_requested: 'Cambios solicitados',
  resubmitted: 'Reenviada',
  scheduled: 'Programada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const eventDots: Record<RequestView['events'][number]['action'], string> = {
  submitted: 'bg-action',
  changes_requested: 'bg-warning',
  resubmitted: 'bg-action',
  scheduled: 'bg-success',
  rejected: 'bg-danger',
  cancelled: 'bg-ink-subtle',
};

/** El historial de la solicitud con sus motivos, en una línea de tiempo: va fuera de la hoja (la hoja es lo que se imprime). */
export function RequestHistory({ events, timeZone }: { events: RequestView['events']; timeZone: string }) {
  return (
    <section aria-label="Historial" className={`${softCard} grid gap-4 p-5 sm:p-6 print:hidden`}>
      <h2 className="text-lg font-bold tracking-tight text-ink">Historial</h2>
      {events.length === 0 ? (
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
      )}
    </section>
  );
}
