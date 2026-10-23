import type { LabsRequest, RequestSummary } from '@platlab/contracts';
import { Badge, Button, Skeleton, StatePanel, cn } from '@platlab/ui';
import { CalendarPlus, CircleCheck, ExternalLink, GripVertical } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { useRequestDetail } from './queries';
import { exceptionsText } from './request-summary';
import { useSourceDrag, type DragSource } from './schedule-dnd';
import { activityLine } from './schedule-grid';
import { chipDateText, defaultDate, durationOf, pendingDates, progressText } from './schedule-placement';

/** Lo que la bandeja necesita del resto de la pantalla. */
export interface TrayActions {
  /** El Administrador programa; el Operador solo ve la bandeja. */
  canSchedule: boolean;
  /** Se puede arrastrar (tabla visible, pantalla ancha). */
  canDrag: boolean;
  today: string;
  /** El día que muestra la tabla. */
  visible: string;
  workspaceId: string;
  /** Dónde se abre una solicitud en Recibidas. */
  requestHref: (requestId: string) => string;
  /** Lleva la tabla a ese día. */
  onPickDate: (date: string) => void;
  /** Abre «Programar…» con esa fecha. */
  onSchedule: (request: LabsRequest, date: string) => void;
}

/** Una fecha pendiente: un clic lleva la tabla a ese día y, con ese día a la vista, arrastrarla la lleva a un área y una hora. */
function DateChip({ request, date, duration, actions }: { request: LabsRequest; date: string; duration: number | null; actions: TrayActions }) {
  const past = date <= actions.today;
  const selected = date === actions.visible;
  // Solo la fecha del día que se ve se arrastra: la tabla muestra ese día; las demás se eligen con un clic primero.
  const draggable = actions.canSchedule && actions.canDrag && selected && !past && duration !== null;
  const source: DragSource = { kind: 'program', request, date, duration: duration ?? 0 };
  const { setNodeRef, listeners, isDragging } = useSourceDrag(`chip:${request.id}:${date}`, source, !draggable);
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(draggable ? listeners : {})}
      onClick={() => actions.onPickDate(date)}
      aria-pressed={selected}
      aria-label={`${chipDateText(date)}${past ? ', ya pasó' : ''}${selected ? ', día que ves' : ''}`}
      title={past ? 'Esa fecha ya pasó: solo se programa hacia el futuro' : draggable ? 'Arrástrala a un área y una hora de la tabla para programarla' : 'Ver ese día en la tabla'}
      className={cn(
        'inline-flex h-11 touch-manipulation select-none items-center gap-1 rounded-full border px-3 text-[13px] font-medium tabular-nums transition-colors sm:h-8',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
        selected ? 'border-action bg-action text-on-action' : 'border-line-strong bg-surface text-ink hover:bg-surface-sunken',
        draggable && 'cursor-grab active:cursor-grabbing',
        past && !selected && 'border-warning/40 bg-warning-soft text-warning',
        isDragging && 'opacity-40',
      )}
    >
      {draggable ? <GripVertical aria-hidden className="size-3.5 -ml-1 opacity-60" /> : null}
      {chipDateText(date)}
      {past ? <span className="text-[12px] font-normal"> · ya pasó</span> : null}
    </button>
  );
}

/** Una solicitud por programar: «Actividad · Solicitante · Grupo», cuántas fechas van, sus fechas pendientes y «Programar…». */
function TrayCard({ summary, actions }: { summary: RequestSummary; actions: TrayActions }) {
  const detail = useRequestDetail(actions.workspaceId, summary.id);
  const request = detail.data;
  const pending = request ? pendingDates(request) : [];
  const duration = request ? durationOf(request) : null;
  const visibleIsPending = pending.includes(actions.visible);
  // La tarjeta entera sirve de asa cuando el día que se ve es una de sus fechas pendientes (no una fecha ya pasada).
  const cardDraggable = Boolean(request) && actions.canSchedule && actions.canDrag && visibleIsPending && actions.visible > actions.today && duration !== null;
  const cardSource: DragSource | null = request ? { kind: 'program', request, date: actions.visible, duration: duration ?? 0 } : null;
  const drag = useSourceDrag(`card:${summary.id}`, cardSource, !cardDraggable);
  const exceptions = exceptionsText(summary.exceptions);
  const line = activityLine({ title: request?.title ?? summary.title ?? summary.code, requesterName: summary.requesterName, group: request?.career ?? null });
  return (
    <li className={cn('rounded-control border border-line bg-surface p-3', drag.isDragging && 'opacity-40')}>
      <div className="flex items-start gap-2">
        <div
          ref={drag.setNodeRef}
          {...(cardDraggable ? drag.listeners : {})}
          className={cn('min-w-0 flex-1 touch-manipulation', cardDraggable && 'cursor-grab select-none active:cursor-grabbing')}
        >
          <p className="text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{line}</p>
          <p className="mt-0.5 text-[13px] tabular-nums text-ink-muted">
            {summary.code} · {progressText(summary)}
          </p>
        </div>
        <Link
          to={actions.requestHref(summary.id)}
          aria-label={`Abrir la solicitud ${summary.code}`}
          className="-mr-1 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-action sm:size-8"
        >
          <ExternalLink aria-hidden className="size-4" />
        </Link>
      </div>
      {summary.late || exceptions ? (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {summary.late ? <Badge tone="warning">Fuera de plazo</Badge> : null}
          {exceptions ? <Badge tone="warning">{exceptions}</Badge> : null}
        </p>
      ) : null}
      {detail.isPending ? (
        <Skeleton className="mt-3 h-8 rounded-full" />
      ) : detail.isError || !request ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          No se cargaron sus fechas.{' '}
          <button type="button" onClick={() => void detail.refetch()} className="font-medium text-action underline-offset-2 hover:underline">
            Reintentar
          </button>
        </p>
      ) : (
        <>
          <ul aria-label="Fechas por programar" className="mt-3 flex flex-wrap gap-2">
            {pending.map((date) => (
              <li key={date}>
                <DateChip request={request} date={date} duration={duration} actions={actions} />
              </li>
            ))}
          </ul>
          {actions.canSchedule && pending.length > 0 ? (
            <Button size="sm" className="mt-3 h-11 sm:h-8" onClick={() => actions.onSchedule(request, defaultDate(pending, actions.visible, actions.today))}>
              <CalendarPlus aria-hidden />
              Programar…
            </Button>
          ) : null}
        </>
      )}
    </li>
  );
}

/**
 * La bandeja «Por programar» (ADR 0023, L-01c): las solicitudes enviadas con fechas sin bloque, lo urgente primero. Al
 * costado de la tabla en escritorio y bajo ella en el móvil. Cada fecha pendiente es un chip: un clic lleva la tabla a
 * ese día y arrastrarlo lo programa. El Operador la ve sin acciones.
 */
export function ScheduleTray({ items, pendingError, onRetry, actions }: { items: readonly RequestSummary[]; pendingError: boolean; onRetry: () => void; actions: TrayActions }) {
  const heading = useId();
  return (
    <section aria-labelledby={heading} className="rounded-card bg-surface p-4 shadow-raised lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
      <h2 id={heading} className="flex items-center gap-2 text-lg font-bold text-ink">
        Por programar
        <Badge tone={items.length > 0 ? 'info' : 'neutral'}>{items.length}</Badge>
      </h2>
      <p className="mt-0.5 text-[13px] text-ink-muted">
        {actions.canSchedule ? (actions.canDrag ? 'Lo más urgente primero. Arrastra una fecha a la tabla o usa «Programar…».' : 'Lo más urgente primero. Usa «Programar…».') : 'Lo más urgente primero.'}
      </p>
      {pendingError ? (
        <p role="alert" className="mt-3 rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
          No se pudieron cargar las solicitudes.{' '}
          <button type="button" onClick={onRetry} className="font-semibold underline-offset-2 hover:underline">
            Reintentar
          </button>
        </p>
      ) : items.length === 0 ? (
        <StatePanel icon={CircleCheck} title="Todo programado" description="Las solicitudes enviadas con fechas sin bloque aparecerán aquí." className="py-8" />
      ) : (
        <ul className="mt-3 grid gap-3">
          {items.map((summary) => (
            <TrayCard key={summary.id} summary={summary} actions={actions} />
          ))}
        </ul>
      )}
    </section>
  );
}
