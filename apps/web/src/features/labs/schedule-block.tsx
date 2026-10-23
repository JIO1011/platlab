import type { Activity, Space } from '@platlab/contracts';
import { Button, Tooltip, cn } from '@platlab/ui';
import { MoveVertical } from 'lucide-react';
import { Link } from 'react-router';
import { activityDetails, activityLabel, blockText, overCapacity } from './schedule-grid';
import { careerTone } from './schedule-career-color';

/** Cómo se abre y se mueve un bloque: la solicitud para quien puede verla, un panel de solo lectura para los demás y, para quien programa, «Mover…». */
export interface BlockOpening {
  /** Dónde está la solicitud del bloque para esta persona; nulo si no la puede ver (el Administrador y el Operador, en Recibidas; el Docente, solo la suya). */
  linkOf: (activity: Activity) => string | null;
  /** Abre el panel de solo lectura del bloque. */
  onInspect: (activity: Activity) => void;
  /** Abre «Mover…» (área, hora o responsable el mismo día); solo quien programa. */
  onMove?: ((activity: Activity) => void) | undefined;
}

/** La cara de un bloque (tabla, lista y «Por programar»): fondo suave por carrera, borde fino y texto de la planilla. */
export const blockFace = 'overflow-hidden rounded-md border border-ink/15 text-ink';

/** El texto de un bloque, centrado y ajustado al ancho; si no cabe, se corta por abajo y el tooltip lo dice entero. */
export const blockTextClass = 'text-center font-medium leading-tight [overflow-wrap:anywhere]';

/** Los controles secundarios del bloque aparecen al pasar o enfocar; sin puntero (táctil), se ven siempre. */
const reveal =
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/block:opacity-100 [@media(hover:hover)]:group-focus-within/block:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100';

/**
 * Un bloque de la tabla o de la lista (decisión del usuario, 24-10-2026): solo «Materia - Carrera - Docente», centrado,
 * con el fondo de su carrera. La hora, el código y el responsable van al nombre accesible y al tooltip. Es un solo
 * control, un enlace a su solicitud o un botón que abre su panel; quien programa suma un botón pequeño «Mover…».
 */
export function ScheduleBlock({ activity, space, opening, size }: { activity: Activity; space: Pick<Space, 'capacity'>; opening: BlockOpening; size: 'table' | 'list' }) {
  const to = opening.linkOf(activity);
  const text = blockText(activity);
  const className = cn(
    blockFace,
    careerTone(activity.group),
    'relative block size-full transition-[filter] hover:brightness-95',
    'focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
    size === 'list' && 'min-h-11',
  );
  const face = (
    <>
      <span className={cn('grid size-full [align-content:safe_center]', blockTextClass, size === 'list' ? 'px-3 py-2 text-sm' : 'px-1.5 py-0.5 text-xs')}>{text}</span>
      {overCapacity(activity, space) ? (
        <span aria-hidden className="absolute left-1 top-0 text-[11px] font-bold leading-none">
          ⚠
        </span>
      ) : null}
    </>
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
