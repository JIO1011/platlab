import { formatDateTime } from '../../app/format';
import type { RequestView } from './request-draft';

const eventLabels: Record<RequestView['events'][number]['action'], string> = {
  submitted: 'Enviada',
  changes_requested: 'Cambios solicitados',
  resubmitted: 'Reenviada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

/** El historial de la solicitud con sus motivos: va al pie, fuera de la hoja (la hoja es lo que se imprime). */
export function RequestHistory({ events, timeZone }: { events: RequestView['events']; timeZone: string }) {
  return (
    <section aria-label="Historial" className="grid gap-3 rounded-card bg-surface px-4 py-5 shadow-raised sm:px-5 print:hidden">
      <h2 className="text-lg font-semibold text-ink">Historial</h2>
      {events.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no se envía.</p>
      ) : (
        <ol className="grid gap-3">
          {events.map((event) => (
            <li key={`${event.action}-${event.at}`} className="grid gap-0.5">
              <p className="text-sm">
                <span className="font-semibold text-ink">{eventLabels[event.action]}</span>
                <span className="text-ink-muted">
                  {' '}
                  · {event.by} · {formatDateTime(event.at, timeZone)}
                </span>
              </p>
              {event.reason ? <p className="break-words text-sm text-ink">Motivo: {event.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
