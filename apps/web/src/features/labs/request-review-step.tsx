import type { FormField, FormLayout, RequestLine, Space } from '@platlab/contracts';
import { cn, formatDecimal, normalizeDecimalInput } from '@platlab/ui';
import type { ReactNode } from 'react';
import { formatDate, formatDateTime } from '../../app/format';
import { LINE_KINDS, activityLabels, groupsOf, totalOf, type DraftLine, type RequestDraft, type RequestView } from './request-draft';
import { LineCheck } from './request-line-check';

const columns = ['sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3'] as const;

const eventLabels: Record<RequestView['events'][number]['action'], string> = {
  submitted: 'Enviada',
  changes_requested: 'Cambios solicitados',
  resubmitted: 'Reenviada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const sheetCard = 'grid gap-4 rounded-card bg-surface px-4 py-5 shadow-raised sm:px-5';

/** Lo que se llenó de un dato, dicho para leerlo; vacío si no se llenó. */
function fieldText(field: FormField, draft: RequestDraft, layout: FormLayout): string {
  if ('type' in field) {
    const answer = draft.answers[field.key] ?? '';
    if (field.type === 'boolean') return answer === '' ? '' : answer === 'true' ? 'Sí' : 'No';
    return field.type === 'date' && answer !== '' ? formatDate(answer) : answer;
  }
  switch (field.key) {
    case 'titulo':
      return draft.title;
    case 'docente':
      return draft.teacherName;
    case 'tipo':
      return draft.activityType ? activityLabels[draft.activityType] : '';
    case 'asignatura':
      return draft.subject;
    case 'carrera':
      return draft.career;
    case 'fecha':
      return draft.dates.map(formatDate).join(', ');
    case 'horario':
      return draft.startsAt && draft.endsAt ? `${draft.startsAt} – ${draft.endsAt}` : '';
    case 'participantes':
      return draft.participants;
    case 'grupos':
      return String(groupsOf(draft, layout));
  }
}

/** Un dato de solo lectura: su etiqueta y lo que se llenó, o «Sin llenar». */
function Datum({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{value || <span className="text-ink-subtle">Sin llenar</span>}</dd>
    </div>
  );
}

/** La cantidad de una línea como se pidió: por grupo, con el total que sale de los grupos. */
function amountText(line: DraftLine, groups: number): string {
  if (line.kind === 'reagent') return `${formatDecimal(normalizeDecimalInput(line.quantity))} ${line.unit}`;
  if (!line.byGroup) return formatDecimal(normalizeDecimalInput(line.quantity));
  return `${formatDecimal(normalizeDecimalInput(line.perGroup))} por grupo · ${formatDecimal(totalOf(line.perGroup, groups))} en total`;
}

export interface ReviewStepProps {
  request: RequestView;
  draft: RequestDraft;
  spaces: readonly Space[];
  /** Lo que el servidor dijo de cada línea al guardar; con cambios sin guardar es `null`. */
  saved: readonly RequestLine[] | null;
  timeZone: string;
}

/**
 * Paso «Revisar»: el resumen de solo lectura con los mismos datos, etiquetas y recursos de la revisión, y el historial de
 * la solicitud con sus motivos. Es también lo que ve quien no la puede editar.
 */
export function ReviewStep({ request, draft, spaces, saved, timeZone }: ReviewStepProps) {
  const { layout } = request;
  const groups = groupsOf(draft, layout);
  const area = spaces.find((space) => space.areaId === draft.areaId);
  return (
    <div className="grid gap-4">
      <section aria-label="Resumen" className={sheetCard}>
        {layout.rows.map((row, at) =>
          row.kind === 'section' ? (
            <h2 key={`section-${at}`} className="text-lg font-semibold text-ink">
              {row.title}
            </h2>
          ) : (
            <dl key={`row-${at}`} className={cn('grid grid-cols-1 gap-4', columns[row.fields.length - 1])}>
              {row.fields.map((field) => (
                <Datum key={field.key} label={field.label} value={fieldText(field, draft, layout)} />
              ))}
            </dl>
          ),
        )}
        <dl className="grid grid-cols-1 gap-4">
          <Datum label="Área" value={area?.areaName ?? 'Sin área'} />
          {layout.notes ? <Datum label="Observaciones" value={draft.notes} /> : null}
        </dl>
      </section>
      {layout.resources.map((resource) => {
        const kind = LINE_KINDS[resource.kind];
        const lines = draft.lines.flatMap((line, index) => (line.kind === kind ? [{ line, verdict: saved?.[index] }] : []));
        return (
          <section key={resource.kind} aria-label={resource.label} className={sheetCard}>
            <h2 className="text-lg font-semibold text-ink">{resource.label}</h2>
            {lines.length === 0 ? (
              <p className="text-sm text-ink-muted">Nada pedido.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lines.map(({ line, verdict }) => (
                  <li key={line.id} className="grid gap-1.5 py-2.5 first:pt-0 last:pb-0">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="min-w-0 break-words font-medium text-ink">{line.name || 'Sin nombre'}</span>
                      <span className="text-sm tabular-nums text-ink-muted">{amountText(line, groups)}</span>
                    </p>
                    {verdict ? <LineCheck line={verdict} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <section aria-label="Historial" className={sheetCard}>
        <h2 className="text-lg font-semibold text-ink">Historial</h2>
        {request.events.length === 0 ? (
          <p className="text-sm text-ink-muted">Todavía no se envía.</p>
        ) : (
          <ol className="grid gap-3">
            {request.events.map((event) => (
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
    </div>
  );
}
