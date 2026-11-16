import type { Closure } from '@platlab/contracts';
import { Button, Tooltip, cn } from '@platlab/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { addDays, countText, formatFullDate, formatWeekday } from '../../app/format';
import { CalendarPicker } from './schedule-calendar';
import { daySummary, loadText, weekDates } from './schedule-grid';
import { softCard } from './style';

/**
 * La semana del día elegido, de lunes a domingo, para saltar a otro día de ella con un clic: el día abreviado, su número y,
 * en pequeño, «N blq» o «–». El elegido va relleno con el acento; hoy lleva además un punto (y «hoy» en su nombre
 * accesible). En el móvil se desplaza en horizontal y deja a la vista el día elegido.
 */
function WeekStrip({ date, today, load, onPick }: { date: string; today: string; load: Record<string, number> | null; onPick: (date: string) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = strip.current;
    const selected = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (box && selected) box.scrollLeft = selected.offsetLeft - (box.clientWidth - selected.offsetWidth) / 2;
  }, [date]);
  return (
    <div ref={strip} role="group" aria-label="Semana" className="relative flex min-w-0 flex-1 gap-0.5 overflow-x-auto overscroll-x-contain rounded-control bg-surface-sunken p-0.5 lg:flex-none">
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
              'relative grid h-12 w-14 shrink-0 content-center justify-items-center rounded-control text-ink whitespace-nowrap transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
              selected ? 'bg-action text-on-action' : 'hover:bg-surface',
            )}
          >
            <span className="text-[11px] font-medium leading-4 first-letter:uppercase">{formatWeekday(day, 'short').replace('.', '')}</span>
            <span className="text-sm font-bold leading-4 tabular-nums">{Number(day.slice(8))}</span>
            <span aria-hidden className={cn('font-mono text-[10px] leading-3 tabular-nums', selected ? 'text-on-action' : 'text-ink-muted')}>
              {count === undefined ? '' : loadText(count)}
            </span>
            {day === today ? <span aria-hidden className={cn('absolute right-1.5 top-1.5 size-1.5 rounded-full', selected ? 'bg-on-action' : 'bg-action-deep')} /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Los pasos del día en un solo grupo, ‹ Hoy ›: anterior, volver a hoy (solo activo si no se está en hoy) y siguiente. */
function DayStepper({ date, today, onPick }: { date: string; today: string; onPick: (date: string) => void }) {
  const step = 'h-11 rounded-none border-0 bg-white/80 text-ink hover:bg-white sm:h-10';
  return (
    <div className="flex shrink-0 divide-x divide-line-strong overflow-hidden rounded-control border border-line-strong">
      <Tooltip label="Día anterior">
        <Button size="icon" className={cn(step, 'w-11 sm:w-10')} aria-label="Día anterior" onClick={() => onPick(addDays(date, -1))}>
          <ChevronLeft aria-hidden />
        </Button>
      </Tooltip>
      <Button className={cn(step, 'px-4')} disabled={date === today} onClick={() => onPick(today)}>
        Hoy
      </Button>
      <Tooltip label="Día siguiente">
        <Button size="icon" className={cn(step, 'w-11 sm:w-10')} aria-label="Día siguiente" onClick={() => onPick(addDays(date, 1))}>
          <ChevronRight aria-hidden />
        </Button>
      </Tooltip>
    </div>
  );
}

/**
 * La barra del día del Cronograma, una sola franja (ADR 0023; forma decidida el 14-11-2026): a la izquierda ‹ Hoy ›, la
 * fecha completa en grande y, debajo, «Período P1 · Semana 11 · 7 bloques programados» (y el feriado, con texto, si lo
 * es); a la derecha, la semana para saltar de día y el calendario del mes con la carga de cada día. En el móvil son dos
 * filas: la fecha con ‹ Hoy › y, debajo, la semana desplazable con el calendario. No guarda nada: el día vive en la URL.
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
    <div role="group" aria-label="Día del cronograma" className={cn(softCard, 'flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-2.5 sm:px-5')}>
      <div className="flex min-w-0 items-center gap-3">
        <DayStepper date={date} today={today} onPick={onPick} />
        <div className="min-w-0">
          <h2 aria-live="polite" className="text-lg font-bold leading-6 tracking-tight text-ink first-letter:uppercase sm:text-xl sm:leading-7">
            {formatFullDate(date)}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] leading-5 text-ink-muted">
            <span>{daySummary(period, load?.[date])}</span>
            {holiday ? <span className="font-medium text-warning">Feriado: {holiday.reason}</span> : null}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 max-lg:w-full">
        <WeekStrip date={date} today={today} load={load} onPick={onPick} />
        <CalendarPicker date={date} today={today} onPick={onPick} />
      </div>
    </div>
  );
}
