import { scheduleCheck, type Activity, type Closure, type RequestSummary } from '@platlab/contracts';
import { Skeleton, StatePanel, cn, toast } from '@platlab/ui';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { todayInZone } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useAreasOverview } from '../../app/queries';
import { useMediaQuery } from '../../app/use-media-query';
import { useLabs } from './context';
import { useClosures, usePeriods, useRequests, useResponsibles, useSchedule, useSpaces } from './queries';
import { ActivitySheet } from './schedule-block-sheet';
import type { BlockOpening } from './schedule-block';
import { DayControls, DayDetail } from './schedule-day-bar';
import { ScheduleDnd, type DragPreview, type DragSource } from './schedule-dnd';
import { activitiesOn, boardColumns, boardRange, holidayOn, parseDay, periodOn, toMinutes, weekDates, type BoardColumn } from './schedule-grid';
import { ScheduleList } from './schedule-list';
import { contextFor, endFor, pendingDates, slotAt, toScheduleOrder } from './schedule-placement';
import { PlacementSheet, type PlacementTarget } from './schedule-placement-sheet';
import { ScheduleTable } from './schedule-table';
import { ScheduleTray, type TrayActions } from './schedule-tray';

/** La tabla de horas desde 1024 px; por debajo, una lista por área (ADR 0023). */
const wideQuery = '(min-width: 1024px)';

/** El día en la tabla o en la lista, o por qué no hay nada que mostrar: ninguna área en el Núcleo. */
function DayBoard({
  date,
  columns,
  dayItems,
  closures,
  opening,
  wide,
  canSchedule,
  enableHref,
}: {
  date: string;
  columns: readonly BoardColumn[];
  dayItems: readonly Activity[];
  closures: readonly Closure[];
  opening: BlockOpening;
  wide: boolean;
  canSchedule: boolean;
  enableHref: ((areaId: string) => string) | undefined;
}) {
  if (columns.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel icon={MapPin} title="Aún no hay áreas" description="Cuando el Administrador cree un área y la habilite con su aforo y horario, el cronograma la mostrará aquí." />
      </div>
    );
  }
  return wide ? (
    <ScheduleTable columns={columns} date={date} range={boardRange(dayItems)} dayItems={dayItems} closures={closures} opening={opening} canSchedule={canSchedule} enableHref={enableHref} />
  ) : (
    <ScheduleList columns={columns} date={date} dayItems={dayItems} closures={closures} opening={opening} enableHref={enableHref} />
  );
}

/** Lo que abre la hoja de programar o mover; `nonce` la reinicia cada vez. */
interface PlacementOpen {
  target: PlacementTarget;
  open: boolean;
  nonce: number;
}

/**
 * Cronograma (ADR 0023, L-01c; vista decidida el 24-10-2026): una cabecera de una barra (título y período a la izquierda;
 * ‹ Hoy › y la fecha con su calendario a la derecha), la tabla del día que llena el alto de la ventana, con las áreas del
 * Núcleo como columnas y las horas como filas, y «Por programar» pegada abajo. La ven todos los que consultan Laboratorios; el día vive en
 * la URL (`?dia=`), con «Hoy» por omisión. Un clic en un bloque abre su solicitud llena para quien puede verla (quien
 * recibe, en Recibidas; el Docente, la suya) o, si no, su panel de solo lectura. El Administrador (`labs.schedule.manage`)
 * programa arrastrando una solicitud de «Por programar» a un área y una hora, o con «Programar…», y mueve un bloque el
 * mismo día arrastrándolo o con «Mover…»; el Operador ve «Por programar» sin acciones y el Docente, sin esa franja.
 */
export function LabsSchedulePage() {
  const { workspaceId, me, canSchedule, canManageSpaces } = useLabs();
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
  // Las áreas del Núcleo completan las columnas con las que aún no tienen horario; si no llegan, solo se ven las habilitadas.
  const core = useAreasOverview(workspaceId, me.areas !== 'none');
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
  const columns = spaces.data ? boardColumns(core.data?.areas ?? null, spaces.data.items, dayItems) : [];
  const boardSpaces = columns.flatMap((column) => (column.space ? [column.space] : []));
  const dayClosures = closures.data?.items ?? [];
  const goTo = (day: string) => setParams(day === today ? {} : { dia: day }, { replace: true });

  /** Qué pasaría al soltar lo que se arrastra en esa área a esa hora, con los datos ya cargados. */
  const previewOf = (source: DragSource, areaId: string, start: number): DragPreview | null => {
    const space = boardSpaces.find((item) => item.areaId === areaId);
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
    wide,
    today,
    visible: date,
    onPickDate: goTo,
    onSchedule: programFrom,
  };
  const enabledSpaces = (spaces.data?.items ?? []).filter((space) => space.archivedAt === null && !space.areaArchived);
  const placementSpaces = (target: PlacementTarget) =>
    target.kind === 'move' ? (spaces.data?.items ?? []).filter((space) => enabledSpaces.includes(space) || space.areaId === target.activity.areaId) : enabledSpaces;

  return (
    <>
      <div className={cn('flex flex-col', wide && 'h-[calc(100dvh-8.25rem)]')}>
        <SectionHeader
          title="Cronograma"
          updatedAt={Math.min(...queries.map((query) => query.dataUpdatedAt))}
          detail={<DayDetail period={periods.data ? periodOn(periods.data.items, date) : undefined} holiday={closures.data ? holidayOn(dayClosures, date) : null} />}
          actions={<DayControls date={date} today={today} onPick={goTo} />}
        />
        <ScheduleDnd previewOf={previewOf} onDrop={dropped}>
          <div className={cn('mt-4 grid gap-4', wide && 'flex min-h-0 flex-1 flex-col gap-3')}>
            {failed ? (
              <div className="rounded-card bg-surface shadow-raised">
                <QueryErrorState error={failed.error} onRetry={() => queries.forEach((query) => void query.refetch())} />
              </div>
            ) : queries.some((query) => query.isPending) || core.isLoading ? (
              <div role="status" aria-busy="true" aria-label="Cargando" className="min-h-0 flex-1">
                <Skeleton className="h-96 rounded-card" />
              </div>
            ) : (
              <DayBoard
                date={date}
                columns={columns}
                dayItems={dayItems}
                closures={dayClosures}
                opening={opening}
                wide={wide}
                canSchedule={canSchedule && wide}
                enableHref={canManageSpaces ? (areaId) => `/e/${workspaceId}/areas?area=${areaId}` : undefined}
              />
            )}
            {canReceive ? (
              inbox.isPending ? (
                <div role="status" aria-busy="true" aria-label="Cargando «Por programar»">
                  <Skeleton className="h-28 rounded-card" />
                </div>
              ) : (
                <ScheduleTray items={toScheduleOrder(inbox.data?.items ?? [])} pendingError={inbox.isError} onRetry={() => void inbox.refetch()} actions={tray} />
              )
            ) : null}
          </div>
        </ScheduleDnd>
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
