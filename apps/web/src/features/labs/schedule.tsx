import type { Activity, Closure, Space } from '@platlab/contracts';
import { Skeleton, StatePanel } from '@platlab/ui';
import { CalendarOff, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { todayInZone } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useMediaQuery } from '../../app/use-media-query';
import { useLabs } from './context';
import { useClosures, usePeriods, useRequests, useSchedule, useSpaces } from './queries';
import { ActivitySheet } from './schedule-block-sheet';
import type { BlockOpening } from './schedule-block';
import { ScheduleDayBar } from './schedule-day-bar';
import { activitiesOn, areasOfDay, dayRange, holidayOn, loadByDay, parseDay, periodOn, weekDates } from './schedule-grid';
import { ScheduleList } from './schedule-list';
import { ScheduleTable } from './schedule-table';

/** La tabla de horas desde 1024 px; por debajo, una lista por área (ADR 0023). */
const wideQuery = '(min-width: 1024px)';

/** El día en la tabla o en la lista, o por qué no hay nada que mostrar: ninguna área habilitada o ninguna que abra ese día. */
function DayBoard({
  date,
  areas,
  dayItems,
  closures,
  holiday,
  opening,
}: {
  date: string;
  areas: readonly Space[];
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  holiday: Closure | null;
  opening: BlockOpening;
}) {
  const wide = useMediaQuery(wideQuery);
  const range = dayRange(areas, dayItems, date);
  if (areas.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel icon={MapPin} title="Aún no hay áreas habilitadas" description="Cuando el Administrador habilite un área con su aforo y horario, el cronograma la mostrará aquí." />
      </div>
    );
  }
  if (!range) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel icon={CalendarOff} title="Sin atención este día" description={holiday ? `Feriado: ${holiday.reason}.` : 'Ninguna área abre este día según su horario semanal.'} />
      </div>
    );
  }
  return wide ? (
    <ScheduleTable areas={areas} date={date} range={range} dayItems={dayItems} closures={closures} opening={opening} />
  ) : (
    <ScheduleList areas={areas} date={date} dayItems={dayItems} closures={closures} opening={opening} />
  );
}

/**
 * Cronograma (ADR 0023, L-01c): la tabla de horas por áreas de un día, de solo lectura. La ven todos los que consultan
 * Laboratorios; el día vive en la URL (`?dia=`), con «Hoy» por omisión. Un clic en un bloque abre su solicitud para
 * quien puede verla (el Administrador y el Operador, en Recibidas; el Docente, la suya) o un panel de solo lectura.
 * La bandeja «Por programar» y programar o mover un bloque (`labs.schedule.manage`) se suman junto a `DayBoard`.
 */
export function LabsSchedulePage() {
  const { workspaceId, me } = useLabs();
  const today = todayInZone(me.workspace.timeZone);
  const [params, setParams] = useSearchParams();
  const date = parseDay(params.get('dia')) ?? today;
  const week = weekDates(date);
  const from = week[0]!;
  const to = week[6]!;

  const schedule = useSchedule(workspaceId, from, to);
  const spaces = useSpaces(workspaceId);
  const closures = useClosures(workspaceId, from, to);
  const periods = usePeriods(workspaceId);
  const queries = [schedule, spaces, closures, periods];
  const failed = queries.find((query) => query.isError);

  const canReceive = me.permissions.includes('labs.request.view');
  const mine = useRequests(workspaceId, 'mine', !canReceive && me.permissions.includes('labs.request.create'));
  const base = `/e/${workspaceId}/laboratorios`;
  const mineIds = new Set(mine.data?.items.map((request) => request.id));
  const [sheet, setSheet] = useState<{ activity: Activity; open: boolean } | null>(null);
  const opening: BlockOpening = {
    linkOf: (activity) => (canReceive ? `${base}/recibidas/${activity.requestId}` : mineIds.has(activity.requestId) ? `${base}/solicitudes/${activity.requestId}` : null),
    onInspect: (activity) => setSheet({ activity, open: true }),
  };

  const dayItems = schedule.data ? activitiesOn(schedule.data.items, date) : [];
  const areas = spaces.data ? areasOfDay(spaces.data.items, dayItems) : [];
  const dayClosures = closures.data?.items ?? [];

  return (
    <>
      <SectionHeader title="Cronograma" updatedAt={Math.min(...queries.map((query) => query.dataUpdatedAt))} />
      <div className="mt-6 grid gap-5 sm:gap-6">
        <ScheduleDayBar
          date={date}
          today={today}
          load={schedule.data ? loadByDay(schedule.data.items, week) : null}
          period={periods.data ? periodOn(periods.data.items, date) : undefined}
          holiday={closures.data ? holidayOn(dayClosures, date) : null}
          onPick={(day) => setParams(day === today ? {} : { dia: day }, { replace: true })}
        />
        {failed ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={failed.error} onRetry={() => queries.forEach((query) => void query.refetch())} />
          </div>
        ) : queries.some((query) => query.isPending) ? (
          <div role="status" aria-busy="true" aria-label="Cargando">
            <Skeleton className="h-96 rounded-card" />
          </div>
        ) : (
          <DayBoard date={date} areas={areas} dayItems={dayItems} closures={dayClosures} holiday={holidayOn(dayClosures, date)} opening={opening} />
        )}
      </div>
      {sheet ? (
        <ActivitySheet
          key={sheet.activity.id}
          activity={sheet.activity}
          space={spaces.data?.items.find((space) => space.areaId === sheet.activity.areaId)}
          open={sheet.open}
          onOpenChange={(open) => setSheet({ ...sheet, open })}
        />
      ) : null}
    </>
  );
}
