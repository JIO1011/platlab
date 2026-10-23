import { useDroppable } from '@dnd-kit/core';
import type { Activity, Closure, Space } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import type { CSSProperties } from 'react';
import { ScheduleBlock, type BlockOpening } from './schedule-block';
import { DraggableBlock, useDragPreview, type ColumnData } from './schedule-dnd';
import { ROW_MINUTES, activitiesOfArea, blockSpan, closedSpans, placement, rowStarts, timeText, type DayRange } from './schedule-grid';
import { blockingTexts, capacityText } from './schedule-placement';

/**
 * El alto de una fila (media hora): la tabla entera cabe en la ventana, entre 24 y 36 px por fila, para verla sin
 * desplazar (1440 × 900 queda en el mínimo); los bloques se colocan en porcentaje, así que siguen a la fila.
 */
const ROW_HEIGHT = 'clamp(1.5rem, calc((100dvh - 20rem) / 24), 2.25rem)';

/** El alto de la columna del día: una fila por cada media hora del rango. */
const columnHeight = (range: DayRange) => `calc(var(--row) * ${(range.end - range.start) / ROW_MINUTES})`;

/** El estilo de una posición en la columna, en porcentaje del rango del día. */
const at = (span: { from: number; to: number }, range: DayRange) => {
  const { top, height } = placement(span, range);
  return { top: `${top}%`, height: `${height}%` };
};

/** La línea que abre cada fila: más marcada en las horas enteras que en las medias. */
const rowLine = (mark: number) => (mark % 60 === 0 ? 'border-line-strong' : 'border-line');

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

/** Una columna: las franjas cerradas atenuadas con su motivo y los bloques del área encima; destino de lo que se arrastra. */
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

/**
 * La tabla del día, como la planilla que ya se usa (ADR 0023; decisión del usuario, 24-10-2026): a todo el ancho, con
 * todas las áreas habilitadas como columnas (la sigla destacada; el nombre y el aforo, en el título accesible y el aforo
 * también en texto pequeño) y las filas fijas de 07:00 a 19:00 en medias horas, con la hora a la izquierda. Las
 * columnas se reparten el ancho (mínimo 6 rem); si no caben, la tabla se desplaza en horizontal con las horas a la vista.
 * Lo cerrado del horario semanal, los cierres y los feriados se ven atenuados con su motivo. Cada bloque dice
 * «Materia - Carrera - Docente». Quien programa (`canSchedule`) lleva bloques y las solicitudes por programar a un área y
 * una hora arrastrando; las columnas son los destinos.
 */
export function ScheduleTable({
  areas,
  date,
  range,
  dayItems,
  closures,
  opening,
  canSchedule,
}: {
  areas: readonly Space[];
  date: string;
  range: DayRange;
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  opening: BlockOpening;
  /** El Administrador lleva bloques a otra área u hora arrastrándolos; para los demás, la tabla es de lectura. */
  canSchedule: boolean;
}) {
  const style = { '--row': ROW_HEIGHT, gridTemplateColumns: `4rem repeat(${areas.length}, minmax(6rem, 1fr))` } as CSSProperties;
  return (
    <div className="overflow-x-auto rounded-card bg-surface shadow-raised">
      <div className="grid" style={style}>
        <div aria-hidden className="sticky left-0 z-20 border-b border-line-strong bg-surface-sunken" />
        {areas.map((space) => (
          <div key={space.areaId} title={`${space.areaName}${space.groupName ? `, ${space.groupName}` : ''}, aforo ${space.capacity}`} className="border-b border-l border-line-strong bg-action-soft px-1 py-1.5 text-center">
            <p className="text-base font-bold leading-tight text-action-deep [overflow-wrap:anywhere]">
              {space.abbreviation}
              <span className="sr-only">: {space.areaName}</span>
            </p>
            <p className="text-[11px] leading-tight tabular-nums text-ink-muted">Aforo {space.capacity}</p>
          </div>
        ))}
        <div aria-hidden className="sticky left-0 z-20 bg-surface" style={{ height: columnHeight(range) }}>
          {rowStarts(range).map((mark, index) => (
            <div key={mark} className={cn('flex h-(--row) items-start justify-end px-2 pt-1 text-[11px] leading-none tabular-nums', index > 0 && 'border-t', rowLine(mark), mark % 60 === 0 ? 'font-semibold text-ink' : 'text-ink-subtle')}>
              {timeText(mark)}
            </div>
          ))}
        </div>
        {areas.map((space) => (
          <AreaColumn key={space.areaId} space={space} date={date} range={range} dayItems={dayItems} closures={closures} opening={opening} canSchedule={canSchedule} />
        ))}
      </div>
    </div>
  );
}
