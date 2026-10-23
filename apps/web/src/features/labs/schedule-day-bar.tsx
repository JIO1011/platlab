import type { Closure } from '@platlab/contracts';
import { Button, Tooltip } from '@platlab/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '../../app/format';
import { iconAction } from '../../app/glass';
import { CalendarPicker } from './schedule-calendar';

/**
 * Lo que la cabecera dice del día, pequeño bajo «Cronograma» (ADR 0023): su período y semana, o que cae fuera de los
 * períodos, y el feriado si lo es. Nada mientras carga el período.
 */
export function DayDetail({ period, holiday }: { period: { code: string; week: number } | null | undefined; holiday: Closure | null }) {
  if (period === undefined && !holiday) return null;
  return (
    <>
      <span>{period === undefined ? null : period ? `Período ${period.code} · semana ${period.week}` : 'Fuera de los períodos'}</span>
      {holiday ? <span className="font-medium text-warning">Feriado: {holiday.reason}</span> : null}
      <span aria-hidden>·</span>
    </>
  );
}

/**
 * Los controles del día, a la derecha de la cabecera: ‹ Hoy › y la fecha, que abre el calendario del mes con la carga de
 * cada día. No guarda nada: el día vive en la URL.
 */
export function DayControls({ date, today, onPick }: { date: string; today: string; onPick: (date: string) => void }) {
  return (
    <div role="group" aria-label="Día del cronograma" className="flex flex-wrap items-center gap-2">
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
  );
}
