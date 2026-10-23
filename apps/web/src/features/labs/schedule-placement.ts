import {
  scheduleProblemText,
  type Activity,
  type Closure,
  type Period,
  type RequestSummary,
  type ScheduleCheck,
  type ScheduleContext,
  type ScheduleSlot,
  type Space,
} from '@platlab/contracts';
import { blockText, capacityWarning, timeText, toMinutes, type DayRange } from './schedule-grid';

/**
 * La lógica pura de programar y mover bloques (ADR 0023, L-01c): de la posición del puntero a una hora, el contexto de
 * `scheduleCheck` con los datos ya cargados y lo que la bandeja «Por programar» muestra y ordena. La pantalla solo
 * dibuja; el servidor decide con los datos bajo bloqueo.
 */

/** El paso de la hora al arrastrar y al escribirla: 15 minutos. */
const SNAP_MINUTES = 15;

/** La hora más tarde que se puede escribir como fin (23:59). */
const LAST_MINUTE = 23 * 60 + 59;

/** Redondea unos minutos al paso más cercano. */
export function snapTo(minutes: number, step: number = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

/**
 * La hora de inicio que corresponde a un punto de la columna: `offset` px bajo su borde superior, de `height` px, que
 * cubre `range`. Encaja a 15 min y deja el bloque dentro del rango del día (`duration` minutos de largo).
 */
export function startAtOffset({ offset, height, range, duration }: { offset: number; height: number; range: DayRange; duration: number }): number {
  const raw = range.start + (offset / Math.max(height, 1)) * (range.end - range.start);
  const latest = Math.max(range.start, snapTo(range.end - duration));
  return Math.min(Math.max(snapTo(raw), range.start), latest);
}

/** Cuántos minutos dura el horario pedido; nulo si la solicitud no lo trae completo. */
export function durationOf(request: Pick<RequestSummary, 'startsAt' | 'endsAt'>): number | null {
  if (!request.startsAt || !request.endsAt) return null;
  const minutes = toMinutes(request.endsAt) - toMinutes(request.startsAt);
  return minutes > 0 ? minutes : null;
}

/** La hora de fin de un bloque que empieza en `start` y dura `duration`, sin pasar de las 23:59. */
export function endFor(start: number, duration: number): number {
  return Math.min(start + duration, LAST_MINUTE);
}

/** El horario de un bloque que empieza en `start` (minutos) y dura `duration`. */
export function slotAt(date: string, start: number, duration: number): ScheduleSlot {
  return { date, startsAt: timeText(start), endsAt: timeText(endFor(start, duration)) };
}

/** Lo que `scheduleCheck` necesita de un área ese día, con los datos cargados (nunca una consulta aparte). */
export function contextFor({
  today,
  participants,
  space,
  periods,
  closures,
  activities,
  date,
  ignoreId,
}: {
  today: string;
  participants: number;
  space: Pick<Space, 'areaId' | 'capacity' | 'weeklyHours'>;
  periods: readonly Period[];
  closures: readonly Closure[];
  activities: readonly Activity[];
  date: string;
  /** El bloque que se mueve: no choca consigo mismo. */
  ignoreId?: string | undefined;
}): ScheduleContext {
  return {
    today,
    participants,
    space,
    periods: periods.filter((period) => period.archivedAt === null),
    closures: closures.filter((closure) => closure.voidedAt === null && (closure.areaId === null || closure.areaId === space.areaId)),
    others: activities.filter((item) => item.date === date && item.areaId === space.areaId && item.id !== ignoreId),
  };
}

/** Los motivos que impiden programar, en el orden en que se explican. */
export function blockingTexts(check: ScheduleCheck): string[] {
  return check.blocking.map((problem) => scheduleProblemText[problem]);
}

/** «Supera el aforo (30 / 24)» si hay aviso de aforo; nulo si no. */
export function capacityText(check: ScheduleCheck, participants: number, capacity: number): string | null {
  return check.warnings.includes('capacity') ? capacityWarning(participants, capacity) : null;
}

/** Lo que se dice de un lugar mientras se arrastra: «Libre», o el primer motivo que lo impide. */
export function previewText(check: ScheduleCheck): string {
  return check.blocking.length > 0 ? blockingTexts(check)[0]! : 'Libre';
}

/** «Materia - Carrera - Docente» de una solicitud por programar: el mismo texto que tendrá su bloque. */
export function requestBlockText(request: Pick<RequestSummary, 'code' | 'title' | 'subject' | 'group' | 'requesterName'>): string {
  return blockText({ ...request, title: request.title ?? request.code });
}

/** Las fechas de la solicitud que aún no tienen bloque, en orden. */
export function pendingDates(request: Pick<RequestSummary, 'dates' | 'scheduledDates'>): string[] {
  const scheduled = new Set(request.scheduledDates);
  return request.dates.filter((date) => !scheduled.has(date)).sort();
}

/** Si la solicitud espera que la programen: enviada y con fechas sin bloque. */
export function isToSchedule(item: Pick<RequestSummary, 'status' | 'dateCount' | 'scheduledCount'>): boolean {
  return item.status === 'submitted' && item.scheduledCount < item.dateCount;
}

/**
 * La bandeja «Por programar», lo urgente primero: fuera de plazo, luego con recursos que faltan y, a igual urgencia, la
 * primera fecha pendiente más próxima. Conserva el orden del servidor entre iguales.
 */
export function toScheduleOrder(items: readonly RequestSummary[]): RequestSummary[] {
  const rank = (item: RequestSummary) => (item.late ? 0 : item.exceptions > 0 ? 1 : 2);
  const nextDate = (item: RequestSummary) => pendingDates(item)[0] ?? '9999';
  return items
    .filter((item) => isToSchedule(item))
    .map((item, index) => ({ item, index, next: nextDate(item) }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.next.localeCompare(b.next) || a.index - b.index)
    .map(({ item }) => item);
}

/** «lun 9 nov»: la fecha de una tarjeta de la bandeja. */
export function shortDateText(date: string): string {
  return new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)).replace(',', '');
}

/** Una fecha por programar de una solicitud: lo que dibuja una tarjeta de la bandeja. */
export interface PendingCard {
  request: RequestSummary;
  date: string;
}

/**
 * Las tarjetas de la bandeja, una por fecha pendiente: primero las del día que se ve (para arrastrarlas a la tabla) y,
 * después, las de otros días; dentro de cada grupo, el orden de urgencia de `items` (ya ordenado por `toScheduleOrder`).
 */
export function pendingCards(items: readonly RequestSummary[], visible: string): PendingCard[] {
  const cards = items.flatMap((request) => pendingDates(request).map((date) => ({ request, date })));
  return [...cards.filter((card) => card.date === visible), ...cards.filter((card) => card.date !== visible)];
}

/** «lun 9 nov · 08:00–10:00»: cuándo se pidió la fecha; sin horario completo, solo la fecha. */
export function cardWhenText({ request, date }: PendingCard): string {
  return request.startsAt && request.endsAt ? `${shortDateText(date)} · ${request.startsAt}–${request.endsAt}` : shortDateText(date);
}

/** Lo que se avisa tras programar o mover: «P1-S12-QUI01 programado» y, si procede, el aforo. */
export function scheduledMessage(code: string, verb: 'programado' | 'movido', warnings: readonly string[], participants: number, capacity: number | undefined): { title: string; description?: string } {
  const title = `${code} ${verb}`;
  return warnings.includes('capacity') && capacity !== undefined ? { title, description: capacityWarning(participants, capacity) } : { title };
}
