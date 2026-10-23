import { Button, Popover, PopoverContent, PopoverTrigger, Tooltip, cn } from '@platlab/ui';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { monthName } from '../../app/month-name';
import { formatFullDate, formatWeekday } from '../../app/format';
import { iconAction } from '../../app/glass';
import { monthWeeks, shiftMonth, weekDates } from './schedule-grid';

/** Las iniciales de los días, de lunes a domingo, tomadas de una semana cualquiera. */
const weekdayInitials = weekDates('2026-01-05').map((date) => formatWeekday(date, 'short').slice(0, 1).toUpperCase());

/** El mes del día elegido, para saltar a cualquier fecha; se monta al abrirse, así siempre parte del día elegido. */
function MonthPicker({ date, today, onPick }: { date: string; today: string; onPick: (date: string) => void }) {
  const [month, setMonth] = useState(date.slice(0, 7));
  return (
    <div className="grid gap-2 p-1.5">
      <div className="flex items-center justify-between gap-2">
        <Tooltip label="Mes anterior">
          <Button size="icon" className={iconAction} aria-label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft aria-hidden />
          </Button>
        </Tooltip>
        <p aria-live="polite" className="text-sm font-semibold capitalize text-ink">
          {monthName(month, 'long')}
        </p>
        <Tooltip label="Mes siguiente">
          <Button size="icon" className={iconAction} aria-label="Mes siguiente" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight aria-hidden />
          </Button>
        </Tooltip>
      </div>
      <div role="group" aria-label={monthName(month, 'long')} className="grid gap-0.5">
        <div aria-hidden className="grid grid-cols-7 text-center text-xs text-ink-muted">
          {weekdayInitials.map((initial, index) => (
            <span key={index} className="py-1">
              {initial}
            </span>
          ))}
        </div>
        {monthWeeks(month).map((week) => (
          <div key={week[0]} className="grid grid-cols-7 gap-0.5">
            {week.map((day) => {
              const selected = day === date;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={selected}
                  aria-current={day === today ? 'date' : undefined}
                  aria-label={formatFullDate(day)}
                  onClick={() => onPick(day)}
                  className={cn(
                    'relative h-11 rounded-control text-sm tabular-nums transition-colors sm:h-9',
                    'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
                    selected ? 'bg-action font-semibold text-on-action' : day.slice(0, 7) === month ? 'text-ink hover:bg-surface-sunken' : 'text-ink-subtle hover:bg-surface-sunken',
                    day === today && !selected && 'font-semibold text-action',
                  )}
                >
                  {Number(day.slice(8))}
                  {day === today ? <span aria-hidden className={cn('absolute inset-x-0 bottom-1 mx-auto size-1 rounded-full', selected ? 'bg-on-action' : 'bg-action')} /> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** «Calendario»: el botón que abre el mes para elegir cualquier día; al elegir, se cierra. */
export function CalendarPicker({ date, today, onPick }: { date: string; today: string; onPick: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="h-11 sm:h-10">
          <CalendarDays aria-hidden />
          Calendario
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <MonthPicker
          date={date}
          today={today}
          onPick={(day) => {
            setOpen(false);
            onPick(day);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
