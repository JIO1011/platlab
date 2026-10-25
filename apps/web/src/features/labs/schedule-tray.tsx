import type { RequestSummary } from '@platlab/contracts';
import { Button, cn } from '@platlab/ui';
import { CalendarPlus, CircleCheck } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { exceptionsText } from './request-summary';
import { blockFace, blockTextClass, lineClamp } from './schedule-block';
import { useCareerTone } from './schedule-career-color';
import { useSourceDrag, type DragSource } from './schedule-dnd';
import { cardWhenText, durationOf, pendingCards, requestBlockText, shortDateText, type PendingCard } from './schedule-placement';

/** Lo que «Por programar» necesita del resto de la pantalla. */
export interface TrayActions {
  /** El Administrador programa; el Operador solo ve la bandeja. */
  canSchedule: boolean;
  /** Pantalla ancha (con la tabla): una franja con tarjetas que se arrastran; si no, una lista con «Programar…». */
  wide: boolean;
  today: string;
  /** El día que muestra la tabla. */
  visible: string;
  /** Lleva la tabla a ese día. */
  onPickDate: (date: string) => void;
  /** Abre «Programar…» con esa fecha. */
  onSchedule: (request: RequestSummary, date: string) => void;
}

/** Por qué una tarjeta pide atención: fuera de plazo o con recursos por revisar; vacío si no. */
function warningsOf({ late, exceptions }: Pick<RequestSummary, 'late' | 'exceptions'>): string[] {
  return [late ? 'Fuera de plazo' : null, exceptionsText(exceptions)].filter((text): text is string => text !== null);
}

/**
 * Una fecha por programar, con el aspecto de un bloque de la tabla («Materia - Carrera - Docente» sobre el color de su
 * carrera) y, debajo, «lun 9 nov · 08:00–10:00» con un punto ámbar si está fuera de plazo o tiene recursos por revisar
 * (el motivo, en texto para el lector de pantalla y en el título). En la franja, las del día que se ve van resaltadas:
 * se arrastran a la tabla (si la fecha es futura) y un clic abre «Programar…»; las de otros días van atenuadas y un clic
 * lleva la tabla a ese día. En la lista (pantalla estrecha), cada una trae su botón «Programar…».
 */
function PendingTile({ card, actions }: { card: PendingCard; actions: TrayActions }) {
  const toneOf = useCareerTone();
  const { request, date } = card;
  const here = date === actions.visible;
  const duration = durationOf(request);
  const draggable = actions.canSchedule && actions.wide && here && date > actions.today && duration !== null;
  const source: DragSource = { kind: 'program', request, date, duration: duration ?? 0 };
  const drag = useSourceDrag(`card:${request.id}:${date}`, source, !draggable);
  const warnings = warningsOf(request);
  const past = date <= actions.today;
  const text = requestBlockText(request);
  const face = (
    <>
      <span className={cn(blockTextClass, 'block', actions.wide ? lineClamp[3] : 'text-sm')}>{text}</span>
      <span className="mt-auto flex items-center gap-1.5 pt-0.5 text-[11px] leading-[14px] tabular-nums text-ink-muted">
        {warnings.length > 0 ? (
          <span title={warnings.join(' · ')} className="flex shrink-0 items-center">
            <span aria-hidden className="size-2 rounded-full bg-warning" />
            <span className="sr-only">{warnings.join('. ')}</span>
          </span>
        ) : null}
        <span className="truncate">
          {cardWhenText(card)}
          {past ? ' · ya pasó' : ''}
        </span>
      </span>
    </>
  );
  const inner = 'flex size-full flex-col px-2 py-1.5 text-left';
  const control = (children: ReactNode) => {
    const focus = 'focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-action';
    if (!actions.wide) return <div className={cn(inner, 'min-h-11')}>{children}</div>;
    if (here && !actions.canSchedule) return <div className={inner}>{children}</div>;
    return here ? (
      <button type="button" aria-label={`Programar… ${text}, ${cardWhenText(card)}`} onClick={() => actions.onSchedule(request, date)} className={cn(inner, focus)}>
        {children}
      </button>
    ) : (
      <button type="button" aria-label={`Ver ${shortDateText(date)} en el cronograma: ${text}`} onClick={() => actions.onPickDate(date)} className={cn(inner, focus)}>
        {children}
      </button>
    );
  };
  return (
    <li
      ref={drag.setNodeRef}
      {...(draggable ? drag.listeners : {})}
      className={cn(
        blockFace,
        toneOf(request.group),
        'relative touch-manipulation',
        actions.wide ? 'h-[4.75rem] w-56 shrink-0' : 'grid',
        actions.wide && here && 'ring-2 ring-action ring-offset-1',
        actions.wide && !here && 'opacity-75 transition-opacity hover:opacity-100',
        draggable && 'cursor-grab select-none active:cursor-grabbing',
        drag.isDragging && 'opacity-40',
      )}
    >
      {control(face)}
      {!actions.wide && actions.canSchedule ? (
        <Button size="sm" className="m-2 mt-0 h-11 justify-self-start bg-white/80" onClick={() => actions.onSchedule(request, date)}>
          <CalendarPlus aria-hidden />
          Programar…
        </Button>
      ) : null}
    </li>
  );
}

/**
 * «Por programar» (ADR 0023, L-01c; decisión del usuario, 24-10-2026): pegada al borde inferior del contenido, una
 * franja de unos 110 px con una tarjeta por fecha pendiente de las solicitudes enviadas, las del día que se ve primero y
 * resaltadas (se arrastran a la tabla) y las de otros días atenuadas (llevan a su día). En pantallas estrechas es una
 * lista debajo del día, con «Programar…». El Operador las ve sin acciones de programar.
 */
export function ScheduleTray({ items, pendingError, onRetry, actions }: { items: readonly RequestSummary[]; pendingError: boolean; onRetry: () => void; actions: TrayActions }) {
  const heading = useId();
  const cards = pendingCards(items, actions.visible);
  const here = cards.filter((card) => card.date === actions.visible).length;
  const hint = !actions.wide ? null : here > 0 && actions.canSchedule ? 'Arrastra las resaltadas a la tabla, o haz clic para «Programar…»' : cards.length > 0 ? 'Haz clic en una para ver su día' : null;
  return (
    <section aria-labelledby={heading} className={cn('rounded-card bg-surface px-3 pb-2.5 pt-2 shadow-raised', actions.wide && 'shrink-0')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id={heading} className="text-sm font-bold text-ink">
          Por programar · {cards.length}
        </h2>
        {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {pendingError ? (
        <p role="alert" className="mt-2 rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
          No se pudieron cargar las solicitudes.{' '}
          <button type="button" onClick={onRetry} className="font-semibold underline-offset-2 hover:underline">
            Reintentar
          </button>
        </p>
      ) : cards.length === 0 ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
          <CircleCheck aria-hidden className="size-4 text-success" />
          Todo programado
        </p>
      ) : (
        <ul className={cn('mt-1.5', actions.wide ? 'flex gap-2 overflow-x-auto overscroll-x-contain pb-1' : 'grid gap-2')}>
          {cards.map((card) => (
            <PendingTile key={`${card.request.id}:${card.date}`} card={card} actions={actions} />
          ))}
        </ul>
      )}
    </section>
  );
}
