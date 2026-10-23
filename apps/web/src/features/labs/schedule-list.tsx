import type { Activity, Closure, Space } from '@platlab/contracts';
import { useId } from 'react';
import { CodeTag } from '../../app/code-tag';
import { ScheduleBlock, type BlockOpening } from './schedule-block';
import { activitiesOfArea, closedAllDay, openSlots, timeText } from './schedule-grid';

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

/**
 * El día como una lista por área, para pantallas estrechas (ADR 0023): sin tabla horizontal, cada área con su aforo y
 * horario y sus bloques por hora, con la hora a la izquierda como en la tabla y el mismo «Materia - Carrera - Docente».
 */
export function ScheduleList({ areas, date, dayItems, closures, opening }: { areas: readonly Space[]; date: string; dayItems: readonly Activity[]; closures: readonly Closure[]; opening: BlockOpening }) {
  return (
    <div className="grid gap-4">
      {areas.map((space) => (
        <AreaCard key={space.areaId} space={space} date={date} dayItems={dayItems} closures={closures} opening={opening} />
      ))}
    </div>
  );
}
