import { useDroppable } from '@dnd-kit/core';
import type { Activity, Closure, Space } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { CircleCheck, CircleX, LoaderCircle, TriangleAlert, Users } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useNow } from '../../app/use-now';
import { ScheduleBlock, type BlockOpening } from './schedule-block';
import { DraggableBlock, useDragPreview, type ColumnData, type SavingDrop } from './schedule-dnd';
import { ROW_MINUTES, activitiesOfArea, areaLabel, blockSpan, closedAllDay, closedSpans, dayHoursText, daySlots, hourMarks, offHourMarks, placement, timeText, withoutHours, type DayRange, type Span } from './schedule-grid';
import { nowMinutes } from '../../app/calendar';
import { blockingTexts, capacityText } from './schedule-placement';
import { softCard } from './style';

/**
 * El alto de una fila (media hora): reparte el alto de la tabla entre sus filas para que 07:00–19:00 se vea completo sin
 * desplazar, sin bajar de 20 px; solo si ni así caben, la tabla se desplaza por dentro, no la página. `100cqh` es el alto
 * de la tabla (su contenedor) y `--head`, la cabecera de áreas. Los bloques se colocan en porcentaje, así que siguen a la fila.
 */
const ROW_HEIGHT = 'max(20px, calc((100cqh - var(--head)) / var(--rows)))';

/** El alto de la cabecera de las columnas: nombre del área y aforo, y una línea por cada tramo del horario del día. */
const headHeight = (slotLines: number) => `calc(3.75rem + ${Math.max(slotLines - 1, 0)}rem)`;

/** Cuántas líneas de horario lleva la cabecera de un área ese día: una por tramo, o una («Cerrada») si no abre. */
const slotLines = (space: Space, date: string, closures: readonly Closure[]) => (closedAllDay(space, date, closures) === null ? daySlots(space, date).length : 1);

/** El ancho mínimo de una columna de área y el de la columna de horas. */
const COLUMN_MIN = '7.5rem';
const HOURS_WIDTH = '3.75rem';

/** El alto de la columna del día: una fila por cada media hora del rango. */
const columnHeight = (range: DayRange) => `calc(var(--row) * ${(range.end - range.start) / ROW_MINUTES})`;

/** El estilo de una posición en la columna, en porcentaje del rango del día. */
const at = (span: { from: number; to: number }, range: DayRange) => {
  const { top, height } = placement(span, range);
  return { top: `${top}%`, height: `${height}%` };
};

/** La trama diagonal suave de lo cerrado: lo distingue sin depender del tono. */
const hatch = 'repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in oklab, var(--color-ink) 6%, transparent) 6px 7px)';

/** Dónde cae un instante del día en la columna, en porcentaje del rango. */
const topOf = (minute: number, range: DayRange) => `${placement({ from: minute, to: minute }, range).top}%`;

/** Las líneas finas de cada hora en punto, detrás de todo: la tabla se lee por horas, sin bandas (decisión del usuario, 15-11-2026). */
function HourLines({ range }: { range: DayRange }) {
  return (
    <>
      {hourMarks(range)
        .filter((mark) => mark > range.start)
        .map((mark) => (
          <span key={mark} aria-hidden className="absolute inset-x-0 border-t border-line" style={{ top: topOf(mark, range) }} />
        ))}
    </>
  );
}

/** La línea de «ahora» de una columna, cuando se mira hoy: fina y oscura, de lado a lado. */
function NowLine({ now, range }: { now: number | null; range: DayRange }) {
  if (now === null) return null;
  return <span aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t border-ink" style={{ top: topOf(now, range) }} />;
}

/**
 * El horario que pidió la solicitud mientras se arrastra (decisión del usuario, 15-11-2026): una franja con el acento y
 * líneas discontinuas arriba y abajo, en cada columna, para colocar el bloque en ella. Solo guía: se puede soltar en otra hora.
 */
function RequestedBand({ range }: { range: DayRange }) {
  const requested = useDragPreview()?.requested;
  if (!requested) return null;
  return <span aria-hidden className="pointer-events-none absolute inset-x-0 border-y-2 border-dashed border-action-deep/70 bg-action/15" style={at(requested, range)} />;
}

/**
 * En la columna de horas, las horas que no son en punto (decisión del usuario, 15-11-2026): las de inicio y fin de los
 * bloques del día (`marks`) en pequeño y, mientras se arrastra, las de donde caería y las del horario pedido, en tinta. Cada
 * una con una marca corta hacia la tabla, a la altura exacta.
 */
function OffHourMarks({ range, marks }: { range: DayRange; marks: readonly number[] }) {
  const drag = useDragPreview();
  const inside = (mark: number | undefined): mark is number => mark !== undefined && mark % 60 !== 0 && mark > range.start && mark < range.end;
  const live = [drag?.preview?.start, drag?.preview?.end, drag?.requested?.from, drag?.requested?.to].filter(inside);
  return (
    <>
      {[...new Set([...marks, ...live])].map((mark) => (
        <span
          key={mark}
          className={cn('absolute right-0 z-[5] flex -translate-y-1/2 items-center gap-0.5 font-mono text-[10px] leading-3 tabular-nums', live.includes(mark) ? 'font-semibold text-ink' : 'text-ink-muted')}
          style={{ top: topOf(mark, range) }}
        >
          <span className="rounded-[3px] bg-surface px-0.5">{timeText(mark)}</span>
          <span aria-hidden className="h-px w-1.5 bg-current" />
        </span>
      ))}
    </>
  );
}

/** Lo que la vista previa dice del horario pedido: que cae en él, o cuál es; nada si la solicitud no lo trae. */
function requestedText(requested: Span | null, start: number): string | null {
  if (!requested) return null;
  return start === requested.from ? 'En el horario pedido' : `Pedido: ${timeText(requested.from)}–${timeText(requested.to)}`;
}

/**
 * Dónde caería lo que se arrastra en esta columna, dicho con texto y con ícono: «círculo con visto» si cabe, «círculo con
 * cruz» y el motivo si no, «triángulo de alerta» si supera el aforo (solo avisa) y si cae en el horario pedido. El lugar
 * cae en la fila de la hora bajo el puntero (o en la hora pedida, si está en esa fila).
 */
function DropPreview({ range, space }: { range: DayRange; space: Space }) {
  const drag = useDragPreview();
  const preview = drag?.preview;
  if (!preview || preview.areaId !== space.areaId) return null;
  const blocked = preview.check.blocking.length > 0;
  const capacity = capacityText(preview.check, preview.participants, preview.capacity);
  const requested = requestedText(drag.requested, preview.start);
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0.5 z-10 overflow-hidden rounded-md border-2 border-dashed px-1.5 py-1 text-center text-xs leading-tight',
        blocked ? 'border-danger bg-danger-soft text-danger' : 'border-success bg-success-soft text-success',
      )}
      style={at({ from: preview.start, to: preview.end }, range)}
    >
      <p className="inline-flex items-center justify-center gap-1 font-semibold">
        {blocked ? <CircleX aria-hidden className="size-3.5 shrink-0" /> : <CircleCheck aria-hidden className="size-3.5 shrink-0" />}
        <span className="tabular-nums">
          {timeText(preview.start)}–{timeText(preview.end)}
        </span>
      </p>
      <p>{blocked ? blockingTexts(preview.check).join(' · ') : 'Libre'}</p>
      {!blocked && capacity ? (
        <p className="inline-flex items-center justify-center gap-1 font-medium text-warning">
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          {capacity}
        </p>
      ) : null}
      {requested ? <p className="font-medium text-ink">{requested}</p> : null}
    </div>
  );
}

/**
 * El destino de lo que se soltó mientras el servidor responde: «Guardando» con el horario. El bloque sigue en su sitio
 * hasta la respuesta; nada se pinta como hecho antes (sin UI optimista sobre lo programado).
 */
function SavingMark({ range, saving }: { range: DayRange; saving: SavingDrop }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-0.5 z-10 grid content-center justify-items-center overflow-hidden rounded-md border-2 border-dashed border-line-strong bg-surface-sunken px-1.5 py-1 text-center text-xs leading-tight text-ink"
      style={at({ from: saving.start, to: saving.end }, range)}
    >
      <p className="inline-flex items-center gap-1 font-semibold">
        <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" />
        Guardando…
      </p>
      <p className="tabular-nums text-ink-muted">
        {timeText(saving.start)}–{timeText(saving.end)}
      </p>
    </div>
  );
}

/**
 * Una columna de un área: lo cerrado en un tono apagado con trama diagonal (si cierra todo el día, el motivo en el centro, «Cerrada este
 * día»; lo que el horario deja fuera, sin rótulo, con el motivo en el título y el nombre accesible) y los bloques encima;
 * destino de lo que se arrastra.
 */
function AreaColumn({
  space,
  date,
  range,
  now,
  dayItems,
  closures,
  opening,
  canSchedule,
  saving,
}: {
  space: Space;
  date: string;
  range: DayRange;
  now: number | null;
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  opening: BlockOpening;
  canSchedule: boolean;
  saving: SavingDrop | null;
}) {
  const data: ColumnData = { range };
  const { setNodeRef } = useDroppable({ id: space.areaId, data, disabled: !canSchedule });
  return (
    <div ref={setNodeRef} role="group" aria-label={`Bloques de ${space.areaName}`} className="relative border-l border-line" style={{ height: columnHeight(range) }}>
      <HourLines range={range} />
      <RequestedBand range={range} />
      {closedSpans(space, date, range, closures).map((span) => (
        <div
          key={`${span.from}-${span.to}`}
          role="img"
          aria-label={span.reason}
          title={span.reason}
          className="absolute inset-x-0 grid place-items-center overflow-hidden bg-ink/[0.03]"
          style={{ ...at(span, range), backgroundImage: hatch }}
        >
          {span.labeled ? <span className="px-2 text-center text-[13px] leading-5 text-ink-muted [overflow-wrap:anywhere]">{span.reason}</span> : null}
        </div>
      ))}
      {activitiesOfArea(dayItems, space.areaId).map((activity) => (
        <DraggableBlock key={activity.id} activity={activity} enabled={canSchedule} style={at(blockSpan(activity), range)}>
          <ScheduleBlock activity={activity} space={space} opening={opening} size="table" />
        </DraggableBlock>
      ))}
      <NowLine now={now} range={range} />
      <DropPreview range={range} space={space} />
      {saving && saving.areaId === space.areaId ? <SavingMark range={range} saving={saving} /> : null}
    </div>
  );
}

/**
 * La cabecera de una columna, en dos líneas (forma decidida por el usuario, 15-11-2026; sin sigla): el nombre del área en
 * negrita, sin la palabra «Laboratorio» (entero en el título y para el lector de pantalla), y el aforo con su ícono a la
 * derecha; debajo, la disponibilidad de ese día en mono, en verde si abre, cada tramo en su línea («07:00–13:00» y,
 * debajo, «14:00–19:00»), o «Cerrada» apagado si su horario no abre o hay un cierre o feriado, con «Sin horario» en ámbar a
 * la derecha si el área no abre ningún día.
 */
function ColumnHeader({ space, date, closures }: { space: Space; date: string; closures: readonly Closure[] }) {
  const open = closedAllDay(space, date, closures) === null;
  const hours = open ? dayHoursText(space, date) : 'Cerrada';
  const lines = open ? daySlots(space, date) : ['Cerrada'];
  const idle = withoutHours(space);
  return (
    <div
      title={`${space.areaName}${space.groupName ? `, ${space.groupName}` : ''}, aforo ${space.capacity}, ${hours}${idle ? ', sin horario' : ''}`}
      className="sticky top-0 z-20 grid h-(--head) content-center gap-0.5 border-b border-l border-line bg-surface px-3"
    >
      <p className="flex items-center justify-between gap-2 leading-[18px]">
        <span className="min-w-0 truncate text-[13px] font-semibold text-ink">
          <span aria-hidden>{areaLabel(space.areaName)}</span>
          <span className="sr-only">{space.areaName}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-medium tabular-nums text-ink-muted">
          <Users aria-hidden className="size-3.5" />
          <span className="sr-only">Aforo </span>
          {space.capacity}
        </span>
      </p>
      <div className="flex items-start justify-between gap-2 leading-4">
        <p className={cn('grid min-w-0 font-mono text-[11px] tabular-nums', open ? 'font-semibold text-success' : 'text-ink-muted')}>
          {lines.map((line) => (
            <span key={line} className="truncate">
              {line}
            </span>
          ))}
        </p>
        {idle ? <span className="shrink-0 text-[11px] font-medium text-warning">Sin horario</span> : null}
      </div>
    </div>
  );
}

/**
 * La tabla del día, como la planilla que ya se usa (ADR 0023; decisión del usuario, 24-10-2026): ocupa el alto que deja
 * la pantalla y todo el ancho. Una columna por cada área con horario, de ancho igual (mínimo 7,5 rem; si no caben, se
 * desplaza en horizontal con las horas fijas), con su cabecera de dos líneas (`ColumnHeader`); las áreas del Núcleo
 * sin espacio no ocupan columna (su aviso va en el encabezado de la pantalla). Las filas son de media hora, de 07:00 a
 * 19:00, y solo las horas en punto llevan línea fina, con su rótulo en mono debajo de ella (las que no son en punto de
 * los bloques, en pequeño a su altura); llenan el alto disponible y,
 * si no caben a 20 px, se desplaza la tabla. Lo cerrado va en un tono apagado con trama; si cierra todo el día, con su
 * motivo en el centro. Si se mira hoy, una línea fina marca «ahora» con la hora en una pastilla. Quien programa (`canSchedule`) lleva bloques y las solicitudes por programar
 * a un área y una hora arrastrando, y soltar guarda directamente; las columnas son los destinos.
 */
export function ScheduleTable({
  spaces,
  date,
  today,
  timeZone,
  range,
  dayItems,
  closures,
  opening,
  canSchedule,
  saving,
}: {
  spaces: readonly Space[];
  date: string;
  /** Hoy en la zona del espacio de trabajo y esa zona: con ellas, si se mira hoy, se dibuja la línea de «ahora». */
  today: string;
  timeZone: string;
  range: DayRange;
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  opening: BlockOpening;
  /** El Administrador lleva bloques a otra área u hora arrastrándolos; para los demás, la tabla es de lectura. */
  canSchedule: boolean;
  /** Lo que se soltó y el servidor aún no confirmó; su destino se marca «Guardando». */
  saving: SavingDrop | null;
}) {
  const clock = useNow(60_000);
  const minutes = nowMinutes(clock, timeZone);
  const now = date === today && minutes >= range.start && minutes < range.end ? minutes : null;
  const rows = (range.end - range.start) / ROW_MINUTES;
  const style = {
    '--row': ROW_HEIGHT,
    '--rows': rows,
    '--head': headHeight(Math.max(1, ...spaces.map((space) => slotLines(space, date, closures)))),
    width: '100%',
    minWidth: `calc(${HOURS_WIDTH} + ${spaces.length} * ${COLUMN_MIN})`,
    gridTemplateColumns: `${HOURS_WIDTH} repeat(${spaces.length}, minmax(${COLUMN_MIN}, 1fr))`,
  } as CSSProperties;
  return (
    <div className={cn(softCard, 'min-h-0 flex-1 overflow-auto overscroll-contain [container-type:size]')}>
      <div className="grid" style={style}>
        <div aria-hidden className="sticky left-0 top-0 z-30 flex h-(--head) items-end justify-center border-b border-line bg-surface pb-2.5 font-mono text-[11px] leading-4 text-ink-muted">
          Hora
        </div>
        {spaces.map((space) => (
          <ColumnHeader key={space.areaId} space={space} date={date} closures={closures} />
        ))}
        <div aria-hidden className="sticky left-0 z-20 bg-surface" style={{ height: columnHeight(range) }}>
          <div className="relative size-full">
            <HourLines range={range} />
            <RequestedBand range={range} />
            <OffHourMarks range={range} marks={offHourMarks(dayItems, range)} />
            {hourMarks(range).map((mark) => (
              <span key={mark} className="absolute inset-x-0 mt-2 text-center font-mono text-[11px] leading-none tabular-nums text-ink-muted" style={{ top: topOf(mark, range) }}>
                {timeText(mark)}
              </span>
            ))}
            {now === null ? null : (
              <>
                <span className="absolute inset-x-0 z-10 mx-auto w-fit -translate-y-1/2 rounded-[5px] bg-ink px-1.5 py-px font-mono text-[11px] font-semibold leading-4 tabular-nums text-surface" style={{ top: topOf(now, range) }}>
                  {timeText(now)}
                </span>
                <span className="absolute right-0 z-10 h-2.5 w-px -translate-y-1/2 bg-ink" style={{ top: topOf(now, range) }} />
              </>
            )}
          </div>
        </div>
        {spaces.map((space) => (
          <AreaColumn key={space.areaId} space={space} date={date} range={range} now={now} dayItems={dayItems} closures={closures} opening={opening} canSchedule={canSchedule} saving={saving} />
        ))}
      </div>
    </div>
  );
}
