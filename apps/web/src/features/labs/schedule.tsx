import { scheduleCheck, type Activity, type Closure, type RequestSummary, type Space } from '@platlab/contracts';
import { Skeleton, StatePanel, toast } from '@platlab/ui';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { todayInZone } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useMediaQuery } from '../../app/use-media-query';
import { useLabs } from './context';
import { useClosures, usePeriods, useRequests, useResponsibles, useSchedule, useSpaces } from './queries';
import { ActivitySheet } from './schedule-block-sheet';
import type { BlockOpening } from './schedule-block';
import { ScheduleDayBar } from './schedule-day-bar';
import { ScheduleDnd, type DragPreview, type DragSource } from './schedule-dnd';
import { activitiesOn, areasOfDay, boardRange, holidayOn, loadByDay, parseDay, periodOn, toMinutes, weekDates } from './schedule-grid';
import { ScheduleList } from './schedule-list';
import { contextFor, endFor, pendingDates, slotAt, toScheduleOrder } from './schedule-placement';
import { PlacementSheet, type PlacementTarget } from './schedule-placement-sheet';
import { ScheduleTable } from './schedule-table';
import { ScheduleTray, type TrayActions } from './schedule-tray';

/** La tabla de horas desde 1024 px; por debajo, una lista por área (ADR 0023). */
const wideQuery = '(min-width: 1024px)';

/** El día en la tabla o en la lista, o por qué no hay nada que mostrar: ninguna área habilitada. */
function DayBoard({
  date,
  areas,
  dayItems,
  closures,
  opening,
  wide,
  canSchedule,
}: {
  date: string;
  areas: readonly Space[];
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  opening: BlockOpening;
  wide: boolean;
  canSchedule: boolean;
}) {
  if (areas.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel icon={MapPin} title="Aún no hay áreas habilitadas" description="Cuando el Administrador habilite un área con su aforo y horario, el cronograma la mostrará aquí." />
      </div>
    );
  }
  return wide ? (
    <ScheduleTable areas={areas} date={date} range={boardRange(dayItems)} dayItems={dayItems} closures={closures} opening={opening} canSchedule={canSchedule} />
  ) : (
    <ScheduleList areas={areas} date={date} dayItems={dayItems} closures={closures} opening={opening} />
  );
}

/** Lo que abre la hoja de programar o mover; `nonce` la reinicia cada vez. */
interface PlacementOpen {
  target: PlacementTarget;
  open: boolean;
  nonce: number;
}

/**
 * Cronograma (ADR 0023, L-01c; vista decidida el 24-10-2026): la tabla del día a todo el ancho, con las áreas como
 * columnas y las horas como filas, y «Por programar» debajo. La ven todos los que consultan Laboratorios; el día vive en
 * la URL (`?dia=`), con «Hoy» por omisión. Un clic en un bloque abre su solicitud llena para quien puede verla (quien
 * recibe, en Recibidas; el Docente, la suya) o, si no, su panel de solo lectura. El Administrador (`labs.schedule.manage`)
 * programa arrastrando una solicitud de «Por programar» a un área y una hora, o con «Programar…», y mueve un bloque el
 * mismo día arrastrándolo o con «Mover…»; el Operador ve «Por programar» sin acciones y el Docente, sin esa franja.
 */
export function LabsSchedulePage() {
  const { workspaceId, me, canSchedule } = useLabs();
  const today = todayInZone(me.workspace.timeZone);
  const [params, setParams] = useSearchParams();
  const date = parseDay(params.get('dia')) ?? today;
  const week = weekDates(date);
  const from = week[0]!;
  const to = week[6]!;
  const wide = useMediaQuery(wideQuery);

  const schedule = useSchedule(workspaceId, from, to);
  const spaces = useSpaces(workspaceId);
  const closures = useClosures(workspaceId, from, to);
  const periods = usePeriods(workspaceId);
  const queries = [schedule, spaces, closures, periods];
  const failed = queries.find((query) => query.isError);

  const canReceive = me.permissions.includes('labs.request.view');
  const mine = useRequests(workspaceId, 'mine', !canReceive && me.permissions.includes('labs.request.create'));
  const inbox = useRequests(workspaceId, 'inbox', canReceive);
  const responsibles = useResponsibles(workspaceId, canSchedule);
  const base = `/e/${workspaceId}/laboratorios`;
  const requestHref = (requestId: string) => `${base}/recibidas/${requestId}`;
  const mineIds = new Set(mine.data?.items.map((request) => request.id));
  const [sheet, setSheet] = useState<{ activity: Activity; open: boolean } | null>(null);
  const [placement, setPlacement] = useState<PlacementOpen | null>(null);
  const opening: BlockOpening = {
    // Quien recibe abre la solicitud en Recibidas; el Docente, la suya; el bloque ajeno abre su panel de solo lectura.
    linkOf: (activity) => (canReceive ? requestHref(activity.requestId) : mineIds.has(activity.requestId) ? `${base}/solicitudes/${activity.requestId}` : null),
    onInspect: (activity) => setSheet({ activity, open: true }),
    onMove: canSchedule ? (activity) => openPlacement({ kind: 'move', activity, areaId: activity.areaId, start: toMinutes(activity.startsAt) }) : undefined,
  };

  const dayItems = schedule.data ? activitiesOn(schedule.data.items, date) : [];
  const areas = spaces.data ? areasOfDay(spaces.data.items, dayItems) : [];
  const dayClosures = closures.data?.items ?? [];
  const goTo = (day: string) => setParams(day === today ? {} : { dia: day }, { replace: true });

  /** Qué pasaría al soltar lo que se arrastra en esa área a esa hora, con los datos ya cargados. */
  const previewOf = (source: DragSource, areaId: string, start: number): DragPreview | null => {
    const space = areas.find((item) => item.areaId === areaId);
    if (!space || !schedule.data || !closures.data || !periods.data) return null;
    const moving = source.kind === 'move';
    const day = moving ? source.activity.date : source.date;
    const participants = moving ? source.activity.participants : (source.request.participants ?? 0);
    const check = scheduleCheck(
      slotAt(day, start, source.duration),
      contextFor({ today, participants, space, periods: periods.data.items, closures: closures.data.items, activities: schedule.data.items, date: day, ignoreId: moving ? source.activity.id : undefined }),
    );
    return { areaId, start, end: endFor(start, source.duration), check, participants, capacity: space.capacity };
  };

  const openPlacement = (target: PlacementTarget) => {
    if (!responsibles.data) {
      toast.error('Aún no se cargaron los responsables', { description: 'Vuelve a intentarlo en un momento.' });
      return;
    }
    setPlacement((current) => ({ target, open: true, nonce: (current?.nonce ?? 0) + 1 }));
  };
  const dropped = (source: DragSource, preview: DragPreview) =>
    openPlacement(
      source.kind === 'move'
        ? { kind: 'move', activity: source.activity, areaId: preview.areaId, start: preview.start }
        : { kind: 'program', request: source.request, pending: pendingDates(source.request), date: source.date, areaId: preview.areaId, start: preview.start },
    );
  const programFrom = (request: RequestSummary, day: string) =>
    openPlacement({ kind: 'program', request, pending: pendingDates(request), date: day, areaId: null, start: null });

  const tray: TrayActions = {
    canSchedule,
    canDrag: wide,
    today,
    visible: date,
    requestHref,
    onPickDate: goTo,
    onSchedule: programFrom,
  };
  const enabledSpaces = (spaces.data?.items ?? []).filter((space) => space.archivedAt === null && !space.areaArchived);
  const placementSpaces = (target: PlacementTarget) =>
    target.kind === 'move' ? (spaces.data?.items ?? []).filter((space) => enabledSpaces.includes(space) || space.areaId === target.activity.areaId) : enabledSpaces;

  return (
    <>
      <SectionHeader title="Cronograma" updatedAt={Math.min(...queries.map((query) => query.dataUpdatedAt))} />
      <ScheduleDnd previewOf={previewOf} onDrop={dropped}>
        <div className="mt-4 grid gap-4">
          <ScheduleDayBar
            date={date}
            today={today}
            load={schedule.data ? loadByDay(schedule.data.items, week) : null}
            period={periods.data ? periodOn(periods.data.items, date) : undefined}
            holiday={closures.data ? holidayOn(dayClosures, date) : null}
            onPick={goTo}
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
            <DayBoard date={date} areas={areas} dayItems={dayItems} closures={dayClosures} opening={opening} wide={wide} canSchedule={canSchedule && wide} />
          )}
          {canReceive ? (
            inbox.isPending ? (
              <div role="status" aria-busy="true" aria-label="Cargando «Por programar»">
                <Skeleton className="h-40 rounded-card" />
              </div>
            ) : (
              <ScheduleTray items={toScheduleOrder(inbox.data?.items ?? [])} pendingError={inbox.isError} onRetry={() => void inbox.refetch()} actions={tray} />
            )
          ) : null}
        </div>
      </ScheduleDnd>
      {sheet ? (
        <ActivitySheet
          key={sheet.activity.id}
          activity={sheet.activity}
          space={spaces.data?.items.find((space) => space.areaId === sheet.activity.areaId)}
          open={sheet.open}
          onOpenChange={(open) => setSheet({ ...sheet, open })}
        />
      ) : null}
      {placement && responsibles.data ? (
        <PlacementSheet
          key={placement.nonce}
          workspaceId={workspaceId}
          target={placement.target}
          open={placement.open}
          onOpenChange={(open) => setPlacement({ ...placement, open })}
          today={today}
          spaces={placementSpaces(placement.target)}
          responsibles={responsibles.data.items}
          meId={me.member.principalId}
          requestHref={requestHref(placement.target.kind === 'move' ? placement.target.activity.requestId : placement.target.request.id)}
          onDone={goTo}
        />
      ) : null}
    </>
  );
}
