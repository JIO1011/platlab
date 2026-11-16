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
 * Desde qué alto interior se ve cada parte de un bloque de la tabla (consulta del alto interior; las clases van completas
 * para que Tailwind las encuentre): el código con la hora, el pie con el docente y los participantes, el encargado, la
 * etapa y el aviso de aforo. La materia se ve siempre; en dos líneas si sobra alto.
 */
const fromHeight = {
  head: 'hidden [@container(min-height:30px)]:flex',
  foot: 'hidden [@container(min-height:48px)]:flex',
  manager: 'hidden [@container(min-height:66px)]:flex',
  stage: 'hidden [@container(min-height:82px)]:flex',
  warning: 'hidden [@container(min-height:98px)]:flex',
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

/** El código de la práctica en mono, teñido con el borde de su carrera (`--tone-edge`) y oscurecido para que se lea. */
const codeText = 'font-mono text-[11px] font-semibold leading-[14px] tabular-nums text-[color-mix(in_oklab,var(--tone-edge)_55%,var(--color-ink))]';

/**
 * La cara de un bloque en la tabla (forma decidida por el usuario, 15-11-2026): arriba el código teñido y, a la derecha, la
 * hora si cabe; la materia en negrita con los íconos de etapa, aforo y apartado; y abajo, pegado al borde, el Docente a la
 * izquierda y los participantes («26p») a la derecha. Si sobra alto, sobre el pie, el Encargado, la etapa y el aviso de aforo.
 */
function TableFace({ activity, over, space, clear }: { activity: Activity; over: boolean; space: Pick<Space, 'capacity'>; clear: string | null }) {
  const StageMark = activity.stage === 'scheduled' ? null : stageMarks[activity.stage];
  return (
    <span className="flex size-full flex-col gap-0.5 px-2 py-1 text-left [container-type:size]">
      <span className={cn('items-baseline justify-between gap-2', fromHeight.head, clear)}>
        <span className={cn('min-w-0 truncate', codeText)}>{activity.code}</span>
        <span className="ml-auto hidden shrink-0 font-mono text-[11px] leading-[14px] tabular-nums text-ink-muted [@container(min-width:168px)]:block">
          {activity.startsAt}–{activity.endsAt}
        </span>
      </span>
      <span className={cn('flex min-w-0 items-start gap-1 text-[13px] font-semibold leading-4', clear)}>
        {StageMark ? <StageMark aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
        {over ? <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
        {!activity.complete ? <PackageX aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
        <span className="min-w-0 line-clamp-1 [overflow-wrap:anywhere] [@container(min-height:112px)]:line-clamp-2">{blockParts(activity).subject}</span>
      </span>
      <span className="mt-auto" />
      <Detail icon={UserCheck} table className={cn('text-ink-muted', fromHeight.manager)}>
        {activity.responsibleName}
      </Detail>
      {StageMark ? (
        <Detail icon={StageMark} table className={cn('font-medium', fromHeight.stage)}>
          {stageLabels[activity.stage]}
        </Detail>
      ) : null}
      {over ? (
        <Detail icon={TriangleAlert} table className={cn('font-medium tabular-nums', fromHeight.warning)}>
          {capacityWarning(activity.participants, space.capacity)}
        </Detail>
      ) : null}
      <span className={cn('items-baseline justify-between gap-2 text-xs leading-4', fromHeight.foot)}>
        <span className="min-w-0 truncate text-ink-muted">{activity.requesterName}</span>
        <span className={cn('shrink-0 font-mono font-semibold tabular-nums', over ? 'text-warning' : 'text-ink')}>{activity.participants}p</span>
      </span>
    </span>
  );
}

/**
 * La cara de un bloque en la lista del móvil, con todo a la vista y sin cortar: el código, la materia, el Docente, el
 * Encargado, los participantes, el aviso de aforo si se supera, la etapa y «Falta apartar recursos».
 */
function ListFace({ activity, over, space, clear }: { activity: Activity; over: boolean; space: Pick<Space, 'capacity'>; clear: string | null }) {
  const StageMark = activity.stage === 'scheduled' ? null : stageMarks[activity.stage];
  return (
    <span className="flex size-full flex-col gap-1 px-3 py-2 text-left">
      <span className={cn('flex', codeText, clear)}>
        <span className="min-w-0 truncate">{activity.code}</span>
      </span>
      <span className={cn('min-w-0 text-sm font-semibold leading-5 [overflow-wrap:anywhere]', clear)}>{blockParts(activity).subject}</span>
      <Detail icon={GraduationCap} table={false} className="flex">
        {activity.requesterName}
      </Detail>
      <Detail icon={UserCheck} table={false} className="flex">
        {activity.responsibleName}
      </Detail>
      <Detail icon={Users} table={false} className="flex tabular-nums">
        {countText(activity.participants, 'participante', 'participantes')}
      </Detail>
      {over ? (
        <Detail icon={TriangleAlert} table={false} className="flex font-medium tabular-nums">
          {capacityWarning(activity.participants, space.capacity)}
        </Detail>
      ) : null}
      {StageMark ? (
        <span className="flex items-center gap-1 text-xs font-medium leading-4">
          <StageMark aria-hidden className="size-3.5 shrink-0" />
          {stageLabels[activity.stage]}
        </span>
      ) : null}
      {activity.complete ? null : (
        <span className="flex items-center gap-1 text-xs font-medium leading-4">
          <PackageX aria-hidden className="size-3.5 shrink-0" />
          {MISSING_HOLDS}
        </span>
      )}
    </span>
  );
}

/**
 * Un bloque de la tabla o de la lista, sobre el color de su carrera y con sus datos a la vista, sin ficha al pasar el
 * cursor (`TableFace` y `ListFace`). La carrera solo va en el color y en el nombre accesible. Es un solo control, un
 * enlace a su solicitud o un botón que abre su panel; quien programa suma un botón pequeño «Mover…». En la tabla, cada
 * bloque deja aire a su alrededor dentro de su celda.
 */
export function ScheduleBlock({ activity, space, opening, size }: { activity: Activity; space: Pick<Space, 'capacity'>; opening: BlockOpening; size: 'table' | 'list' }) {
  const toneOf = useCareerTone();
  const to = opening.linkOf(activity);
  const text = blockText(activity);
  const minutes = toMinutes(activity.endsAt) - toMinutes(activity.startsAt);
  const table = size === 'table';
  const over = overCapacity(activity, space);
  // Con «Mover…», las dos primeras líneas dejan libre el lado derecho del botón.
  const clear = opening.onMove ? 'pr-7' : null;
  const className = cn(
    blockFace,
    toneOf(activity.group),
    'relative block size-full [@media(hover:hover)]:transition-[filter] [@media(hover:hover)]:hover:brightness-95',
    'focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
    !table && 'min-h-11',
  );
  const face = table ? <TableFace activity={activity} over={over} space={space} clear={clear} /> : <ListFace activity={activity} over={over} space={space} clear={clear} />;
  const stage = activity.stage === 'scheduled' ? [] : [`Etapa: ${stageLabels[activity.stage]}`];
  const label = [activityLabel(activity, space), ...stage].join(', ');
  return (
    <div className={cn('group/block relative size-full', table && 'px-1.5 py-0.5')}>
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
              'absolute size-9 rounded-md border-ink/20 bg-white/90 text-ink hover:bg-white [&_svg]:size-3.5',
              // En la tabla, dentro del aire que deja el bloque en su celda.
              table ? 'right-2.5 top-1.5' : 'right-1 top-1',
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
