import { useDroppable } from '@dnd-kit/core';
import type { Activity, Closure, Space } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { CodeTag } from '../../app/code-tag';
import { BlockBody, BlockTarget, type BlockOpening } from './schedule-block';
import { DraggableBlock, useDragPreview, type ColumnData } from './schedule-dnd';
import { activitiesOfArea, blockSpan, closedSpans, hourMarks, placement, timeText, type DayRange } from './schedule-grid';
import { blockingTexts, capacityText } from './schedule-placement';

/** Alto de una hora en la tabla: con 72 px, media hora (36 px) aún lleva la actividad y la hora. */
const HOUR_PX = 72;

/** El alto de la columna del día: una hora por `HOUR_PX`. */
const columnHeight = (range: DayRange) => `${(HOUR_PX * (range.end - range.start)) / 60}px`;

/** El estilo de una posición en la columna, en porcentaje del rango del día. */
const at = (span: { from: number; to: number }, range: DayRange) => {
  const { top, height } = placement(span, range);
  return { top: `${top}%`, height: `${height}%` };
};

/** Las líneas de cada hora de la columna, detrás de todo. */
function HourLines({ range }: { range: DayRange }) {
  return (
    <>
      {hourMarks(range).slice(0, -1).map((mark) => (
        <span key={mark} aria-hidden className="absolute inset-x-0 border-t border-line" style={{ top: `${placement({ from: mark, to: mark }, range).top}%` }} />
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
        'pointer-events-none absolute inset-x-1 z-10 overflow-hidden rounded-[10px] border-2 border-dashed px-2.5 py-1.5 text-[13px] leading-snug',
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
    <div ref={setNodeRef} role="group" aria-label={`Bloques de ${space.areaName}`} className="relative border-l border-line" style={{ height: columnHeight(range) }}>
      <HourLines range={range} />
      {closedSpans(space, date, range, closures).map((span) => (
        <p key={`${span.from}-${span.to}`} className="absolute inset-x-0 overflow-hidden bg-surface-sunken px-2 py-1.5 text-[13px] leading-snug text-ink-muted" style={at(span, range)}>
          {span.reason}
        </p>
      ))}
      {activitiesOfArea(dayItems, space.areaId).map((activity) => (
        <DraggableBlock key={activity.id} activity={activity} enabled={canSchedule} style={at(blockSpan(activity), range)}>
          <BlockTarget
            activity={activity}
            opening={opening}
            className={cn(
              'block size-full overflow-hidden rounded-[10px] border border-action/25 border-l-4 border-l-action bg-action-soft px-2.5 py-1.5 text-left transition-colors',
              'hover:border-action/50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
            )}
          >
            <BlockBody activity={activity} space={space} />
          </BlockTarget>
        </DraggableBlock>
      ))}
      <DropPreview range={range} space={space} />
    </div>
  );
}

/**
 * La tabla de horas del día (ADR 0023): una columna por área habilitada, con su sigla y aforo, y las
 * horas del rango abierto en el eje. Lo cerrado del horario semanal, los cierres y los feriados se ven atenuados con su
 * motivo. Cada bloque dice «Actividad · Solicitante · Grupo», su hora, código y responsable, y se abre con clic o teclado.
 * Con muchas áreas, la tabla se desplaza en horizontal y el eje de horas queda a la vista. Quien programa (`canSchedule`)
 * lleva bloques y fechas de la bandeja a un área y una hora arrastrando; las columnas son los destinos.
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
  const marks = hourMarks(range);
  return (
    <div className="overflow-x-auto rounded-card bg-surface shadow-raised">
      <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${areas.length}, minmax(12rem, 1fr))` }}>
        <div className="sticky left-0 z-20 border-b border-line bg-surface" />
        {areas.map((space) => (
          <div key={space.areaId} className="border-b border-l border-line px-3 py-2.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
              <span className="[overflow-wrap:anywhere]">{space.areaName}</span>
              <CodeTag>{space.abbreviation}</CodeTag>
            </p>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {space.groupName ? `${space.groupName} · ` : ''}
              <span className="tabular-nums">Aforo {space.capacity}</span>
            </p>
          </div>
        ))}
        <div aria-hidden className="sticky left-0 z-20 bg-surface" style={{ height: columnHeight(range) }}>
          <div className="relative size-full">
            {marks.map((mark, index) => (
              <span
                key={mark}
                className={cn(
                  'absolute right-2 text-xs tabular-nums text-ink-muted',
                  index === 0 ? '' : index === marks.length - 1 ? '-translate-y-full' : '-translate-y-1/2',
                )}
                style={{ top: `${placement({ from: mark, to: mark }, range).top}%` }}
              >
                {timeText(mark)}
              </span>
            ))}
          </div>
        </div>
        {areas.map((space) => (
          <AreaColumn key={space.areaId} space={space} date={date} range={range} dayItems={dayItems} closures={closures} opening={opening} canSchedule={canSchedule} />
        ))}
      </div>
    </div>
  );
}
