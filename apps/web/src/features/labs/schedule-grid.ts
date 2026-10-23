import { isoWeekday, periodWeek, scheduleProblemText, type Activity, type Closure, type Period, type Space } from '@platlab/contracts';
import { addDays } from '../../app/format';

/**
 * La lógica pura de la tabla del Cronograma (ADR 0023): qué áreas y qué horas muestra un día, dónde cae cada bloque y
 * qué parte de cada área está cerrada. Las horas son minutos desde la medianoche y las posiciones, porcentajes del
 * rango del día; la pantalla solo los dibuja.
 */

/** De `from` a `to` (fin excluido), en minutos desde la medianoche. */
export interface Span {
  from: number;
  to: number;
}

/** Lo que se ve de un día: de la primera hora entera abierta a la última, en minutos. */
export interface DayRange {
  start: number;
  end: number;
}

/** Lo cerrado de un área ese día, con el motivo que se muestra. */
export interface ClosedSpan extends Span {
  reason: string;
}

export const dayClosedText = 'Cerrada este día';

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** «08:00» para una hora en minutos. */
export function timeText(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

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

/** El período activo que contiene la fecha, con su semana contada desde su inicio. */
export function periodOn(periods: readonly Period[], date: string): { code: string; week: number } | null {
  const found = periods.find((period) => period.archivedAt === null && period.startsOn <= date && date <= period.endsOn);
  return found ? { code: found.code, week: periodWeek(found.startsOn, date) } : null;
}

// ---------------------------------------------------------------------------
// Áreas y bloques del día
// ---------------------------------------------------------------------------

/** Los bloques de una fecha. */
export function activitiesOn(items: readonly Activity[], date: string): Activity[] {
  return items.filter((item) => item.date === date);
}

/** Cuántos bloques tiene cada fecha dada, con cero para las libres. */
export function loadByDay(items: readonly Activity[], dates: readonly string[]): Record<string, number> {
  const load: Record<string, number> = Object.fromEntries(dates.map((date) => [date, 0]));
  for (const item of items) if (item.date in load) load[item.date] = (load[item.date] ?? 0) + 1;
  return load;
}

/** Las áreas del día: las habilitadas y, aunque se hayan archivado después, las que aún tienen un bloque ese día. */
export function areasOfDay(spaces: readonly Space[], dayItems: readonly Activity[]): Space[] {
  return spaces.filter((space) => (space.archivedAt === null && !space.areaArchived) || dayItems.some((item) => item.areaId === space.areaId));
}

/** Los bloques de un área, por hora de inicio. */
export function activitiesOfArea(dayItems: readonly Activity[], areaId: string): Activity[] {
  return dayItems.filter((item) => item.areaId === areaId).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Las franjas abiertas del área ese día, según su horario semanal. */
export function openSlots(space: Pick<Space, 'weeklyHours'>, date: string): Span[] {
  return space.weeklyHours[String(isoWeekday(date)) as keyof Space['weeklyHours']].map((slot) => ({ from: toMinutes(slot.opens), to: toMinutes(slot.closes) }));
}

/** Los cierres vigentes que tocan al área ese día: los suyos y los feriados comunes. */
function closuresOn(closures: readonly Closure[], date: string, areaId: string): Closure[] {
  return closures.filter((closure) => closure.voidedAt === null && (closure.areaId === null || closure.areaId === areaId) && closure.startsOn <= date && date <= closure.endsOn);
}

/** El feriado común de la fecha, si lo hay. */
export function holidayOn(closures: readonly Closure[], date: string): Closure | null {
  return closures.find((closure) => closure.voidedAt === null && closure.areaId === null && closure.startsOn <= date && date <= closure.endsOn) ?? null;
}

/** Por qué el área no atiende en todo el día: el motivo del cierre o feriado, o que su horario no abre ese día. */
export function closedAllDay(space: Space, date: string, closures: readonly Closure[]): string | null {
  const closure = closuresOn(closures, date, space.areaId)[0];
  if (closure) return closure.reason;
  return openSlots(space, date).length === 0 ? dayClosedText : null;
}

/** Lo que dura cada fila de la tabla: media hora. */
export const ROW_MINUTES = 30;

/** Las filas fijas de la tabla: de 07:00 a 19:00, como la planilla que se usa. */
const BOARD_START = 7 * 60;
const BOARD_END = 19 * 60;

/**
 * Lo que se ve de un día: siempre de 07:00 a 19:00, ampliado a la media hora de cualquier bloque que quedó fuera (por
 * ejemplo, tras cambiar el horario de un área), para que ningún bloque se esconda.
 */
export function boardRange(dayItems: readonly Pick<Activity, 'startsAt' | 'endsAt'>[]): DayRange {
  const spans = dayItems.map(blockSpan);
  const earliest = Math.min(BOARD_START, ...spans.map((span) => Math.floor(span.from / ROW_MINUTES) * ROW_MINUTES));
  const latest = Math.max(BOARD_END, ...spans.map((span) => Math.ceil(span.to / ROW_MINUTES) * ROW_MINUTES));
  return { start: earliest, end: latest };
}

/** Lo cerrado del área dentro del rango del día: todo el rango si hay cierre o feriado, o lo que su horario deja fuera. */
export function closedSpans(space: Space, date: string, range: DayRange, closures: readonly Closure[]): ClosedSpan[] {
  const whole = closedAllDay(space, date, closures);
  if (whole) return [{ from: range.start, to: range.end, reason: whole }];
  const spans: ClosedSpan[] = [];
  let cursor = range.start;
  for (const slot of openSlots(space, date)) {
    if (slot.from > cursor) spans.push({ from: cursor, to: slot.from, reason: scheduleProblemText.hours });
    cursor = Math.max(cursor, slot.to);
  }
  if (cursor < range.end) spans.push({ from: cursor, to: range.end, reason: scheduleProblemText.hours });
  return spans;
}

// ---------------------------------------------------------------------------
// Posiciones
// ---------------------------------------------------------------------------

/** Dónde cae un tramo en la columna del día: su arranque y su alto, en porcentaje del rango. */
export function placement(span: Span, range: DayRange): { top: number; height: number } {
  const total = range.end - range.start;
  const from = Math.max(span.from, range.start);
  const to = Math.min(span.to, range.end);
  return { top: ((from - range.start) / total) * 100, height: (Math.max(to - from, 0) / total) * 100 };
}

/** El tramo que ocupa un bloque. */
export function blockSpan(block: Pick<Activity, 'startsAt' | 'endsAt'>): Span {
  return { from: toMinutes(block.startsAt), to: toMinutes(block.endsAt) };
}

/** El inicio de cada fila (media hora) del rango: las filas y los rótulos del eje. */
export function rowStarts(range: DayRange): number[] {
  return Array.from({ length: (range.end - range.start) / ROW_MINUTES }, (_, index) => range.start + index * ROW_MINUTES);
}

// ---------------------------------------------------------------------------
// Texto de un bloque
// ---------------------------------------------------------------------------

/**
 * Lo que dice un bloque: «Materia - Carrera - Docente». Sin materia, el título de la solicitud; sin carrera, se omite.
 * Sirve igual a un bloque de la tabla y a una solicitud por programar.
 */
export function blockText(block: Pick<Activity, 'title' | 'subject' | 'group' | 'requesterName'>): string {
  return [block.subject || block.title, block.group, block.requesterName].filter(Boolean).join(' - ');
}

/** «Supera el aforo (30 / 24)»: el aviso de aforo, que solo avisa. */
export function capacityWarning(participants: number, capacity: number): string {
  return `Supera el aforo (${participants} / ${capacity})`;
}

/** El aforo se supera (solo avisa): «⚠ 30 / 24». */
export function overCapacity(block: Pick<Activity, 'participants'>, space: Pick<Space, 'capacity'>): boolean {
  return block.participants > space.capacity;
}

/** Lo que un bloque guarda para el nombre accesible y el tooltip: hora, código, responsable y, si procede, el aforo. */
export function activityDetails(block: Activity, space?: Pick<Space, 'capacity'>): string[] {
  return [
    `${block.startsAt}–${block.endsAt} · ${block.code}`,
    `Responsable: ${block.responsibleName}`,
    ...(space && overCapacity(block, space) ? [capacityWarning(block.participants, space.capacity)] : []),
  ];
}

/** Lo que un lector de pantalla oye de un bloque: su texto, hora, código, responsable y aforo si se supera. */
export function activityLabel(block: Activity, space?: Pick<Space, 'capacity'>): string {
  return [blockText(block), ...activityDetails(block, space)].join(', ');
}
