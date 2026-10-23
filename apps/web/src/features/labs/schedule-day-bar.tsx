import type { Closure } from '@platlab/contracts';
import { Badge, Button, Tooltip, cn } from '@platlab/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, countText, formatFullDate, formatWeekday } from '../../app/format';
import { iconAction } from '../../app/glass';
import { CalendarPicker } from './schedule-calendar';
import { weekDates } from './schedule-grid';

/** Un día de la semana con su carga: el número de bloques como un dígito (nada si no tiene); su nombre accesible lo dice entero. */
function WeekDay({ day, date, today, count, onPick }: { day: string; date: string; today: string; count: number | undefined; onPick: (date: string) => void }) {
  const load = count === undefined ? 'cargando' : count === 0 ? 'sin bloques' : countText(count, 'bloque', 'bloques');
  return (
    <button
      type="button"
      aria-pressed={day === date}
      aria-current={day === today ? 'date' : undefined}
      aria-label={`${formatFullDate(day)}, ${load}`}
      title={load}
      onClick={() => onPick(day)}
      className={cn(
        'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-control px-1.5 py-1 text-center transition-colors xl:min-h-9 xl:flex-row xl:gap-1.5 xl:px-2.5',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
        'bg-surface-sunken/60 hover:bg-surface-sunken aria-pressed:bg-action aria-pressed:text-on-action',
      )}
    >
      <span className="text-xs capitalize opacity-80">{formatWeekday(day, 'short')}</span>
      <span className={cn('text-base font-bold leading-none tabular-nums', day === today && day !== date && 'text-action')}>{Number(day.slice(8))}</span>
      <span aria-hidden className="min-w-4 rounded-full bg-ink/10 px-1 text-center text-[11px] font-semibold leading-4 tabular-nums empty:invisible">
        {count ? count : ''}
      </span>
    </button>
  );
}

/**
 * La cabecera del día (ADR 0023), compacta para dejar la tabla a la vista: el día elegido con su período y feriado, la
 * semana con la carga de cada día (cuántos bloques), a un clic, y ← Hoy → con el calendario, en una sola fila desde 1280
 * px (en pantallas más estrechas, la semana baja a su propia fila). No guarda nada: el día vive en la URL.
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
    <section aria-label="Día del cronograma" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-card bg-surface px-4 py-3 shadow-raised">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ink first-letter:uppercase">{formatFullDate(date)}</h2>
        <p className="mt-1 flex min-h-5 flex-wrap items-center gap-1.5">
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
      <div role="group" aria-label="Semana" className="order-last grid w-full grid-cols-7 gap-1.5 xl:order-none xl:flex xl:w-auto xl:gap-1">
        {weekDates(date).map((day) => (
          <WeekDay key={day} day={day} date={date} today={today} count={load?.[day]} onPick={onPick} />
        ))}
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
    </section>
  );
}
