import type { RequestSummary } from '@platlab/contracts';
import { Badge, Button, StatePanel, cn } from '@platlab/ui';
import { CalendarPlus, CircleCheck, ExternalLink, GripVertical } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { exceptionsText } from './request-summary';
import { blockFace, blockTextClass } from './schedule-block';
import { careerTone } from './schedule-career-color';
import { useSourceDrag, type DragSource } from './schedule-dnd';
import { chipDateText, defaultDate, durationOf, pendingDates, progressText, requestBlockText } from './schedule-placement';

/** Lo que «Por programar» necesita del resto de la pantalla. */
export interface TrayActions {
  /** El Administrador programa; el Operador solo ve la franja. */
  canSchedule: boolean;
  /** Se puede arrastrar (tabla visible, pantalla ancha). */
  canDrag: boolean;
  today: string;
  /** El día que muestra la tabla. */
  visible: string;
  /** Dónde se abre una solicitud en Recibidas. */
  requestHref: (requestId: string) => string;
  /** Lleva la tabla a ese día. */
  onPickDate: (date: string) => void;
  /** Abre «Programar…» con esa fecha. */
  onSchedule: (request: RequestSummary, date: string) => void;
}

/** Una fecha pendiente: un clic lleva la tabla a ese día y, con ese día a la vista, el bloque se arrastra a un área y una hora. */
function DateChip({ date, actions }: { date: string; actions: TrayActions }) {
  const past = date <= actions.today;
  const selected = date === actions.visible;
  return (
    <button
      type="button"
      onClick={() => actions.onPickDate(date)}
      aria-pressed={selected}
      aria-label={`${chipDateText(date)}${past ? ', ya pasó' : ''}${selected ? ', día que ves' : ''}`}
      title={past ? 'Esa fecha ya pasó: solo se programa hacia el futuro' : 'Ver ese día en la tabla'}
      className={cn(
        'inline-flex h-11 select-none items-center rounded-full border px-3 text-[13px] font-medium tabular-nums transition-colors sm:h-8',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
        selected ? 'border-action bg-action text-on-action' : 'border-line-strong bg-surface text-ink hover:bg-surface-sunken',
        past && !selected && 'border-warning/40 bg-warning-soft text-warning',
      )}
    >
      {chipDateText(date)}
      {past ? <span className="text-[12px] font-normal"> · ya pasó</span> : null}
    </button>
  );
}

/**
 * Una solicitud por programar, con el aspecto de un bloque de la tabla: «Materia - Carrera - Docente» sobre el color de su
 * carrera, su código con «1 de 2 programadas», la hora pedida, los avisos y sus fechas pendientes. Se arrastra a la tabla
 * cuando el día que se ve es una de sus fechas pendientes y futuras; «Programar…» hace lo mismo sin arrastrar.
 */
function PendingBlock({ summary, actions }: { summary: RequestSummary; actions: TrayActions }) {
  const pending = pendingDates(summary);
  const duration = durationOf(summary);
  const draggable = actions.canSchedule && actions.canDrag && pending.includes(actions.visible) && actions.visible > actions.today && duration !== null;
  const source: DragSource = { kind: 'program', request: summary, date: actions.visible, duration: duration ?? 0 };
  const drag = useSourceDrag(`card:${summary.id}`, source, !draggable);
  const exceptions = exceptionsText(summary.exceptions);
  return (
    <li
      ref={drag.setNodeRef}
      {...(draggable ? drag.listeners : {})}
      className={cn(blockFace, careerTone(summary.group), 'relative touch-manipulation p-3 text-center', draggable && 'cursor-grab select-none active:cursor-grabbing', drag.isDragging && 'opacity-40')}
    >
      <Link
        to={actions.requestHref(summary.id)}
        aria-label={`Abrir la solicitud ${summary.code}`}
        title={`Abrir la solicitud ${summary.code}`}
        className="absolute right-1 top-1 inline-flex size-9 items-center justify-center rounded-md text-ink hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-action sm:size-7"
      >
        <ExternalLink aria-hidden className="size-4" />
      </Link>
      <p className={cn('px-7 text-sm', blockTextClass)}>
        {draggable ? <GripVertical aria-hidden className="-ml-1 mr-0.5 inline size-3.5 align-text-bottom opacity-60" /> : null}
        {requestBlockText(summary)}
      </p>
      <p className="mt-1 text-[13px] tabular-nums text-ink-muted">
        {summary.code} · {progressText(summary)}
        {summary.startsAt && summary.endsAt ? ` · ${summary.startsAt}–${summary.endsAt}` : ''}
      </p>
      {summary.late || exceptions ? (
        <p className="mt-2 flex flex-wrap justify-center gap-1.5">
          {summary.late ? <Badge tone="warning">Fuera de plazo</Badge> : null}
          {exceptions ? <Badge tone="warning">{exceptions}</Badge> : null}
        </p>
      ) : null}
      <ul aria-label="Fechas por programar" className="mt-2.5 flex flex-wrap justify-center gap-2">
        {pending.map((date) => (
          <li key={date}>
            <DateChip date={date} actions={actions} />
          </li>
        ))}
      </ul>
      {actions.canSchedule && pending.length > 0 ? (
        <Button size="sm" className="mt-2.5 h-11 bg-white/80 sm:h-8" onClick={() => actions.onSchedule(summary, defaultDate(pending, actions.visible, actions.today))}>
          <CalendarPlus aria-hidden />
          Programar…
        </Button>
      ) : null}
    </li>
  );
}

/** Lo que la franja dice de cómo programar, según quién la ve y la pantalla. */
function hintText({ canSchedule, canDrag }: Pick<TrayActions, 'canSchedule' | 'canDrag'>): string {
  if (!canSchedule) return 'Lo más urgente primero.';
  return canDrag
    ? 'Lo más urgente primero. Elige una fecha para ver ese día y arrastra el bloque a un área y una hora, o usa «Programar…».'
    : 'Lo más urgente primero. Usa «Programar…».';
}

/**
 * «Por programar» (ADR 0023, L-01c; decisión del usuario, 24-10-2026): bajo la tabla, las solicitudes enviadas con fechas
 * sin bloque como bloques con el aspecto de los de la tabla, lo urgente primero. Cada fecha pendiente es un botón que
 * lleva la tabla a ese día; el bloque se arrastra a su lugar y todos traen «Programar…». El Operador los ve sin acciones.
 */
export function ScheduleTray({ items, pendingError, onRetry, actions }: { items: readonly RequestSummary[]; pendingError: boolean; onRetry: () => void; actions: TrayActions }) {
  const heading = useId();
  return (
    <section aria-labelledby={heading} className="rounded-card bg-surface p-4 shadow-raised">
      <h2 id={heading} className="flex items-center gap-2 text-lg font-bold text-ink">
        Por programar
        <Badge tone={items.length > 0 ? 'info' : 'neutral'}>{items.length}</Badge>
      </h2>
      <p className="mt-0.5 text-[13px] text-ink-muted">{hintText(actions)}</p>
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
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {items.map((summary) => (
            <PendingBlock key={summary.id} summary={summary} actions={actions} />
          ))}
        </ul>
      )}
    </section>
  );
}
