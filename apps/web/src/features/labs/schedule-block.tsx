import type { Activity, Space } from '@platlab/contracts';
import { Button, Tooltip, cn } from '@platlab/ui';
import { MoveVertical, PackageX, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { MISSING_HOLDS, activityDetails, activityLabel, blockParts, blockText, capacityWarning, overCapacity, toMinutes } from './schedule-grid';
import { stageLabels, stageMarks } from './practice-stage';
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
 * La cara de un bloque (tabla, lista y «Por programar»): fondo de tinte medio por carrera con un borde fino de todo el
 * perímetro del mismo tono más oscuro (`careerTone` los pone), radio de 8 px y el texto de la planilla.
 */
export const blockFace = 'overflow-hidden rounded-lg border text-ink shadow-[0_1px_2px_rgb(15_23_42/0.08)]';

/**
 * Las líneas de texto de un bloque, siempre en este orden: la materia en negrita y «Carrera · Docente» debajo; cada línea
 * se corta con elipsis, nunca se solapa, y el tooltip dice todo. En la tabla (`table`), el alto del bloque decide cuánto
 * se ve (consulta del alto interior): la materia sola hasta ~30 px, con «Carrera · Docente» desde ahí, la materia en dos
 * líneas desde ~60 px y «Carrera · Docente» en dos desde ~72 px. En la ficha de «Por programar» (`tile`) cada una ocupa una línea; en la lista (`list`), la materia
 * baja de línea si hace falta. `icons` va delante de la materia (aforo y recursos en la tabla); `clear` deja libre el lado
 * del botón «Mover…».
 */
export function BlockCopy({ parts, variant, icons, clear }: { parts: { subject: string; byline: string }; variant: 'table' | 'list' | 'tile'; icons?: ReactNode; clear?: string | null | undefined }) {
  const table = variant === 'table';
  const list = variant === 'list';
  return (
    <>
      <span className={cn('flex min-w-0 items-start gap-1 font-semibold', list ? 'text-sm leading-5' : 'text-xs leading-[15px]', clear)}>
        {icons}
        <span className={cn('min-w-0 [overflow-wrap:anywhere]', table ? 'line-clamp-1 [@container(min-height:60px)]:line-clamp-2' : list ? null : 'truncate')}>{parts.subject}</span>
      </span>
      {parts.byline ? (
        <span className={cn(table ? 'hidden [@container(min-height:30px)]:block' : 'block', clear)}>
          <span className={cn('[overflow-wrap:anywhere]', list ? 'block text-xs leading-4' : 'text-[11px] leading-[14px]', table ? 'line-clamp-1 [@container(min-height:72px)]:line-clamp-2' : !list && 'block truncate')}>{parts.byline}</span>
        </span>
      ) : null}
    </>
  );
}

/** Los controles secundarios del bloque aparecen al pasar o enfocar; sin puntero (táctil), se ven siempre. */
const reveal =
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/block:opacity-100 [@media(hover:hover)]:group-focus-within/block:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100';

/**
 * Un bloque de la tabla o de la lista (decisión del usuario, 24-10-2026): sobre el color de su carrera, la materia en
 * negrita, «Carrera · Docente» debajo y la hora en pequeño, cada una si el alto del bloque lo permite (`BlockCopy`). El
 * código y el responsable van al nombre accesible y al tooltip. Es un
 * solo control, un enlace a su solicitud o un botón que abre su panel; quien programa suma un botón pequeño «Mover…».
 * Si lo apartado no alcanza (L-01d), el bloque suma un ícono en la tabla y la línea «Falta apartar recursos» en la lista; el texto
 * accesible y el tooltip lo dicen siempre.
 */
export function ScheduleBlock({ activity, space, opening, size }: { activity: Activity; space: Pick<Space, 'capacity'>; opening: BlockOpening; size: 'table' | 'list' }) {
  const toneOf = useCareerTone();
  const to = opening.linkOf(activity);
  const text = blockText(activity);
  const minutes = toMinutes(activity.endsAt) - toMinutes(activity.startsAt);
  const table = size === 'table';
  const over = overCapacity(activity, space);
  // Con «Mover…» en la tabla ancha, el texto y la hora dejan libre el lado derecho del botón.
  const clear = table && opening.onMove ? 'pr-7' : null;
  const className = cn(
    blockFace,
    toneOf(activity.group),
    'relative block size-full [@media(hover:hover)]:transition-[filter] [@media(hover:hover)]:hover:brightness-95',
    'focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
    !table && 'min-h-11',
  );
  const StageMark = activity.stage === 'scheduled' ? null : stageMarks[activity.stage];
  const icons =
    table && (over || !activity.complete || StageMark) ? (
      <>
        {StageMark ? <StageMark aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
        {over ? <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
        {!activity.complete ? <PackageX aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
      </>
    ) : null;
  const face = (
    <span className={cn('flex size-full flex-col justify-start text-left', table ? 'px-2 py-[2px] [container-type:size]' : 'gap-0.5 px-3 py-2')}>
      <BlockCopy parts={blockParts(activity)} variant={table ? 'table' : 'list'} icons={icons} clear={clear} />
      {StageMark && !table ? (
        <span className="mt-1 flex items-center gap-1 text-xs font-medium leading-4">
          <StageMark aria-hidden className="size-3.5 shrink-0" />
          {stageLabels[activity.stage]}
        </span>
      ) : null}
      {over && !table ? (
        <span className="mt-1 flex items-center gap-1 text-xs font-medium leading-4 tabular-nums">
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          {capacityWarning(activity.participants, space.capacity)}
        </span>
      ) : null}
      {!activity.complete && !table ? (
        <span className="mt-1 flex items-center gap-1 text-xs font-medium leading-4">
          <PackageX aria-hidden className="size-3.5 shrink-0" />
          {MISSING_HOLDS}
        </span>
      ) : null}
      {table ? (
        <span aria-hidden className={cn('hidden text-[11px] leading-[14px] tabular-nums text-ink-muted [@container(min-height:44px)]:block', clear)}>
          {activity.startsAt}–{activity.endsAt}
          {activity.stage === 'scheduled' ? null : ` · ${stageLabels[activity.stage]}`}
        </span>
      ) : null}
    </span>
  );
  const stage = activity.stage === 'scheduled' ? [] : [`Etapa: ${stageLabels[activity.stage]}`];
  const label = [activityLabel(activity, space), ...stage].join(', ');
  const tip = (
    <span className="grid gap-0.5">
      <span>{text}</span>
      {[...activityDetails(activity, space), ...stage].map((line) => (
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
            className={cn(
              'absolute right-0.5 top-0.5 size-9 rounded-md border-ink/20 bg-white/90 text-ink hover:bg-white [&_svg]:size-3.5',
              // En la tabla, un bloque de menos de 45 min (una o dos filas) no alcanza para el botón de 24 px.
              table && minutes < 45 ? 'lg:size-5' : 'lg:size-6',
              reveal,
            )}
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
