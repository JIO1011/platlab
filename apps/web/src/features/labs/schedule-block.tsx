import type { Activity, Space } from '@platlab/contracts';
import { Button, Tooltip, cn } from '@platlab/ui';
import { GraduationCap, MoveVertical, PackageX, TriangleAlert, UserCheck, Users, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { countText } from '../../app/format';
import { MISSING_HOLDS, activityLabel, blockParts, blockText, capacityWarning, overCapacity, toMinutes } from './schedule-grid';
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
 * Las líneas de texto de una solicitud por programar (la ficha de «Por programar», `tile`, y su lista en pantalla estrecha,
 * `list`): la materia en negrita y «Carrera · Docente» debajo. En la ficha cada una ocupa una línea con elipsis; en la
 * lista, la materia baja de línea si hace falta.
 */
export function BlockCopy({ parts, variant }: { parts: { subject: string; byline: string }; variant: 'list' | 'tile' }) {
  const list = variant === 'list';
  return (
    <>
      <span className={cn('block min-w-0 font-semibold', list ? 'text-sm leading-5' : 'truncate text-xs leading-[15px]')}>
        <span className="[overflow-wrap:anywhere]">{parts.subject}</span>
      </span>
      {parts.byline ? <span className={cn('block [overflow-wrap:anywhere]', list ? 'text-xs leading-4' : 'truncate text-[11px] leading-[14px]')}>{parts.byline}</span> : null}
    </>
  );
}

/** Los controles secundarios del bloque aparecen al pasar o enfocar; sin puntero (táctil), se ven siempre. */
const reveal =
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/block:opacity-100 [@media(hover:hover)]:group-focus-within/block:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100';

/**
 * Desde qué alto interior se ve cada línea de un bloque de la tabla (consulta del alto interior; las clases van completas
 * para que Tailwind las encuentre): el código (y la hora si cabe), el docente, el encargado, los participantes y el aviso de aforo.
 */
const fromHeight = {
  head: 'hidden [@container(min-height:30px)]:flex',
  teacher: 'hidden [@container(min-height:46px)]:flex',
  manager: 'hidden [@container(min-height:64px)]:flex',
  people: 'hidden [@container(min-height:80px)]:flex',
  warning: 'hidden [@container(min-height:110px)]:flex',
} as const;

/** Una línea de datos con su ícono pequeño: en la tabla se corta con elipsis solo si no cabe; en la lista, baja de línea. */
function Detail({ icon: Icon, table, children, className }: { icon: LucideIcon; table: boolean; children: ReactNode; className?: string | undefined }) {
  return (
    <span className={cn('items-start gap-1 text-[11px] leading-[14px] text-ink', className)}>
      <Icon aria-hidden className="mt-px size-3 shrink-0" />
      <span className={cn('min-w-0', table ? 'truncate' : '[overflow-wrap:anywhere]')}>{children}</span>
    </span>
  );
}

/**
 * Un bloque de la tabla o de la lista (decisión del usuario, 14-11-2026), sobre el color de su carrera y con sus datos a la
 * vista, sin ficha al pasar el cursor. En este orden, que es el de prioridad: el código en mono, que se ve siempre (con
 * elipsis si la columna es muy angosta), y, a la derecha, la hora si cabe junto al código (la posición del bloque ya la
 * indica y va en el nombre accesible);
 * la materia en negrita (hasta dos líneas); el Docente; el Encargado; y los participantes, con el aviso de aforo si se
 * supera. En la tabla, el alto del bloque decide cuántas se ven (`fromHeight`): un bloque de una hora muestra al menos
 * código y materia, y uno de dos horas, todo. La carrera solo va en el color y en el nombre accesible. Es un solo control, un enlace a su solicitud o un botón
 * que abre su panel; quien programa suma un botón pequeño «Mover…». La etapa y «Falta apartar recursos» llevan su ícono; la
 * etapa, además, su texto (junto a los participantes en la tabla, en su línea en la lista). Cada bloque deja 2 px de aire
 * a su alrededor dentro de su celda.
 */
export function ScheduleBlock({ activity, space, opening, size }: { activity: Activity; space: Pick<Space, 'capacity'>; opening: BlockOpening; size: 'table' | 'list' }) {
  const toneOf = useCareerTone();
  const to = opening.linkOf(activity);
  const text = blockText(activity);
  const minutes = toMinutes(activity.endsAt) - toMinutes(activity.startsAt);
  const table = size === 'table';
  const over = overCapacity(activity, space);
  const row = (key: keyof typeof fromHeight) => (table ? fromHeight[key] : 'flex');
  // Con «Mover…», las dos primeras líneas dejan libre el lado derecho del botón.
  const clear = opening.onMove ? 'pr-7' : null;
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
    <span className={cn('flex size-full flex-col gap-px text-left', table ? 'px-2 py-[2px] [container-type:size]' : 'gap-1 px-3 py-2')}>
      <span className={cn('items-baseline justify-between gap-2 font-mono text-[11px] leading-[14px] tabular-nums text-ink-muted', row('head'), clear)}>
        <span className="min-w-0 truncate">{activity.code}</span>
        {table ? (
          <span className="ml-auto hidden shrink-0 [@container(min-width:192px)]:block">
            {activity.startsAt}–{activity.endsAt}
          </span>
        ) : null}
      </span>
      <span className={cn('flex min-w-0 items-start gap-1 font-semibold', table ? 'text-xs leading-[15px]' : 'text-sm leading-5', clear)}>
        {icons}
        <span className={cn('min-w-0 [overflow-wrap:anywhere]', table && 'line-clamp-1 [@container(min-height:96px)]:line-clamp-2')}>{blockParts(activity).subject}</span>
      </span>
      <Detail icon={GraduationCap} table={table} className={row('teacher')}>
        {activity.requesterName}
      </Detail>
      <Detail icon={UserCheck} table={table} className={row('manager')}>
        {activity.responsibleName}
      </Detail>
      <Detail icon={Users} table={table} className={cn('tabular-nums', row('people'))}>
        {countText(activity.participants, 'participante', 'participantes')}
        {table && StageMark ? <span className="hidden font-medium [@container(min-width:176px)]:inline"> · {stageLabels[activity.stage]}</span> : null}
      </Detail>
      {over ? (
        <Detail icon={TriangleAlert} table={table} className={cn('font-medium tabular-nums', row('warning'))}>
          {capacityWarning(activity.participants, space.capacity)}
        </Detail>
      ) : null}
      {StageMark && !table ? (
        <span className="flex items-center gap-1 text-xs font-medium leading-4">
          <StageMark aria-hidden className="size-3.5 shrink-0" />
          {stageLabels[activity.stage]}
        </span>
      ) : null}
      {!activity.complete && !table ? (
        <span className="flex items-center gap-1 text-xs font-medium leading-4">
          <PackageX aria-hidden className="size-3.5 shrink-0" />
          {MISSING_HOLDS}
        </span>
      ) : null}
    </span>
  );
  const stage = activity.stage === 'scheduled' ? [] : [`Etapa: ${stageLabels[activity.stage]}`];
  const label = [activityLabel(activity, space), ...stage].join(', ');
  return (
    <div className={cn('group/block relative size-full', table && 'p-0.5')}>
      {to ? (
        <Link to={to} aria-label={label} className={className}>
          {face}
        </Link>
      ) : (
        <button type="button" aria-label={label} aria-haspopup="dialog" onClick={() => opening.onInspect(activity)} className={cn(className, 'w-full')}>
          {face}
        </button>
      )}
      {opening.onMove ? (
        <Tooltip label="Mover…" side="top">
          <Button
            size="icon"
            className={cn(
              'absolute right-1 top-1 size-9 rounded-md border-ink/20 bg-white/90 text-ink hover:bg-white [&_svg]:size-3.5',
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
