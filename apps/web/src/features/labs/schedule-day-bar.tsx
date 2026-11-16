import type { Closure } from '@platlab/contracts';
import { Button, Tooltip, cn } from '@platlab/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { addDays, countText, formatFullDate, formatWeekday } from '../../app/format';
import { CalendarPicker } from './schedule-calendar';
import { weekCaption, weekDates } from './schedule-grid';
import { softCard } from './style';

/**
 * La semana del día elegido, de lunes a domingo, en una fila de días para saltar a otro con un clic: «Lun 16» y, si tiene
 * bloques, su cifra en una pastilla pequeña. El elegido va relleno con el acento; hoy lleva además un punto (y «hoy» en su
 * nombre accesible). En el móvil se desplaza en horizontal y deja a la vista el día elegido.
 */
function WeekStrip({ date, today, load, onPick }: { date: string; today: string; load: Record<string, number> | null; onPick: (date: string) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = strip.current;
    const selected = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (box && selected) box.scrollLeft = selected.offsetLeft - (box.clientWidth - selected.offsetWidth) / 2;
  }, [date]);
  return (
    <div ref={strip} role="group" aria-label="Semana" className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain lg:flex-none">
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
              'relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-control px-3 text-[13px] leading-5 whitespace-nowrap transition-colors sm:h-9',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action',
              selected ? 'bg-action font-semibold text-on-action' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
            )}
          >
            <span className="first-letter:uppercase">{formatWeekday(day, 'short').replace('.', '')}</span>
            <span className={cn('font-mono font-semibold tabular-nums', !selected && 'text-ink')}>{Number(day.slice(8))}</span>
            {count ? (
              <span aria-hidden className={cn('min-w-4 rounded-[5px] px-1 text-center font-mono text-[11px] font-semibold leading-4 tabular-nums', selected ? 'bg-ink/15' : 'bg-surface-sunken text-ink-muted')}>
                {count}
              </span>
            ) : null}
            {day === today ? <span aria-hidden className={cn('absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full', selected ? 'bg-on-action' : 'bg-action-deep')} /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Los pasos del día en un solo grupo, ‹ Hoy ›: anterior, volver a hoy (solo activo si no se está en hoy) y siguiente. */
function DayStepper({ date, today, onPick }: { date: string; today: string; onPick: (date: string) => void }) {
  const step = 'h-11 rounded-none border-0 bg-white/80 text-ink hover:bg-white sm:h-9';
  return (
    <div className="flex shrink-0 divide-x divide-line-strong overflow-hidden rounded-control border border-line-strong">
      <Tooltip label="Día anterior">
        <Button size="icon" className={cn(step, 'w-11 sm:w-9')} aria-label="Día anterior" onClick={() => onPick(addDays(date, -1))}>
          <ChevronLeft aria-hidden />
        </Button>
      </Tooltip>
      <Button className={cn(step, 'px-3.5 font-semibold')} disabled={date === today} onClick={() => onPick(today)}>
        Hoy
      </Button>
      <Tooltip label="Día siguiente">
        <Button size="icon" className={cn(step, 'w-11 sm:w-9')} aria-label="Día siguiente" onClick={() => onPick(addDays(date, 1))}>
          <ChevronRight aria-hidden />
        </Button>
      </Tooltip>
    </div>
  );
}

/**
 * La barra del día del Cronograma, una sola franja (ADR 0023; forma decidida el 15-11-2026 sobre una captura): a la
 * izquierda ‹ Hoy › y «Noviembre de 2026 · P1 · Semana 11 (Hoy)» (y el feriado, con texto, si lo es); a la derecha, la
 * semana para saltar de día, con la cifra de bloques de cada día, y el calendario del mes. La fecha completa va en el
 * encabezado para el lector de pantalla y en el día elegido de la semana. En el móvil son dos filas. No guarda nada: el
 * día vive en la URL.
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
  const caption = weekCaption(date, today, period);
  return (
    <div role="group" aria-label="Día del cronograma" className={cn(softCard, 'flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-3 py-2')}>
      <div className="flex min-w-0 items-center gap-3">
        <DayStepper date={date} today={today} onPick={onPick} />
        <h2 aria-live="polite" className="sr-only">
          {formatFullDate(date)}
        </h2>
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[13px] leading-5">
          <span className="font-semibold text-ink">{caption.month}</span>
          {caption.week ? <span className="text-ink-muted">{caption.week}</span> : null}
          {holiday ? <span className="font-medium text-warning">Feriado: {holiday.reason}</span> : null}
        </p>
      </div>
      <div className="flex min-w-0 items-center gap-1 max-lg:w-full">
        <WeekStrip date={date} today={today} load={load} onPick={onPick} />
        <CalendarPicker date={date} today={today} onPick={onPick} />
      </div>
    </div>
  );
}
