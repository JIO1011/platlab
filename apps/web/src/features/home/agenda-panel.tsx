import { timeText, type AgendaItem, type AgendaStatus, type HomeAgendaResponse } from '@platlab/contracts';
import { Button, Skeleton, cn } from '@platlab/ui';
import { CalendarCheck, CircleCheck, CircleDot, Clock, type LucideIcon } from 'lucide-react';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useShell } from '../../app/app-shell';
import { nowMinutes } from '../../app/calendar';
import { formatFullDate, todayInZone, upperFirst } from '../../app/format';
import { useHomeAgenda } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { useNow } from '../../app/use-now';
import { allDay, hourMarks, offset, placeTimed, statusOrder, statusSummary, statusText, timeLabel, timeRange, timed, type TimeRange } from './agenda';
import { agendaPath, moduleIcon, panel } from './shared';

type AgendaDay = HomeAgendaResponse['day'];

/** Alto de cada carril de la franja, en píxeles. */
const LANE = 60;

const statusIcon: Record<AgendaStatus, LucideIcon> = { in_progress: CircleDot, upcoming: Clock, done: CircleCheck };

/** En curso, relleno con la acción; por iniciar, contorno de la acción; finalizada, apagada. El icono y el texto lo dicen también. */
const statusTone: Record<AgendaStatus, string> = {
  in_progress: 'bg-action text-on-action',
  upcoming: 'bg-surface text-ink ring-1 ring-inset ring-action/45',
  done: 'bg-surface-sunken text-ink-muted',
};

/** «Laboratorios · Titulación ácido-base, 08:00–10:00, en proceso»: lo que lee un lector de pantalla. */
function itemLabel(item: AgendaItem, moduleName: string | undefined): string {
  return [moduleName, `${item.title}${item.detail ? ` (${item.detail})` : ''}`, timeLabel(item), statusText[item.status].one.toLowerCase()]
    .filter(Boolean)
    .join(', ');
}

/** Una actividad como enlace a su módulo, o como texto si el módulo no dice dónde se abre. */
function ItemLink({ item, date, className, style, children }: { item: AgendaItem; date: string; className: string; style?: CSSProperties; children: ReactNode }) {
  const { workspaceId, me } = useShell();
  const path = agendaPath(workspaceId, item, date);
  const label = itemLabel(item, me.modules.find((module) => module.code === item.moduleCode)?.name);
  const focus = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action';
  return path ? (
    <Link to={path} aria-label={label} title={label} className={cn(className, focus)} style={style}>
      {children}
    </Link>
  ) : (
    <div aria-label={label} title={label} role="group" className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Actividad (ADR 0026): un cronograma corto del día, no el Cronograma entero. Lo que tiene hora va en una franja con la
 * línea de «ahora»; lo que no, en «Todo el día»; en el móvil, la misma información en lista por estado. Si hoy no queda
 * nada por iniciar, también lo próximo.
 */
export function AgendaPanel({ date, onPick, className }: { date: string | null; onPick: (date: string | null) => void; className?: string }) {
  const { workspaceId, me } = useShell();
  const agenda = useHomeAgenda(workspaceId, date);
  const titleId = useId();
  const today = agenda.data?.today ?? todayInZone(me.workspace.timeZone);
  const shown = date ?? today;
  const isToday = shown === today;
  return (
    <section aria-labelledby={titleId} className={cn(panel, className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={titleId} className="text-lg font-bold text-ink">
          Actividad
        </h2>
        <p className="text-sm text-ink-muted">{isToday ? `Hoy · ${formatFullDate(shown)}` : upperFirst(formatFullDate(shown))}</p>
        {isToday ? null : (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onPick(null)}>
            Volver a hoy
          </Button>
        )}
      </div>
      {agenda.isPending ? (
        <Skeleton className="mt-5 h-44 rounded-panel" />
      ) : agenda.isError ? (
        <div className="mt-5">
          <QueryErrorState error={agenda.error} onRetry={() => void agenda.refetch()} />
        </div>
      ) : (
        // Mientras llega otro día se ve el anterior, atenuado: sin saltos de alto.
        <div aria-busy={agenda.isPlaceholderData} className={cn('transition-opacity duration-150', agenda.isPlaceholderData && 'opacity-60')}>
          <DayBody day={agenda.data.day} isToday={agenda.data.day.date === agenda.data.today} timeZone={agenda.data.timeZone} />
          {agenda.data.next ? <NextDay day={agenda.data.next} onPick={onPick} /> : null}
        </div>
      )}
    </section>
  );
}

function DayBody({ day, isToday, timeZone }: { day: AgendaDay; isToday: boolean; timeZone: string }) {
  if (day.items.length === 0) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-panel bg-surface-sunken p-4 text-sm text-ink-muted">
        <CalendarCheck className="size-5 shrink-0 text-ink-subtle" aria-hidden />
        {isToday ? 'Hoy no hay prácticas, mantenimientos ni devoluciones.' : 'Este día no tiene prácticas, mantenimientos ni devoluciones.'}
      </div>
    );
  }
  const withTime = timed(day.items);
  return (
    <>
      <p className="mt-1 text-sm tabular-nums text-ink-muted">{statusSummary(day.items)}</p>
      <AllDay items={allDay(day.items)} date={day.date} />
      {withTime.length > 0 ? <Timeline items={withTime} date={day.date} timeZone={isToday ? timeZone : null} /> : null}
      <StatusList items={day.items} date={day.date} />
    </>
  );
}

/** «Todo el día»: lo que no tiene hora (un mantenimiento que vence, una devolución prevista), en fichas. Desde `md`. */
function AllDay({ items, date }: { items: AgendaItem[]; date: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 hidden items-start gap-3 md:flex">
      <p className="w-24 shrink-0 pt-2 text-[13px] font-medium text-ink-muted">Todo el día</p>
      <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
        {items.map((item, index) => {
          const Icon = statusIcon[item.status];
          const ModuleIcon = moduleIcon(item.moduleCode);
          return (
            <li key={`${item.moduleCode}:${item.ref}:${index}`} className="max-w-full">
              <ItemLink
                item={item}
                date={date}
                className={cn('flex max-w-full items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3 text-sm transition-shadow duration-150 hover:shadow-raised', statusTone[item.status])}
              >
                <ModuleIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                <span className="truncate font-medium">{item.title}</span>
                {item.detail ? <span className="hidden truncate opacity-75 lg:inline">{item.detail}</span> : null}
                <Icon className="size-4 shrink-0" aria-hidden />
              </ItemLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * La franja del día desde `md`: horas arriba, una línea por hora y cada actividad en su carril. Hoy, la línea de «ahora»
 * en tinta con la hora, como en el Cronograma; avanza sola cada 30 s.
 */
function Timeline({ items, date, timeZone }: { items: AgendaItem[]; date: string; timeZone: string | null }) {
  const clock = useNow(30_000);
  const range = timeRange(items);
  const { placed, lanes } = placeTimed(items, range);
  const marks = hourMarks(range);
  const minutes = timeZone ? nowMinutes(clock, timeZone) : null;
  const now = minutes !== null && minutes >= range.start && minutes <= range.end ? minutes : null;
  return (
    <div className="mt-5 hidden md:block">
      <HourLabels marks={marks} range={range} />
      <div className="relative mt-1 rounded-panel bg-surface-sunken/70" style={{ height: lanes * LANE + 12 }}>
        {marks.map((mark) => (
          <span key={mark} aria-hidden className="absolute inset-y-0 w-px bg-line" style={{ left: `${offset(mark, range)}%` }} />
        ))}
        <ol aria-label="Actividades con hora">
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
                  style={{ top: 6 + lane * LANE, height: LANE - 6, left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }}
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
        </ol>
        {now === null ? null : (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 z-10 w-px bg-ink" style={{ left: `${offset(now, range)}%` }} />
            <span
              aria-hidden
              className="pointer-events-none absolute -top-2.5 z-10 -translate-x-1/2 rounded-[5px] bg-ink px-1.5 py-px font-mono text-[11px] font-semibold leading-4 tabular-nums text-surface"
              style={{ left: `${offset(now, range)}%` }}
            >
              {timeText(now)}
            </span>
            <p className="sr-only">Son las {timeText(now)}.</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Las horas del eje: la primera alineada a la izquierda y la última a la derecha, para que no se salgan. */
function HourLabels({ marks, range }: { marks: number[]; range: TimeRange }) {
  return (
    <div aria-hidden className="relative h-4 font-mono text-[11px] leading-4 tabular-nums text-ink-subtle">
      {marks.map((mark, index) => (
        <span
          key={mark}
          className={cn('absolute', index === 0 ? '' : index === marks.length - 1 ? '-translate-x-full' : '-translate-x-1/2')}
          style={{ left: `${offset(mark, range)}%` }}
        >
          {timeText(mark)}
        </span>
      ))}
    </div>
  );
}

/** En el móvil: la misma información en lista por estado (en proceso, por iniciar, finalizadas). */
function StatusList({ items, date }: { items: AgendaItem[]; date: string }) {
  return (
    <div className="mt-4 grid gap-4 md:hidden">
      {statusOrder.map((status) => {
        const group = items.filter((item) => item.status === status);
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <h3 className="text-[13px] font-semibold text-ink-muted">
              {statusText[status].group} <span className="tabular-nums">({group.length})</span>
            </h3>
            <ul className="mt-1.5 grid gap-1.5">
              {group.map((item, index) => {
                const Icon = statusIcon[item.status];
                return (
                  <li key={`${item.moduleCode}:${item.ref}:${index}`}>
                    <ItemLink item={item} date={date} className={cn('flex min-h-14 items-center gap-3 rounded-control px-3 py-2', statusTone[item.status])}>
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="block truncate text-[12px] tabular-nums opacity-80">
                          {timeLabel(item)}
                          {item.detail ? ` · ${item.detail}` : ''}
                        </span>
                      </span>
                    </ItemLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Hoy no queda nada por iniciar: lo próximo, con un vistazo y el paso a ese día. */
function NextDay({ day, onPick }: { day: AgendaDay; onPick: (date: string) => void }) {
  const preview = day.items.slice(0, 3);
  return (
    <div className="mt-5 rounded-panel border border-line p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm text-ink-muted">
          Hoy no queda nada por iniciar. Lo próximo: <span className="font-semibold text-ink">{formatFullDate(day.date)}</span>
        </p>
        <Button size="sm" className="ml-auto" onClick={() => onPick(day.date)}>
          Ver ese día
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
            </li>
          );
        })}
      </ul>
      {day.items.length > preview.length ? <p className="mt-2 text-[13px] text-ink-muted">y {day.items.length - preview.length} más</p> : null}
    </div>
  );
}
