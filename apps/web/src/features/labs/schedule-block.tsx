import type { Activity, Space } from '@platlab/contracts';
import { Button, Tooltip, cn } from '@platlab/ui';
import { MoveVertical, PackageX, TriangleAlert, Users, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
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
 * La cara de un bloque (tabla, lista, «Por programar» y lo que se arrastra), forma «franja de carrera» (decisión del
 * usuario, 15-11-2026): fondo blanco con borde fino y una franja de 4 px a la izquierda con el color fuerte de su carrera
 * (`--tone-edge`, que pone `careerTone`), radio de 6 px y el texto de la planilla.
 */
export const blockFace =
  'overflow-hidden rounded-md border border-line border-l-4 border-l-(color:--tone-edge) bg-surface text-ink shadow-[0_1px_2px_rgb(15_23_42/0.08)]';

/** La carrera en una etiqueta con el tinte de su color (`--tone-bg`): la que distingue el bloque, escrita. */
function CareerTag({ career, className }: { career: string; className?: string | undefined }) {
  return <span className={cn('max-w-full truncate rounded-[4px] bg-(--tone-bg) px-1.5 text-[11px] font-medium leading-4 text-ink', className)}>{career}</span>;
}

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
 * para que Tailwind las encuentre), por prioridad (decisión del usuario, 15-11-2026: materia primero, sin efecto al
 * pasar): el código con la hora y la materia se ven siempre; con alto, la materia pasa a dos líneas antes que nada más;
 * luego la carrera, el Docente con los participantes, el Encargado, la etapa y el aviso de aforo. El detalle completo, a
 * un clic.
 */
const fromHeight = {
  head: 'hidden [@container(min-height:32px)]:flex',
  subject: '[@container(min-height:48px)]:line-clamp-2',
  career: 'hidden [@container(min-height:66px)]:flex',
  teacher: 'hidden [@container(min-height:82px)]:flex',
  manager: 'hidden [@container(min-height:98px)]:flex',
  stage: 'hidden [@container(min-height:114px)]:flex',
  warning: 'hidden [@container(min-height:130px)]:flex',
} as const;

/** Un aviso con su ícono pequeño: la etapa, el aviso de aforo o lo que falta apartar. */
function Notice({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string | undefined }) {
  return (
    <span className={cn('min-w-0 items-start gap-1 text-[11px] font-medium leading-[14px] text-ink', className)}>
      <Icon aria-hidden className="mt-px size-3 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

/**
 * Una persona del bloque en la tabla, dicha con palabra, «Docente  Diego Docente»: el rol apagado, de ancho fijo para que
 * los nombres queden alineados (se oculta si la columna es angosta), el nombre en tinta y, a la derecha, `end`.
 */
function Person({ role, name, end, className }: { role: string; name: string; end?: ReactNode; className?: string | undefined }) {
  return (
    <span className={cn('min-w-0 items-baseline gap-2 text-[11px] leading-[14px]', className)}>
      <span className="hidden w-14 shrink-0 text-ink-muted [@container(min-width:150px)]:inline">{role}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{name}</span>
      {end ?? null}
    </span>
  );
}

/** Los participantes con el ícono de personas, en ámbar si superan el aforo (el triángulo de la materia lo dice también sin color). */
function Participants({ count, over }: { count: number; over: boolean }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-0.5 self-center font-mono font-semibold tabular-nums', over ? 'text-warning' : 'text-ink')}>
      <Users aria-hidden className="size-3" />
      {count}
    </span>
  );
}

/** Una fila de la lista del móvil: el rol apagado y su valor, en la rejilla de dos columnas de las personas. */
function ListRow({ role, children }: { role: string; children: ReactNode }) {
  return (
    <>
      <span className="text-ink-muted">{role}</span>
      <span className="font-medium [overflow-wrap:anywhere]">{children}</span>
    </>
  );
}

/**
 * La cara de un bloque en la tabla (forma «franja de carrera», decisión del usuario, 15-11-2026), en dos zonas para
 * reconocerlo de un vistazo. Arriba, qué práctica es: el código en mono y, a la derecha, la hora si cabe; la materia en
 * negrita con los íconos de etapa, aforo y apartado; y la carrera en su etiqueta de color. Abajo, pegado al borde,
 * quiénes: «Docente» con los participantes (ícono de personas) a la derecha y «Encargado»; sobre ellos, si sobra alto, la etapa y el aviso de
 * aforo.
 */
function TableFace({ activity, over, space, clear }: { activity: Activity; over: boolean; space: Pick<Space, 'capacity'>; clear: string | null }) {
  const StageMark = activity.stage === 'scheduled' ? null : stageMarks[activity.stage];
  return (
    <span className="flex size-full flex-col gap-0.5 px-2 py-1 text-left [container-type:size]">
      <span className={cn('items-baseline justify-between gap-2 font-mono text-[11px] leading-[14px] tabular-nums text-ink-muted', fromHeight.head, clear)}>
        <span className="min-w-0 truncate font-semibold">{activity.code}</span>
        <span className="ml-auto hidden shrink-0 [@container(min-width:168px)]:block">
          {activity.startsAt}–{activity.endsAt}
        </span>
      </span>
      <span className={cn('flex min-w-0 items-start gap-1 text-[13px] font-semibold leading-4', clear)}>
        {StageMark ? <StageMark aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
        {over ? <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
        {!activity.complete ? <PackageX aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
        <span className={cn('min-w-0 line-clamp-1 [overflow-wrap:anywhere]', fromHeight.subject)}>{blockParts(activity).subject}</span>
      </span>
      {activity.group ? (
        <span className={cn('min-w-0', fromHeight.career)}>
          <CareerTag career={activity.group} />
        </span>
      ) : null}
      <span className="mt-auto" />
      {StageMark ? (
        <Notice icon={StageMark} className={fromHeight.stage}>
          {stageLabels[activity.stage]}
        </Notice>
      ) : null}
      {over ? (
        <Notice icon={TriangleAlert} className={cn('tabular-nums', fromHeight.warning)}>
          {capacityWarning(activity.participants, space.capacity)}
        </Notice>
      ) : null}
      <Person role="Docente" name={activity.requesterName} end={<Participants count={activity.participants} over={over} />} className={fromHeight.teacher} />
      <Person role="Encargado" name={activity.responsibleName} className={fromHeight.manager} />
    </span>
  );
}

/**
 * La cara de un bloque en la lista del móvil, con todo a la vista y sin cortar, en el mismo orden que la tabla: el código
 * y la hora, la materia, la carrera en su etiqueta, «Docente», «Encargado» y «Participantes», y los avisos de aforo, etapa
 * y «Falta apartar recursos».
 */
function ListFace({ activity, over, space, clear }: { activity: Activity; over: boolean; space: Pick<Space, 'capacity'>; clear: string | null }) {
  const StageMark = activity.stage === 'scheduled' ? null : stageMarks[activity.stage];
  return (
    <span className="flex size-full flex-col gap-1 px-3 py-2 text-left">
      <span className={cn('flex justify-between gap-2 font-mono text-xs font-semibold tabular-nums text-ink-muted', clear)}>
        <span className="min-w-0 truncate">{activity.code}</span>
        <span className="shrink-0 font-normal">
          {activity.startsAt}–{activity.endsAt}
        </span>
      </span>
      <span className={cn('min-w-0 text-sm font-semibold leading-5 [overflow-wrap:anywhere]', clear)}>{blockParts(activity).subject}</span>
      {activity.group ? <CareerTag career={activity.group} className="w-fit whitespace-normal [overflow-wrap:anywhere]" /> : null}
      <span className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs leading-4">
        <ListRow role="Docente">{activity.requesterName}</ListRow>
        <ListRow role="Encargado">{activity.responsibleName}</ListRow>
        <ListRow role="Participantes">
          <span className={cn('font-mono tabular-nums', over && 'text-warning')}>{activity.participants}</span>
        </ListRow>
      </span>
      {over ? (
        <Notice icon={TriangleAlert} className="flex tabular-nums">
          {capacityWarning(activity.participants, space.capacity)}
        </Notice>
      ) : null}
      {StageMark ? (
        <Notice icon={StageMark} className="flex">
          {stageLabels[activity.stage]}
        </Notice>
      ) : null}
      {activity.complete ? null : (
        <Notice icon={PackageX} className="flex">
          {MISSING_HOLDS}
        </Notice>
      )}
    </span>
  );
}

/**
 * Un bloque de la tabla o de la lista, sobre el color de su carrera y con sus datos a la vista (`TableFace` y
 * `ListFace`); la carrera va escrita y en el color. Es un solo control, un enlace a su solicitud o un botón que abre su
 * panel con todo; quien programa suma un botón pequeño «Mover…». En la tabla, cada bloque deja aire a su alrededor
 * dentro de su celda.
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
