import type { Closure } from '@platlab/contracts';
import { Badge, Button, Tooltip, cn } from '@platlab/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, countText, formatFullDate, formatWeekday } from '../../app/format';
import { iconAction } from '../../app/glass';
import { CalendarPicker } from './schedule-calendar';
import { weekDates } from './schedule-grid';

/** Un día de la semana con su carga: el número de bloques en texto, o un guion en el móvil si no tiene. */
function WeekDay({ day, date, today, count, onPick }: { day: string; date: string; today: string; count: number | undefined; onPick: (date: string) => void }) {
  const load = count === undefined ? 'cargando' : count === 0 ? 'sin bloques' : countText(count, 'bloque', 'bloques');
  return (
    <button
      type="button"
      aria-pressed={day === date}
      aria-current={day === today ? 'date' : undefined}
      aria-label={`${formatFullDate(day)}, ${load}`}
      onClick={() => onPick(day)}
      className={cn(
        'grid min-h-16 content-center justify-items-center gap-0.5 rounded-control px-1 py-2 text-center transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
        'bg-surface-sunken/60 hover:bg-surface-sunken aria-pressed:bg-action aria-pressed:text-on-action',
      )}
    >
      <span className="text-xs capitalize opacity-80">{formatWeekday(day, 'short')}</span>
      <span className={cn('text-lg font-bold leading-none tabular-nums', day === today && day !== date && 'text-action')}>{Number(day.slice(8))}</span>
      <span aria-hidden className="text-xs tabular-nums opacity-80">
        {count === undefined ? ' ' : (
          <>
            <span className="sm:hidden">{count === 0 ? '–' : count}</span>
            <span className="max-sm:hidden">{count === 0 ? 'Libre' : countText(count, 'bloque', 'bloques')}</span>
          </>
        )}
      </span>
    </button>
  );
}

/**
 * La cabecera del día (ADR 0023): el día elegido con su período y feriado, ← Hoy → y el calendario para saltar a otro
 * día, y debajo la semana con la carga de cada día (cuántos bloques), a un clic. No guarda nada: el día vive en la URL.
 */
export function ScheduleDayBar({
  date,
  today,
  load,
  period,
  holiday,
  onPick,
}: {
  date: string;
  today: string;
  /** Bloques por día de la semana; nulo mientras carga. */
  load: Record<string, number> | null;
  /** El período activo de la fecha y su semana; `undefined` mientras carga y nulo si no hay. */
  period: { code: string; week: number } | null | undefined;
  holiday: Closure | null;
  onPick: (date: string) => void;
}) {
  return (
    <section aria-label="Día del cronograma" className="rounded-card bg-surface p-4 shadow-raised sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink first-letter:uppercase">{formatFullDate(date)}</h2>
          <p className="mt-1.5 flex min-h-5 flex-wrap items-center gap-1.5">
            {period === undefined ? null : period ? (
              <Badge tone="info">
                Período {period.code} · semana {period.week}
              </Badge>
            ) : (
              <Badge>Fuera de los períodos</Badge>
            )}
            {holiday ? <Badge>Feriado: {holiday.reason}</Badge> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip label="Día anterior">
            <Button size="icon" className={iconAction} aria-label="Día anterior" onClick={() => onPick(addDays(date, -1))}>
              <ChevronLeft aria-hidden />
            </Button>
          </Tooltip>
          <Button className="h-11 sm:h-10" onClick={() => onPick(today)}>
            Hoy
          </Button>
          <Tooltip label="Día siguiente">
            <Button size="icon" className={iconAction} aria-label="Día siguiente" onClick={() => onPick(addDays(date, 1))}>
              <ChevronRight aria-hidden />
            </Button>
          </Tooltip>
          <CalendarPicker date={date} today={today} onPick={onPick} />
        </div>
      </div>
      <div role="group" aria-label="Semana" className="mt-4 grid grid-cols-7 gap-1.5">
        {weekDates(date).map((day) => (
          <WeekDay key={day} day={day} date={date} today={today} count={load?.[day]} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}
