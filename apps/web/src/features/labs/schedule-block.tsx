import type { Activity, Space } from '@platlab/contracts';
import { Button, Tooltip, cn } from '@platlab/ui';
import { MoveVertical } from 'lucide-react';
import { Link } from 'react-router';
import { activityDetails, activityLabel, blockLines, blockText, overCapacity, showsTime, toMinutes } from './schedule-grid';
import { useCareerTone } from './schedule-career-color';

/** Cómo se abre y se mueve un bloque: la solicitud para quien puede verla, un panel de solo lectura para los demás y, para quien programa, «Mover…». */
export interface BlockOpening {
  /** Dónde está la solicitud del bloque para esta persona; nulo si no la puede ver (el Administrador y el Operador, en Recibidas; el Docente, solo la suya). */
  linkOf: (activity: Activity) => string | null;
  /** Abre el panel de solo lectura del bloque. */
  onInspect: (activity: Activity) => void;
  /** Abre «Mover…» (área, hora o responsable el mismo día); solo quien programa. */
  onMove?: ((activity: Activity) => void) | undefined;
}

/**
 * La cara de un bloque (tabla, lista y «Por programar»): fondo de tinte medio por carrera con su borde izquierdo de 3 px
 * del mismo tono más oscuro (`careerTone` los pone) y el texto de la planilla.
 */
export const blockFace = 'overflow-hidden rounded-md border border-ink/10 border-l-[3px] text-ink';

/** El texto de un bloque: 12 px medium, a la izquierda y arriba; si no cabe, se corta con elipsis y el tooltip lo dice entero. */
export const blockTextClass = 'text-left text-xs font-medium leading-[1.3] [overflow-wrap:anywhere]';

/** Las líneas de texto que caben, con los nombres de clase escritos completos para que Tailwind los encuentre. */
export const lineClamp = { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' } as const;

/**
 * La hora del bloque de la tabla se ve solo si sobra alto después de las líneas del texto (consulta del alto interior del bloque):
 * si no, «Materia - Carrera - Docente» tiene la prioridad y la hora queda en el tooltip. Los nombres, completos para Tailwind.
 */
const timeFits = { 1: '[@container(min-height:31px)]:block', 2: '[@container(min-height:46px)]:block', 3: '[@container(min-height:62px)]:block' } as const;

/** Los controles secundarios del bloque aparecen al pasar o enfocar; sin puntero (táctil), se ven siempre. */
const reveal =
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/block:opacity-100 [@media(hover:hover)]:group-focus-within/block:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100';

/**
 * Un bloque de la tabla o de la lista (decisión del usuario, 24-10-2026): «Materia - Carrera - Docente» arriba a la
 * izquierda sobre el color de su carrera, en hasta tantas líneas como su alto permite; la hora, en una línea pequeña si
 * mide al menos una hora y el alto del bloque sobra. El código y el responsable van al nombre accesible y al tooltip. Es un
 * solo control, un enlace a su solicitud o un botón que abre su panel; quien programa suma un botón pequeño «Mover…».
 */
export function ScheduleBlock({ activity, space, opening, size }: { activity: Activity; space: Pick<Space, 'capacity'>; opening: BlockOpening; size: 'table' | 'list' }) {
  const toneOf = useCareerTone();
  const to = opening.linkOf(activity);
  const text = blockText(activity);
  const minutes = toMinutes(activity.endsAt) - toMinutes(activity.startsAt);
  const table = size === 'table';
  const lines = blockLines(minutes);
  const className = cn(
    blockFace,
    toneOf(activity.group),
    'relative block size-full transition-[filter] hover:brightness-95',
    'focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
    !table && 'min-h-11',
  );
  const face = (
    <span className={cn('flex size-full flex-col items-start justify-start text-left', table ? 'px-2 py-[3px] [container-type:size]' : 'px-3 py-2')}>
      <span className={cn(blockTextClass, table ? lineClamp[lines] : 'text-sm')}>
        {overCapacity(activity, space) ? <span aria-hidden>⚠ </span> : null}
        {text}
      </span>
      {table && showsTime(minutes) ? (
        <span aria-hidden className={cn('hidden text-[11px] leading-[14px] tabular-nums text-ink-muted', timeFits[lines])}>
          {activity.startsAt}–{activity.endsAt}
        </span>
      ) : null}
    </span>
  );
  const label = activityLabel(activity, space);
  const tip = (
    <span className="grid gap-0.5">
      <span>{text}</span>
      {activityDetails(activity, space).map((line) => (
        <span key={line} className="font-normal tabular-nums">
          {line}
        </span>
      ))}
    </span>
  );
  return (
    <div className="group/block relative size-full">
      <Tooltip label={tip} side="top">
        {to ? (
          <Link to={to} aria-label={label} className={className}>
            {face}
          </Link>
        ) : (
          <button type="button" aria-label={label} aria-haspopup="dialog" onClick={() => opening.onInspect(activity)} className={cn(className, 'w-full')}>
            {face}
          </button>
        )}
      </Tooltip>
      {opening.onMove ? (
        <Tooltip label="Mover…" side="top">
          <Button
            size="icon"
            className={cn('absolute right-0.5 top-0.5 size-9 rounded-md border-ink/20 bg-white/90 text-ink hover:bg-white lg:size-6 [&_svg]:size-3.5', reveal)}
            aria-label={`Mover… ${text}`}
            onClick={() => opening.onMove?.(activity)}
          >
            <MoveVertical aria-hidden />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
}
