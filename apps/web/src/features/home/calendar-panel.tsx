import { Button, Skeleton, Tooltip, cn } from '@platlab/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';
import { useShell } from '../../app/app-shell';
import { monthWeeks, shiftMonth, weekDates } from '../../app/calendar';
import { formatFullDate, formatWeekday, upperFirst } from '../../app/format';
import { monthName } from '../../app/month-name';
import { useHomeAgenda, useHomeCalendar } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { dayContents, heatLevel, heatTiers, statusSummary, type HeatLevel } from './agenda';
import { AgendaList } from './agenda-list';
import { agendaNoun, panel } from './shared';

/** Las iniciales de los días, de lunes a domingo, tomadas de una semana cualquiera. */
const weekdayInitials = weekDates('2026-01-05').map((date) => formatWeekday(date, 'short').slice(0, 1).toUpperCase());

/**
 * Cada tramo en el acento del Inicio, de más claro a más intenso; los dos últimos llevan texto claro. El número del día
 * y su nombre accesible dicen lo mismo que el color.
 */
const heatTone: Record<HeatLevel, string> = {
  0: 'bg-surface-sunken text-ink-muted',
  1: 'bg-action/15 text-ink',
  2: 'bg-action/35 text-ink',
  3: 'bg-action text-on-action',
  4: 'bg-action-deep text-on-action',
};

/**
 * Calendario (ADR 0026): el mes como mapa de calor de prácticas, mantenimientos y devoluciones, en tramos fijos. Al tocar
 * un día, su lista aparece debajo del mes, cada actividad con su enlace (revisión de IN-02).
 */
export function CalendarPanel({
  month,
  onMonth,
  selected,
  onPick,
  className,
}: {
  month: string;
  onMonth: (month: string) => void;
  selected: string;
  onPick: (date: string) => void;
  className?: string;
}) {
  const { workspaceId } = useShell();
  const calendar = useHomeCalendar(workspaceId, month);
  const titleId = useId();
  const days = new Map(calendar.data?.days.map((day) => [day.date, day]));
  return (
    <section aria-labelledby={titleId} className={cn(panel, className)}>
      <div className="flex items-center gap-2">
        <h2 id={titleId} className="text-lg font-bold text-ink">
          Calendario
        </h2>
        <p aria-live="polite" className="ml-auto text-sm font-medium text-ink-muted">
          {upperFirst(monthName(month, 'long'))}
        </p>
        <Tooltip label="Mes anterior">
          <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => onMonth(shiftMonth(month, -1))}>
            <ChevronLeft aria-hidden />
          </Button>
        </Tooltip>
        <Tooltip label="Mes siguiente">
          <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => onMonth(shiftMonth(month, 1))}>
            <ChevronRight aria-hidden />
          </Button>
        </Tooltip>
      </div>

      {calendar.isPending ? (
        <Skeleton className="mt-4 h-64 rounded-panel" />
      ) : calendar.isError ? (
        <div className="mt-4">
          <QueryErrorState error={calendar.error} onRetry={() => void calendar.refetch()} />
        </div>
      ) : (
        <div aria-busy={calendar.isPlaceholderData} className={cn('mt-4 transition-opacity duration-150', calendar.isPlaceholderData && 'opacity-60')}>
          <div role="group" aria-label={monthName(month, 'long')} className="grid gap-1">
            <div aria-hidden className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted">
              {weekdayInitials.map((initial, index) => (
                <span key={index}>{initial}</span>
              ))}
            </div>
            {monthWeeks(month).map((week) => (
              <div key={week[0]} className="grid grid-cols-7 gap-1">
                {week.map((date) => {
                  const day = days.get(date);
                  // Los días de otro mes solo completan la semana.
                  if (!day) return <span key={date} aria-hidden className="aspect-square" />;
                  const today = date === calendar.data.today;
                  return (
                    <button
                      key={date}
                      type="button"
                      aria-pressed={date === selected}
                      aria-current={today ? 'date' : undefined}
                      aria-label={`${formatFullDate(date)}: ${dayContents(day.counts, agendaNoun).toLowerCase()}`}
                      onClick={() => onPick(date)}
                      className={cn(
                        'relative flex aspect-square min-h-9 items-center justify-center rounded-[10px] text-sm tabular-nums transition-[box-shadow] duration-150',
                        'hover:ring-2 hover:ring-inset hover:ring-ink/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
                        'aria-pressed:ring-2 aria-pressed:ring-ink aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface',
                        heatTone[heatLevel(day.total)],
                        today && 'font-bold',
                      )}
                    >
                      {Number(date.slice(8))}
                      {today ? <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-current" /> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-muted">
            <span>Actividades por día:</span>
            <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {heatTiers.map((tier) => (
                <li key={tier.level} className="flex items-center gap-1">
                  <span aria-hidden className={cn('size-3 rounded-[4px]', heatTone[tier.level])} />
                  <span className="tabular-nums">{tier.label}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}
      <DayList date={selected} today={calendar.data?.today ?? null} />
    </section>
  );
}

/**
 * Lo del día elegido, por hora. Hoy comparte la consulta con Actividad; un día pasado solo trae lo hecho (ADR 0026,
 * «Diseño de IN-01»).
 */
function DayList({ date, today }: { date: string; today: string | null }) {
  const { workspaceId } = useShell();
  const agenda = useHomeAgenda(workspaceId, date === today ? null : date);
  const items = agenda.data?.day.date === date ? agenda.data.day.items : null;
  return (
    <div className="mt-5 border-t border-line pt-4" aria-live="polite" aria-busy={items === null && agenda.isFetching}>
      <h3 className="text-sm font-semibold text-ink">
        {date === today ? 'Hoy' : upperFirst(formatFullDate(date))}
        {items && items.length > 0 ? <span className="ml-2 font-normal tabular-nums text-ink-muted">{statusSummary(items)}</span> : null}
      </h3>
      <div className="mt-2">
        {agenda.isError ? (
          <QueryErrorState error={agenda.error} onRetry={() => void agenda.refetch()} />
        ) : items === null ? (
          <Skeleton className="h-16 rounded-panel" />
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin prácticas, mantenimientos ni devoluciones este día.</p>
        ) : (
          <AgendaList items={items} date={date} />
        )}
      </div>
    </div>
  );
}
