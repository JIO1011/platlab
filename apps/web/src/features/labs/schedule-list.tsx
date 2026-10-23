import type { Activity, Closure, Space } from '@platlab/contracts';
import { useId } from 'react';
import { Link } from 'react-router';
import { CodeTag } from '../../app/code-tag';
import { ScheduleBlock, type BlockOpening } from './schedule-block';
import { activitiesOfArea, closedAllDay, openSlots, timeText, type BoardColumn } from './schedule-grid';

/** Un área del día: su nombre, aforo y horario, lo que la cierra si es el caso, y sus bloques por hora. */
function AreaCard({ space, date, dayItems, closures, opening }: { space: Space; date: string; dayItems: readonly Activity[]; closures: readonly Closure[]; opening: BlockOpening }) {
  const id = useId();
  const blocks = activitiesOfArea(dayItems, space.areaId);
  const closed = closedAllDay(space, date, closures);
  const hours = openSlots(space, date)
    .map((slot) => `${timeText(slot.from)}–${timeText(slot.to)}`)
    .join(' · ');
  return (
    <section aria-labelledby={id} className="rounded-card bg-surface p-4 shadow-raised">
      <h3 id={id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-bold text-ink">
        <span className="[overflow-wrap:anywhere]">{space.areaName}</span>
        <CodeTag>{space.abbreviation}</CodeTag>
      </h3>
      <p className="mt-0.5 text-[13px] text-ink-muted">
        {space.groupName ? `${space.groupName} · ` : ''}
        <span className="tabular-nums">
          Aforo {space.capacity}
          {closed ? '' : ` · ${hours}`}
        </span>
      </p>
      {closed ? <p className="mt-3 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">{closed}</p> : null}
      {blocks.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {blocks.map((activity) => (
            <li key={activity.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-stretch gap-2">
              <span aria-hidden className="pt-3 text-right text-[13px] font-medium tabular-nums text-ink">
                {activity.startsAt}
                <span className="block text-xs font-normal text-ink-muted">{activity.endsAt}</span>
              </span>
              <ScheduleBlock activity={activity} space={space} opening={opening} size="list" />
            </li>
          ))}
        </ul>
      ) : closed ? null : (
        <p className="mt-3 text-sm text-ink-muted">Sin bloques este día</p>
      )}
    </section>
  );
}

/** Un área del Núcleo sin horario: una línea atenuada, con «Habilitar» para quien administra espacios. */
function IdleRow({ column, enableHref }: { column: BoardColumn; enableHref: string | undefined }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-card bg-surface-sunken/60 px-4 py-2 text-sm text-ink-muted">
      <p className="[overflow-wrap:anywhere]">
        <span className="font-medium">{column.areaName}</span> · Sin horario
      </p>
      {enableHref ? (
        <Link to={enableHref} className="inline-flex h-11 items-center rounded-control px-2 font-semibold text-action hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action">
          Habilitar<span className="sr-only"> {column.areaName}</span>
        </Link>
      ) : null}
    </div>
  );
}

/**
 * El día como una lista por área, para pantallas estrechas (ADR 0023): sin tabla horizontal, cada área con su aforo y
 * horario y sus bloques por hora, con la hora a la izquierda como en la tabla y el mismo «Materia - Carrera - Docente»;
 * las áreas del Núcleo sin horario, al final y atenuadas.
 */
export function ScheduleList({
  columns,
  date,
  dayItems,
  closures,
  opening,
  enableHref,
}: {
  columns: readonly BoardColumn[];
  date: string;
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  opening: BlockOpening;
  enableHref: ((areaId: string) => string) | undefined;
}) {
  return (
    <div className="grid gap-4">
      {columns.map((column) =>
        column.space ? (
          <AreaCard key={column.areaId} space={column.space} date={date} dayItems={dayItems} closures={closures} opening={opening} />
        ) : (
          <IdleRow key={column.areaId} column={column} enableHref={enableHref?.(column.areaId)} />
        ),
      )}
    </div>
  );
}
