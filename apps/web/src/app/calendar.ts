import { isoWeekday } from '@platlab/contracts';
import { addDays } from './format';

/**
 * El calendario del espacio (ADR 0023 y 0026): días AAAA-MM-DD, semanas de lunes a domingo y meses AAAA-MM, sin hora ni
 * zona que convertir; la hora de «ahora», en la zona del espacio. Los usan el Cronograma y el Inicio.
 */

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

/** El día de la URL si es una fecha real AAAA-MM-DD; si no, nulo. */
export function parseDay(value: string | null): string | null {
  if (!value || !dayPattern.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

/** Los siete días de la semana de `date`, del lunes al domingo. */
export function weekDates(date: string): string[] {
  const monday = addDays(date, 1 - isoWeekday(date));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/** Las semanas que cubre un mes (`AAAA-MM`), de lunes a domingo: las que hacen falta, entre 4 y 6. */
export function monthWeeks(month: string): string[][] {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const weeks: string[][] = [];
  for (let monday = weekDates(first)[0]!; monday <= last; monday = addDays(monday, 7)) weeks.push(weekDates(monday));
  return weeks;
}

/** El mes `AAAA-MM` que está `delta` meses antes o después de `month`. */
export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (number ?? 1) - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** La hora del día en la zona del espacio de trabajo, en minutos desde la medianoche: la línea de «ahora». */
export function nowMinutes(now: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now));
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return part('hour') * 60 + part('minute');
}
