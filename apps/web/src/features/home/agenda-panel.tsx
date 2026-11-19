import { timeText, type AgendaItem, type HomeAgendaResponse } from '@platlab/contracts';
import { Button, Skeleton, cn } from '@platlab/ui';
import { CalendarCheck } from 'lucide-react';
import { useId, type CSSProperties } from 'react';
import { useShell } from '../../app/app-shell';
import { nowMinutes } from '../../app/calendar';
import { areaLabel, formatFullDate } from '../../app/format';
import { useHomeAgenda } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { useNow } from '../../app/use-now';
import { allDay, areaColumns, busyUntil, hourMarks, offset, placeTimed, statusSummary, timeLabel, timeRange, type AreaColumn, type TimeRange } from './agenda';
import { AgendaList, ItemLink, statusIcon, statusTone } from './agenda-list';
import { moduleIcon, panel } from './shared';

type AgendaDay = HomeAgendaResponse['day'];

/** Alto de una hora en la tabla, en píxeles: de 07:00 a 19:00 son 432 px, la mitad que el Cronograma. */
const HOUR_HEIGHT = 36;
const HOURS_WIDTH = '3.25rem';
const COLUMN_MIN = '6.5rem';

/**
 * Actividad (ADR 0026, segunda revisión de IN-02): lo de hoy como un Cronograma resumido, laboratorio × hora. Una columna
 * por laboratorio, también los libres, con la línea de «ahora»; lo que no tiene hora va en «Todo el día», sobre la tabla.
 * En el móvil, qué laboratorios están libres ahora y la lista por estado. Si hoy no queda nada por iniciar, lo próximo.
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
  const columns = areaColumns(areas, day.items);
  const minutes = nowMinutes(clock, timeZone);
  const untimed = allDay(day.items);
  const empty = day.items.length === 0;
  if (empty && columns.length === 0) return <EmptyNote />;
  return (
    <>
      {empty ? <EmptyNote /> : null}
      <div className="hidden md:block">
        <AllDayStrip items={untimed} date={day.date} />
        {columns.length > 0 ? <Board columns={columns} items={day.items} date={day.date} minutes={minutes} /> : null}
      </div>
      <div className="mt-4 grid gap-3 md:hidden">
        <FreeNow columns={columns} minutes={minutes} />
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

/** En el móvil, lo que responde la tabla en una frase: qué laboratorios están libres ahora. */
function FreeNow({ columns, minutes }: { columns: AreaColumn[]; minutes: number }) {
  const labs = columns.filter((column) => column.area !== null);
  if (labs.length === 0) return null;
  const free = labs.filter((column) => busyUntil(column, minutes) === null).map((column) => areaLabel(column.area!.name));
  return (
    <p className="rounded-panel bg-surface-sunken px-3 py-2 text-sm text-ink">
      <span className="font-semibold">Libres ahora: </span>
      {free.length === 0 ? 'ningún laboratorio' : free.join(', ')}
    </p>
  );
}

/** «Todo el día»: lo que no tiene hora (un mantenimiento que vence, una devolución), en fichas sobre la tabla. */
function AllDayStrip({ items, date }: { items: AgendaItem[]; date: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 flex items-start gap-3">
      <p className="w-[3.25rem] shrink-0 pt-1.5 text-[11px] font-medium leading-4 text-ink-muted">Todo el día</p>
      <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
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
                {item.area ? <span className="hidden truncate opacity-75 lg:inline">{areaLabel(item.area.name)}</span> : null}
                <Icon className="size-3.5 shrink-0" aria-hidden />
              </ItemLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * El Cronograma resumido desde `md`: las horas hacia abajo y una columna por laboratorio con solo su nombre (sin
 * «Laboratorio de», como en el Cronograma); hoy, la línea de «ahora» en tinta con la hora en su píldora. Con muchos
 * laboratorios, la tabla se desplaza de lado dentro de la tarjeta.
 */
function Board({ columns, items, date, minutes }: { columns: AreaColumn[]; items: AgendaItem[]; date: string; minutes: number }) {
  const range = timeRange(items);
  const marks = hourMarks(range);
  const now = minutes >= range.start && minutes <= range.end ? minutes : null;
  const height = ((range.end - range.start) / 60) * HOUR_HEIGHT;
  const style = { gridTemplateColumns: `${HOURS_WIDTH} repeat(${columns.length}, minmax(${COLUMN_MIN}, 1fr))` } as CSSProperties;
  return (
    <div className="mt-4 overflow-x-auto overscroll-x-contain rounded-panel border border-line">
      <div className="grid min-w-fit" style={style}>
        <div aria-hidden className="flex h-9 items-end justify-center border-b border-line pb-1.5 font-mono text-[11px] text-ink-muted">
          Hora
        </div>
        {columns.map((column) => {
          const name = column.area?.name ?? 'Sin área';
          return (
            <div key={column.area?.id ?? 'sin-area'} title={name} className="flex h-9 items-end border-b border-l border-line px-2.5 pb-1.5">
              <span className="truncate text-[13px] font-semibold text-ink">
                <span aria-hidden>{column.area ? areaLabel(name) : name}</span>
                <span className="sr-only">{name}</span>
              </span>
            </div>
          );
        })}
        <div aria-hidden className="relative" style={{ height }}>
          {marks.map((mark, index) => (
            <span
              key={mark}
              className={cn('absolute inset-x-0 text-center font-mono text-[11px] leading-4 tabular-nums text-ink-subtle', index === 0 ? '' : index === marks.length - 1 ? '-translate-y-full' : '-translate-y-1/2')}
              style={{ top: `${offset(mark, range)}%` }}
            >
              {timeText(mark)}
            </span>
          ))}
          {now === null ? null : (
            <span
              className="absolute inset-x-0 z-10 mx-auto w-fit -translate-y-1/2 rounded-[5px] bg-ink px-1.5 py-px font-mono text-[11px] font-semibold leading-4 tabular-nums text-surface"
              style={{ top: `${offset(now, range)}%` }}
            >
              {timeText(now)}
            </span>
          )}
        </div>
        {columns.map((column) => (
          <LabColumn key={column.area?.id ?? 'sin-area'} column={column} range={range} marks={marks} now={now} date={date} height={height} />
        ))}
      </div>
      {now === null ? null : <p className="sr-only">Son las {timeText(now)}.</p>}
    </div>
  );
}

/** Una columna: las líneas de cada hora, las prácticas en su carril y, hoy, la línea de «ahora». */
function LabColumn({ column, range, marks, now, date, height }: { column: AreaColumn; range: TimeRange; marks: number[]; now: number | null; date: string; height: number }) {
  const { placed, lanes } = placeTimed(column.items, range);
  const name = column.area?.name ?? 'Sin área';
  return (
    <div className="relative border-l border-line" style={{ height }}>
      {marks
        .filter((mark) => mark > range.start && mark < range.end)
        .map((mark) => (
          <span key={mark} aria-hidden className="absolute inset-x-0 border-t border-line" style={{ top: `${offset(mark, range)}%` }} />
        ))}
      <ul aria-label={placed.length === 0 ? `${name}: libre todo el día` : name}>
        {placed.map(({ item, lane, start, size }, index) => {
          const Icon = statusIcon[item.status];
          // Lo que dura menos de una hora solo tiene alto para el título.
          const short = (size / 100) * height < 34;
          return (
            <li key={`${item.moduleCode}:${item.ref}:${index}`}>
              <ItemLink
                item={item}
                date={date}
                className={cn(
                  'absolute flex min-w-0 flex-col overflow-hidden rounded-control px-2 transition-shadow duration-150 hover:shadow-float',
                  short ? 'justify-center' : 'justify-start py-1',
                  statusTone[item.status],
                )}
                style={{
                  top: `calc(${start}% + 1px)`,
                  height: `calc(${size}% - 2px)`,
                  left: `calc(${(lane / lanes) * 100}% + 3px)`,
                  width: `calc(${100 / lanes}% - 6px)`,
                }}
              >
                <span className="flex min-w-0 items-center gap-1 text-[12px] font-semibold leading-4">
                  <Icon className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{item.title}</span>
                </span>
                {short ? null : <span className="truncate text-[11px] leading-4 tabular-nums opacity-80">{timeLabel(item)}</span>}
              </ItemLink>
            </li>
          );
        })}
      </ul>
      {now === null ? null : <span aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t border-ink" style={{ top: `${offset(now, range)}%` }} />}
    </div>
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
