import type { Closure } from '@platlab/contracts';
import { Button, Tooltip, cn } from '@platlab/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { addDays, countText, formatFullDate, formatWeekday } from '../../app/format';
import { iconAction } from '../../app/glass';
import { CalendarPicker } from './schedule-calendar';
import { weekDates } from './schedule-grid';
import { softCard } from './style';

/** «lun 2»: el día de la semana y su número. */
const weekdayText = (date: string) => `${formatWeekday(date, 'short').replace('.', '')} ${Number(date.slice(8))}`;

/**
 * La semana del día elegido, de lunes a domingo, para saltar a otro día de ella con un clic: «Lun 2» y, en pequeño, cuántos
 * bloques tiene. El elegido va relleno con el acento; hoy lleva además un punto (y «hoy» en su nombre accesible). En el
 * móvil se desplaza en horizontal y deja a la vista el día elegido.
 */
function WeekStrip({ date, today, load, onPick }: { date: string; today: string; load: Record<string, number> | null; onPick: (date: string) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = strip.current;
    const selected = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (box && selected) box.scrollLeft = selected.offsetLeft - (box.clientWidth - selected.offsetWidth) / 2;
  }, [date]);
  return (
    <div ref={strip} role="group" aria-label="Semana" className="relative flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain py-0.5 lg:flex-none">
      {weekDates(date).map((day) => {
        const selected = day === date;
        const count = load?.[day];
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            aria-current={day === today ? 'date' : undefined}
            aria-label={`${formatFullDate(day)}${day === today ? ', hoy' : ''}${count === undefined ? '' : `, ${count === 0 ? 'sin bloques' : countText(count, 'bloque', 'bloques')}`}`}
            onClick={() => onPick(day)}
            className={cn(
              'relative grid h-11 w-14 shrink-0 content-center justify-items-center gap-0.5 rounded-control text-ink whitespace-nowrap transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
              selected ? 'bg-action font-semibold text-on-action' : 'hover:bg-surface-sunken',
            )}
          >
            <span className={cn('text-[13px] leading-4 tabular-nums first-letter:uppercase', !selected && 'font-medium')}>{weekdayText(day)}</span>
            <span aria-hidden className={cn('text-[10px] leading-3 tabular-nums', selected ? 'text-on-action' : 'text-ink-muted')}>
              {count === undefined ? '' : count === 0 ? '—' : countText(count, 'bloque', 'bloques')}
            </span>
            {day === today ? <span aria-hidden className={cn('absolute left-1/2 top-1 size-1.5 -translate-x-1/2 rounded-full', selected ? 'bg-on-action' : 'bg-action-deep')} /> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * La barra del día del Cronograma, una sola franja (ADR 0023): a la izquierda ‹ ›, la fecha completa en grande y, debajo,
 * el período y la semana (y el feriado, con texto, si lo es); a la derecha, la semana para saltar de día, «Hoy» (solo
 * activo si no se está en hoy) y el calendario del mes con la carga de cada día. En el móvil son dos filas: la fecha con
 * ‹ › y, debajo, la semana desplazable con «Hoy» y el calendario. No guarda nada: el día vive en la URL.
 */
export function DayBar({
  date,
  today,
  period,
  holiday,
  load,
  onPick,
}: {
  date: string;
  today: string;
  /** El período del día, nulo si cae fuera de los períodos e indefinido mientras cargan. */
  period: { code: string; week: number } | null | undefined;
  holiday: Closure | null;
  /** Los bloques de cada día de la semana; nulo mientras cargan. */
  load: Record<string, number> | null;
  onPick: (date: string) => void;
}) {
  return (
    <div role="group" aria-label="Día del cronograma" className={cn(softCard, 'flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-2 sm:px-5')}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 gap-1">
          <Tooltip label="Día anterior">
            <Button size="icon" className={iconAction} aria-label="Día anterior" onClick={() => onPick(addDays(date, -1))}>
              <ChevronLeft aria-hidden />
            </Button>
          </Tooltip>
          <Tooltip label="Día siguiente">
            <Button size="icon" className={iconAction} aria-label="Día siguiente" onClick={() => onPick(addDays(date, 1))}>
              <ChevronRight aria-hidden />
            </Button>
          </Tooltip>
        </div>
        <div className="min-w-0">
          <h2 aria-live="polite" className="text-lg font-bold leading-6 tracking-tight text-ink first-letter:uppercase sm:text-xl sm:leading-7">
            {formatFullDate(date)}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] leading-5 text-ink-muted">
            {period === undefined ? null : <span>{period ? `Período ${period.code} · Semana ${period.week}` : 'Fuera de los períodos'}</span>}
            {holiday ? <span className="font-medium text-warning">Feriado: {holiday.reason}</span> : null}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 max-lg:w-full">
        <WeekStrip date={date} today={today} load={load} onPick={onPick} />
        <Button className="h-11 sm:h-10" disabled={date === today} onClick={() => onPick(today)}>
          Hoy
        </Button>
        <CalendarPicker date={date} today={today} onPick={onPick} />
      </div>
    </div>
  );
}
