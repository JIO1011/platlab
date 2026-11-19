import { timeText, type AgendaItem, type HomeAgendaResponse } from '@platlab/contracts';
import { Button, Skeleton, cn } from '@platlab/ui';
import { CalendarCheck, CircleDot } from 'lucide-react';
import { useId } from 'react';
import { useShell } from '../../app/app-shell';
import { nowMinutes } from '../../app/calendar';
import { formatFullDate } from '../../app/format';
import { useHomeAgenda } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { useNow } from '../../app/use-now';
import { areaRows, busyUntil, hourMarks, offset, placeTimed, statusSummary, timeLabel, timeRange, type AreaRow, type TimeRange } from './agenda';
import { AgendaList, ItemLink, statusIcon, statusTone } from './agenda-list';
import { moduleIcon, panel } from './shared';

type AgendaDay = HomeAgendaResponse['day'];

/** Alto de cada carril de una fila, en píxeles. */
const LANE = 52;
/** Ancho de la columna de las áreas. */
const AREA_COLUMN = 'grid-cols-[11rem_minmax(0,1fr)]';

/**
 * Actividad (ADR 0026, revisión de IN-02): lo de hoy como área × hora, igual que el Cronograma. Una fila por área de
 * Laboratorios, también las libres, con la línea de «ahora»; lo que no tiene hora va junto al nombre del área. En el
 * móvil, la misma información en lista por estado. Si hoy no queda nada por iniciar, también lo próximo.
 */
export function AgendaPanel({ onPickDay, className }: { onPickDay: (date: string) => void; className?: string }) {
  const { workspaceId } = useShell();
  const agenda = useHomeAgenda(workspaceId, null);
  const titleId = useId();
  const title = (
    <h2 id={titleId} className="text-lg font-bold text-ink">
      Actividad
    </h2>
  );
  return (
    <section aria-labelledby={titleId} className={cn(panel, className)}>
      {agenda.isPending ? (
        <>
          {title}
          <Skeleton className="mt-5 h-56 rounded-panel" />
        </>
      ) : agenda.isError ? (
        <>
          {title}
          <div className="mt-5">
            <QueryErrorState error={agenda.error} onRetry={() => void agenda.refetch()} />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {title}
            <p className="text-sm text-ink-muted">Hoy · {formatFullDate(agenda.data.today)}</p>
            {agenda.data.day.items.length > 0 ? (
              <p className="text-sm tabular-nums text-ink-muted md:ml-auto">{statusSummary(agenda.data.day.items)}</p>
            ) : null}
          </div>
          <Today data={agenda.data} />
          {agenda.data.next ? <NextDay day={agenda.data.next} onPick={onPickDay} /> : null}
        </>
      )}
    </section>
  );
}

function Today({ data }: { data: HomeAgendaResponse }) {
  const clock = useNow(30_000);
  const { day, areas, timeZone } = data;
  const rows = areaRows(areas, day.items);
  const minutes = nowMinutes(clock, timeZone);
  const empty = day.items.length === 0;
  if (empty && rows.length === 0) return <EmptyNote />;
  return (
    <>
      {empty ? <EmptyNote /> : null}
      <Board rows={rows} items={day.items} date={day.date} minutes={minutes} />
      <div className="mt-4 grid gap-3 md:hidden">
        <FreeNow rows={rows} minutes={minutes} />
        {empty ? null : <AgendaList items={day.items} date={day.date} grouped />}
      </div>
    </>
  );
}

function EmptyNote() {
  return (
    <p className="mt-4 flex items-center gap-3 rounded-panel bg-surface-sunken p-4 text-sm text-ink-muted">
      <CalendarCheck className="size-5 shrink-0 text-ink-subtle" aria-hidden />
      Hoy no hay prácticas, mantenimientos ni devoluciones.
    </p>
  );
}

/** En el móvil, lo que responde la franja en una frase: qué áreas están libres ahora. */
function FreeNow({ rows, minutes }: { rows: AreaRow[]; minutes: number }) {
  const free = rows.flatMap((row) => (row.area && busyUntil(row, minutes) === null ? [row.area.name] : []));
  if (!rows.some((row) => row.area)) return null;
  return (
    <p className="rounded-panel bg-surface-sunken px-3 py-2 text-sm text-ink">
      <span className="font-semibold">Libres ahora: </span>
      {free.length === 0 ? 'ninguna área' : free.join(', ')}
    </p>
  );
}

/**
 * La franja desde `md`: horas arriba y una fila por área; cada actividad con hora en su carril y la línea de «ahora» en
 * tinta con la hora, como en el Cronograma. Con muchas áreas, las filas se desplazan dentro de la tarjeta.
 */
function Board({ rows, items, date, minutes }: { rows: AreaRow[]; items: AgendaItem[]; date: string; minutes: number }) {
  const range = timeRange(items);
  const marks = hourMarks(range);
  const now = minutes >= range.start && minutes <= range.end ? minutes : null;
  return (
    <div className="mt-5 hidden md:block">
      <div className={cn('grid gap-x-3', AREA_COLUMN)}>
        <span aria-hidden className="text-[11px] font-medium leading-5 text-ink-subtle">
          Área
        </span>
        <HourLabels marks={marks} range={range} now={now} />
      </div>
      <ol aria-label="Actividad por área" className="mt-1 max-h-[34rem] overflow-y-auto overscroll-contain">
        {rows.map((row) => (
          <AreaLine key={row.area?.id ?? 'sin-area'} row={row} range={range} marks={marks} now={now} minutes={minutes} date={date} />
        ))}
      </ol>
      {now === null ? null : <p className="sr-only">Son las {timeText(now)}.</p>}
    </div>
  );
}

/** Las horas del eje y, hoy, la hora de «ahora» en su píldora; la primera alineada a la izquierda y la última a la derecha. */
function HourLabels({ marks, range, now }: { marks: number[]; range: TimeRange; now: number | null }) {
  return (
    <div aria-hidden className="relative h-5 font-mono text-[11px] leading-5 tabular-nums text-ink-subtle">
      {marks.map((mark, index) => (
        <span
          key={mark}
          className={cn('absolute', index === 0 ? '' : index === marks.length - 1 ? '-translate-x-full' : '-translate-x-1/2')}
          style={{ left: `${offset(mark, range)}%` }}
        >
          {timeText(mark)}
        </span>
      ))}
      {now === null ? null : (
        <span className="absolute z-10 -translate-x-1/2 rounded-[5px] bg-ink px-1.5 font-semibold text-surface" style={{ left: `${offset(now, range)}%` }}>
          {timeText(now)}
        </span>
      )}
    </div>
  );
}

/**
 * Una fila: a la izquierda el área, si está libre o en uso ahora y lo que no tiene hora; a la derecha su franja. La fila
 * sin área se llama «Todo el día» si solo tiene eso, y «Sin área» si también tiene algo con hora.
 */
function AreaLine({ row, range, marks, now, minutes, date }: { row: AreaRow; range: TimeRange; marks: number[]; now: number | null; minutes: number; date: string }) {
  const { placed, lanes } = placeTimed(row.timed, range);
  const busy = row.area ? busyUntil(row, minutes) : null;
  const loose = row.area === null;
  const name = row.area?.name ?? (row.timed.length > 0 ? 'Sin área' : 'Todo el día');
  return (
    <li className={cn('grid gap-x-3 border-t border-line py-1.5', AREA_COLUMN)}>
      <div className="min-w-0 py-1">
        <p className="truncate text-sm font-semibold text-ink" title={name}>
          {name}
        </p>
        {loose ? null : busy === null ? (
          <p className="text-[12px] text-ink-muted">Libre ahora</p>
        ) : (
          <p className="flex items-center gap-1 text-[12px] font-medium text-action">
            <CircleDot className="size-3" aria-hidden />
            En uso hasta las {timeText(busy)}
          </p>
        )}
        {loose ? null : <AllDayChips items={row.allDay} date={date} className="mt-1.5" />}
      </div>
      {loose && row.timed.length === 0 ? (
        <AllDayChips items={row.allDay} date={date} className="py-1" />
      ) : (
        <div className="relative min-h-14 rounded-control bg-surface-sunken/70" style={{ height: lanes * LANE + 8 }}>
          {marks.map((mark) => (
            <span key={mark} aria-hidden className="absolute inset-y-0 w-px bg-line" style={{ left: `${offset(mark, range)}%` }} />
          ))}
          <ul aria-label={placed.length === 0 ? 'Sin actividades con hora' : undefined}>
            {placed.map(({ item, lane, left, width }, index) => {
              const Icon = statusIcon[item.status];
              return (
                <li key={`${item.moduleCode}:${item.ref}:${index}`}>
                  <ItemLink
                    item={item}
                    date={date}
                    className={cn(
                      'absolute flex min-w-0 flex-col justify-center overflow-hidden rounded-control px-2.5 transition-shadow duration-150 hover:shadow-float',
                      statusTone[item.status],
                    )}
                    style={{ top: 4 + lane * LANE, height: LANE - 6, left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }}
                  >
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                      <Icon className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className="truncate text-[12px] tabular-nums opacity-80">
                      {timeLabel(item)}
                      {item.detail ? ` · ${item.detail}` : ''}
                    </span>
                  </ItemLink>
                </li>
              );
            })}
          </ul>
          {now === null ? null : (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 z-10 w-px bg-ink" style={{ left: `${offset(now, range)}%` }} />
          )}
        </div>
      )}
    </li>
  );
}

/** Lo que no tiene hora (un mantenimiento que vence, una devolución), en fichas con el icono de su módulo y su estado. */
function AllDayChips({ items, date, className }: { items: AgendaItem[]; date: string; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={cn('flex min-w-0 flex-wrap gap-1.5', className)}>
      {items.map((item, index) => {
        const Icon = statusIcon[item.status];
        const ModuleIcon = moduleIcon(item.moduleCode);
        return (
          <li key={`${item.moduleCode}:${item.ref}:${index}`} className="max-w-full">
            <ItemLink
              item={item}
              date={date}
              className={cn('flex max-w-full items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-[13px] transition-shadow duration-150 hover:shadow-raised', statusTone[item.status])}
            >
              <ModuleIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="truncate font-medium">{item.title}</span>
              <Icon className="size-3.5 shrink-0" aria-hidden />
            </ItemLink>
          </li>
        );
      })}
    </ul>
  );
}

/** Hoy no queda nada por iniciar: lo próximo, con un vistazo y el paso a ese día en el Calendario. */
function NextDay({ day, onPick }: { day: AgendaDay; onPick: (date: string) => void }) {
  const preview = day.items.slice(0, 3);
  return (
    <div className="mt-5 rounded-panel border border-line p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm text-ink-muted">
          Hoy no queda nada por iniciar. Lo próximo: <span className="font-semibold text-ink">{formatFullDate(day.date)}</span>
        </p>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={() => onPick(day.date)}>
          Ver en el calendario
        </Button>
      </div>
      <ul className="mt-3 grid gap-1.5">
        {preview.map((item, index) => {
          const ModuleIcon = moduleIcon(item.moduleCode);
          return (
            <li key={`${item.moduleCode}:${item.ref}:${index}`} className="flex min-w-0 items-center gap-2 text-sm">
              <ModuleIcon className="size-4 shrink-0 text-action" aria-hidden />
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{timeLabel(item)}</span>
              <span className="truncate text-ink">{item.title}</span>
              {item.area ? <span className="hidden truncate text-ink-muted sm:inline">· {item.area.name}</span> : null}
            </li>
          );
        })}
      </ul>
      {day.items.length > preview.length ? <p className="mt-2 text-[13px] text-ink-muted">y {day.items.length - preview.length} más</p> : null}
    </div>
  );
}
