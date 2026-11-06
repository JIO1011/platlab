import { useDroppable } from '@dnd-kit/core';
import type { Activity, Closure, Space } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { CircleCheck, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { CSSProperties } from 'react';
import { countText } from '../../app/format';
import { useNow } from '../../app/use-now';
import { ScheduleBlock, type BlockOpening } from './schedule-block';
import { DraggableBlock, useDragPreview, type ColumnData, type SavingDrop } from './schedule-dnd';
import { ROW_MINUTES, activitiesOfArea, blockSpan, closedSpans, hourMarks, nowMinutes, placement, rowStarts, shadedHours, timeText, type DayRange } from './schedule-grid';
import { blockingTexts, capacityText } from './schedule-placement';
import { softCard } from './style';

/**
 * El alto de una fila (media hora): reparte el alto de la tabla entre sus filas para que 07:00–19:00 se vea completo sin
 * desplazar, sin bajar de 20 px; solo si ni así caben, la tabla se desplaza por dentro, no la página. `100cqh` es el alto
 * de la tabla (su contenedor) y `--head`, la cabecera de áreas. Los bloques se colocan en porcentaje, así que siguen a la fila.
 */
const ROW_HEIGHT = 'max(20px, calc((100cqh - var(--head)) / var(--rows)))';

/** El alto de la cabecera de las columnas. */
const HEAD_HEIGHT = '3.5rem';

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

/** La línea que abre cada fila: marcada en las horas enteras y muy tenue en las medias. */
const rowLine = (mark: number) => (mark % 60 === 0 ? 'border-line-strong' : 'border-line/50');

/** La trama diagonal suave de lo cerrado. */
const hatch = 'repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in oklab, var(--color-ink) 8%, transparent) 6px 7px)';

/** Las bandas suaves de una hora de cada dos, para seguir la fila con la vista; van detrás de todo, también en la columna de horas. */
function Bands({ range }: { range: DayRange }) {
  return (
    <>
      {shadedHours(range).map((span) => (
        <span key={span.from} aria-hidden className="absolute inset-x-0 bg-ink/[0.035]" style={at(span, range)} />
      ))}
    </>
  );
}

/** Las líneas de cada fila de la columna, sobre las bandas y detrás de todo lo demás. */
function RowLines({ range }: { range: DayRange }) {
  return (
    <>
      {rowStarts(range).slice(1).map((mark) => (
        <span key={mark} aria-hidden className={cn('absolute inset-x-0 border-t', rowLine(mark))} style={{ top: `${placement({ from: mark, to: mark }, range).top}%` }} />
      ))}
    </>
  );
}

/** La línea de «ahora» de una columna, cuando se mira hoy. */
function NowLine({ now, range }: { now: number | null; range: DayRange }) {
  if (now === null) return null;
  return <span aria-hidden className="pointer-events-none absolute inset-x-0 z-10 -mt-px border-t-2 border-ink" style={{ top: `${placement({ from: now, to: now }, range).top}%` }} />;
}

/**
 * Dónde caería lo que se arrastra en esta columna, dicho con texto y con ícono: «círculo con visto» si cabe, «círculo con
 * cruz» y el motivo si no, y «triángulo de alerta» si supera el aforo (solo avisa). El lugar encaja a 15 min.
 */
function DropPreview({ range, space }: { range: DayRange; space: Space }) {
  const drag = useDragPreview();
  const preview = drag?.preview;
  if (!preview || preview.areaId !== space.areaId) return null;
  const blocked = preview.check.blocking.length > 0;
  const capacity = capacityText(preview.check, preview.participants, preview.capacity);
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
 * Una columna de un área: las franjas cerradas con trama diagonal (el motivo, una sola vez en la primera franja de una
 * hora o más, y en el título y el nombre accesible de cada una) y los bloques encima; destino de lo que se arrastra.
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
    <div ref={setNodeRef} role="group" aria-label={`Bloques de ${space.areaName}`} className="relative border-l border-line-strong" style={{ height: columnHeight(range) }}>
      <Bands range={range} />
      <RowLines range={range} />
      {closedSpans(space, date, range, closures).map((span) => (
        <div key={`${span.from}-${span.to}`} role="img" aria-label={span.reason} title={span.reason} className="absolute inset-x-0 overflow-hidden bg-surface-sunken/60" style={{ ...at(span, range), backgroundImage: hatch }}>
          {span.labeled ? <span className="mx-1.5 mt-1 inline-block max-w-[calc(100%-0.75rem)] truncate rounded-[4px] bg-surface-sunken px-1.5 text-[11px] font-medium leading-4 text-ink-muted">{span.reason}</span> : null}
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

/** La cabecera de una columna: la sigla en negrita, debajo el nombre del área (cortado con elipsis; entero en el título) y el aforo como chip. */
function ColumnHeader({ space }: { space: Space }) {
  return (
    <div title={`${space.areaName}${space.groupName ? `, ${space.groupName}` : ''}, aforo ${space.capacity}`} className="sticky top-0 z-20 grid h-(--head) content-center justify-items-center border-b border-l border-line-strong bg-surface px-2 text-center">
      <p className="text-base font-bold leading-[18px] tracking-tight text-ink">{space.abbreviation}</p>
      <p className="w-full truncate text-[11px] leading-4 text-ink-muted">{space.areaName}</p>
      <p className="rounded-full bg-surface-sunken px-2 text-[11px] font-medium leading-4 tabular-nums text-ink-muted">{countText(space.capacity, 'persona', 'personas')}</p>
    </div>
  );
}

/**
 * La tabla del día, como la planilla que ya se usa (ADR 0023; decisión del usuario, 24-10-2026): ocupa el alto que deja
 * la pantalla y todo el ancho. Una columna por cada área con horario, de ancho igual (mínimo 7,5 rem; si no caben, se
 * desplaza en horizontal con las horas fijas), con la sigla en negrita, el nombre del área y el aforo en un chip; las
 * áreas sin horario no ocupan columna (su aviso va en el encabezado de la pantalla). Las filas son de media hora, de
 * 07:00 a 19:00: la hora en punto, rotulada a la izquierda y alineada con su línea (marcada; la de la media hora, muy
 * tenue), con una banda suave una hora de cada dos; llenan el alto disponible y, si no caben a 20 px, se desplaza la tabla.
 * Lo cerrado del horario semanal, los cierres y los feriados llevan trama diagonal con su motivo una sola vez. Si se mira
 * hoy, una línea marca «ahora» con la hora. Quien programa (`canSchedule`) lleva bloques y las solicitudes por programar
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
    '--head': HEAD_HEIGHT,
    width: '100%',
    minWidth: `calc(${HOURS_WIDTH} + ${spaces.length} * ${COLUMN_MIN})`,
    gridTemplateColumns: `${HOURS_WIDTH} repeat(${spaces.length}, minmax(${COLUMN_MIN}, 1fr))`,
  } as CSSProperties;
  return (
    <div className={cn(softCard, 'min-h-0 flex-1 overflow-auto overscroll-contain [container-type:size]')}>
      <div className="grid" style={style}>
        <div aria-hidden className="sticky left-0 top-0 z-30 h-(--head) border-b border-line-strong bg-surface" />
        {spaces.map((space) => (
          <ColumnHeader key={space.areaId} space={space} />
        ))}
        <div aria-hidden className="sticky left-0 z-20 bg-surface" style={{ height: columnHeight(range) }}>
          <div className="relative size-full">
            <Bands range={range} />
            {hourMarks(range).map((mark, index) => (
              <span
                key={mark}
                className={cn('absolute right-2 text-[11px] font-medium leading-none tabular-nums text-ink-muted', index === 0 ? 'mt-1' : '-translate-y-1/2')}
                style={{ top: `${placement({ from: mark, to: mark }, range).top}%` }}
              >
                {timeText(mark)}
              </span>
            ))}
            {now === null ? null : (
              <span className="absolute right-1 z-10 -translate-y-1/2 rounded-[4px] bg-ink px-1 text-[11px] font-semibold leading-4 tabular-nums text-surface" style={{ top: `${placement({ from: now, to: now }, range).top}%` }}>
                {timeText(now)}
              </span>
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
