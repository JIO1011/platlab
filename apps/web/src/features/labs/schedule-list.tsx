import type { Activity, Closure, Space } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { useId } from 'react';
import { CodeTag } from '../../app/code-tag';
import { BlockBody, BlockTarget, type BlockOpening } from './schedule-block';
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
            <li key={activity.id}>
              <BlockTarget
                activity={activity}
                opening={opening}
                className={cn(
                  'block min-h-11 w-full rounded-control border border-action/25 border-l-4 border-l-action bg-action-soft px-3 py-2.5 text-left transition-colors',
                  'hover:border-action/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
                )}
              >
                <BlockBody activity={activity} space={space} />
              </BlockTarget>
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
 * horario y sus bloques por hora. Lo mismo que dice la tabla, en el mismo orden.
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
