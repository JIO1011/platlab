import { useDroppable } from '@dnd-kit/core';
import type { Activity, Closure, Space } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { ScheduleBlock, type BlockOpening } from './schedule-block';
import { DraggableBlock, useDragPreview, type ColumnData } from './schedule-dnd';
import { ROW_MINUTES, activitiesOfArea, blockSpan, closedSpans, placement, rowStarts, timeText, type BoardColumn, type DayRange } from './schedule-grid';
import { blockingTexts, capacityText } from './schedule-placement';

/**
 * El alto de una fila (media hora): reparte el alto de la tabla entre sus filas, sin bajar de 1.75 rem (28 px); si no
 * caben, la tabla se desplaza por dentro, no la página. `100cqh` es el alto de la tabla (su contenedor) y 3.5 rem, la
 * cabecera de áreas. Los bloques se colocan en porcentaje, así que siguen a la fila.
 */
const ROW_HEIGHT = 'max(1.75rem, calc((100cqh - 3.5rem) / var(--rows)))';

/** El ancho mínimo de una columna de área y el de la columna de horas. */
const COLUMN_MIN = '7rem';
const HOURS_WIDTH = '3.5rem';

/** El alto de la columna del día: una fila por cada media hora del rango. */
const columnHeight = (range: DayRange) => `calc(var(--row) * ${(range.end - range.start) / ROW_MINUTES})`;

/** El estilo de una posición en la columna, en porcentaje del rango del día. */
const at = (span: { from: number; to: number }, range: DayRange) => {
  const { top, height } = placement(span, range);
  return { top: `${top}%`, height: `${height}%` };
};

/** La línea que abre cada fila: marcada en las horas enteras y apenas visible en las medias. */
const rowLine = (mark: number) => (mark % 60 === 0 ? 'border-line-strong' : 'border-line/50');

/** La trama suave de una columna sin horario. */
const hatch = 'repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in oklab, var(--color-ink) 6%, transparent) 7px 8px)';

/** Las líneas de cada fila de la columna, detrás de todo. */
function RowLines({ range }: { range: DayRange }) {
  return (
    <>
      {rowStarts(range).slice(1).map((mark) => (
        <span key={mark} aria-hidden className={cn('absolute inset-x-0 border-t', rowLine(mark))} style={{ top: `${placement({ from: mark, to: mark }, range).top}%` }} />
      ))}
    </>
  );
}

/**
 * Dónde caería lo que se arrastra en esta columna, dicho con texto y con signo: ✔ si cabe, ✖ con el motivo si no, y ⚠
 * si supera el aforo (solo avisa). El lugar encaja a 15 min.
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
      <p className="font-semibold">
        {blocked ? '✖ ' : '✔ '}
        <span className="tabular-nums">
          {timeText(preview.start)}–{timeText(preview.end)}
        </span>
      </p>
      <p>{blocked ? blockingTexts(preview.check).join(' · ') : 'Libre'}</p>
      {!blocked && capacity ? <p className="font-medium text-warning">⚠ {capacity}</p> : null}
    </div>
  );
}

/** Una columna de un área habilitada: las franjas cerradas atenuadas con su motivo y los bloques encima; destino de lo que se arrastra. */
function AreaColumn({
  space,
  date,
  range,
  dayItems,
  closures,
  opening,
  canSchedule,
}: {
  space: Space;
  date: string;
  range: DayRange;
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  opening: BlockOpening;
  canSchedule: boolean;
}) {
  const data: ColumnData = { range };
  const { setNodeRef } = useDroppable({ id: space.areaId, data, disabled: !canSchedule });
  return (
    <div ref={setNodeRef} role="group" aria-label={`Bloques de ${space.areaName}`} className="relative border-l border-line-strong" style={{ height: columnHeight(range) }}>
      <RowLines range={range} />
      {closedSpans(space, date, range, closures).map((span) => (
        <p key={`${span.from}-${span.to}`} className="absolute inset-x-0 overflow-hidden bg-surface-sunken px-1.5 py-1 text-center text-[11px] leading-tight text-ink-muted" style={at(span, range)}>
          {span.reason}
        </p>
      ))}
      {activitiesOfArea(dayItems, space.areaId).map((activity) => (
        <DraggableBlock key={activity.id} activity={activity} enabled={canSchedule} style={at(blockSpan(activity), range)}>
          <ScheduleBlock activity={activity} space={space} opening={opening} size="table" />
        </DraggableBlock>
      ))}
      <DropPreview range={range} space={space} />
    </div>
  );
}

/** Una columna de un área del Núcleo sin horario: atenuada con trama suave; quien administra espacios la habilita desde Áreas. */
function IdleColumn({ column, range, enableHref }: { column: BoardColumn; range: DayRange; enableHref: string | undefined }) {
  return (
    <div role="group" aria-label={`${column.areaName}: sin horario`} className="relative border-l border-line-strong bg-surface-sunken/40" style={{ height: columnHeight(range), backgroundImage: hatch }}>
      <div className="sticky top-14 grid justify-items-center gap-1 px-2 pt-4 text-center">
        <p className="text-xs font-medium text-ink-muted">Sin horario</p>
        {enableHref ? (
          <Link
            to={enableHref}
            className="inline-flex h-8 items-center rounded-control px-2.5 text-xs font-semibold text-action transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action"
          >
            Habilitar<span className="sr-only"> {column.areaName}</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** La cabecera de una columna: la sigla grande, el nombre corto y el aforo; la de un área sin horario, solo su nombre, atenuado. */
function ColumnHeader({ column }: { column: BoardColumn }) {
  const { space } = column;
  if (!space) {
    return (
      <div title={column.areaName} className="sticky top-0 z-20 grid h-14 content-center border-b border-l border-line-strong bg-surface-sunken px-1.5 text-center">
        <p className="line-clamp-2 text-xs font-medium leading-4 text-ink-muted [overflow-wrap:anywhere]">{column.areaName}</p>
      </div>
    );
  }
  return (
    <div title={`${space.areaName}${space.groupName ? `, ${space.groupName}` : ''}, aforo ${space.capacity}`} className="sticky top-0 z-20 grid h-14 content-center border-b border-l border-line-strong bg-action-soft px-1.5 text-center">
      <p className="truncate text-base font-bold leading-5 text-action-deep">
        {space.abbreviation}
        <span className="sr-only">: {space.areaName}</span>
      </p>
      <p aria-hidden className="truncate text-[11px] leading-4 text-ink-muted">
        {space.areaName}
      </p>
      <p className="text-[11px] leading-4 tabular-nums text-ink-muted">Aforo {space.capacity}</p>
    </div>
  );
}

/**
 * La tabla del día, como la planilla que ya se usa (ADR 0023; decisión del usuario, 24-10-2026): ocupa el alto que deja
 * la pantalla y todo el ancho. Una columna por cada área del Núcleo, de ancho igual (mínimo 7 rem; si no caben, se
 * desplaza en horizontal con las horas fijas): las habilitadas con la sigla grande, el nombre corto y el aforo, y las que
 * aún no tienen horario atenuadas con trama y «Sin horario» (con «Habilitar» para quien administra espacios). Las filas
 * son de media hora, de 07:00 a 19:00, con la hora solo en las horas en punto; si no caben a 28 px, se desplaza la tabla.
 * Lo cerrado del horario semanal, los cierres y los feriados se ven atenuados con su motivo. Quien programa
 * (`canSchedule`) lleva bloques y las solicitudes por programar a un área y una hora arrastrando; las columnas son los destinos.
 */
export function ScheduleTable({
  columns,
  date,
  range,
  dayItems,
  closures,
  opening,
  canSchedule,
  enableHref,
}: {
  columns: readonly BoardColumn[];
  date: string;
  range: DayRange;
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  opening: BlockOpening;
  /** El Administrador lleva bloques a otra área u hora arrastrándolos; para los demás, la tabla es de lectura. */
  canSchedule: boolean;
  /** Dónde se habilita un área sin horario; indefinido si la persona no administra espacios. */
  enableHref?: ((areaId: string) => string) | undefined;
}) {
  const rows = (range.end - range.start) / ROW_MINUTES;
  const style = {
    '--row': ROW_HEIGHT,
    '--rows': rows,
    width: '100%',
    minWidth: `calc(${HOURS_WIDTH} + ${columns.length} * ${COLUMN_MIN})`,
    gridTemplateColumns: `${HOURS_WIDTH} repeat(${columns.length}, minmax(${COLUMN_MIN}, 1fr))`,
  } as CSSProperties;
  return (
    <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-card bg-surface shadow-raised [container-type:size]">
      <div className="grid" style={style}>
        <div aria-hidden className="sticky left-0 top-0 z-30 h-14 border-b border-line-strong bg-surface-sunken" />
        {columns.map((column) => (
          <ColumnHeader key={column.areaId} column={column} />
        ))}
        <div aria-hidden className="sticky left-0 z-20 bg-surface" style={{ height: columnHeight(range) }}>
          {rowStarts(range).map((mark, index) => (
            <div key={mark} className={cn('h-(--row) px-2 pt-1 text-right text-[11px] leading-none tabular-nums', index > 0 && 'border-t', rowLine(mark), mark % 60 === 0 && 'font-semibold text-ink')}>
              {mark % 60 === 0 ? timeText(mark) : null}
            </div>
          ))}
        </div>
        {columns.map((column) =>
          column.space ? (
            <AreaColumn key={column.areaId} space={column.space} date={date} range={range} dayItems={dayItems} closures={closures} opening={opening} canSchedule={canSchedule} />
          ) : (
            <IdleColumn key={column.areaId} column={column} range={range} enableHref={enableHref?.(column.areaId)} />
          ),
        )}
      </div>
    </div>
  );
}
