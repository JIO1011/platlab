import { toMinutes, type AgendaArea, type AgendaItem, type AgendaStatus } from '@platlab/contracts';
import { countText } from '../../app/format';

/**
 * La lógica pura de «Tareas» en el Inicio (ADR 0026): la franja de Actividad, el estado de cada actividad y los tramos del
 * Calendario. Las horas son minutos desde la medianoche y las posiciones, porcentajes de la franja; la pantalla solo dibuja.
 */

/** De dónde a dónde va la franja, en minutos. */
export interface TimeRange {
  start: number;
  end: number;
}

/** La jornada que se ve aunque el día esté vacío, como en el Cronograma. */
const DEFAULT_RANGE: TimeRange = { start: 7 * 60, end: 19 * 60 };

/** Lo que tiene hora; lo demás va en «Todo el día». */
export const timed = (items: readonly AgendaItem[]) => items.filter((item) => item.startsAt !== null && item.endsAt !== null);
export const allDay = (items: readonly AgendaItem[]) => items.filter((item) => item.startsAt === null || item.endsAt === null);

const spanOf = (item: AgendaItem) => ({ from: toMinutes(item.startsAt ?? '00:00'), to: toMinutes(item.endsAt ?? '00:00') });

/** De 07:00 a 19:00, ampliada a la hora en punto que haga falta para que entre todo. */
export function timeRange(items: readonly AgendaItem[]): TimeRange {
  const spans = timed(items).map(spanOf);
  return {
    start: Math.min(DEFAULT_RANGE.start, ...spans.map((span) => Math.floor(span.from / 60) * 60)),
    end: Math.max(DEFAULT_RANGE.end, ...spans.map((span) => Math.ceil(span.to / 60) * 60)),
  };
}

/** Las horas que rotula el eje: cada hora, o cada dos si la franja pasa de 12 horas. */
export function hourMarks(range: TimeRange): number[] {
  const step = range.end - range.start > 12 * 60 ? 120 : 60;
  const marks: number[] = [];
  for (let mark = range.start; mark <= range.end; mark += step) marks.push(mark);
  return marks;
}

/** Dónde cae un instante de la franja, en porcentaje desde la izquierda. */
export const offset = (minutes: number, range: TimeRange) => ((minutes - range.start) / (range.end - range.start)) * 100;

/** Una actividad con hora puesta en la franja: su carril (para que dos a la vez no se tapen) y su ancho. */
export interface Placed {
  item: AgendaItem;
  lane: number;
  left: number;
  width: number;
}

/** Reparte las actividades con hora en carriles: cada una va en el primero que ya quedó libre cuando empieza. */
export function placeTimed(items: readonly AgendaItem[], range: TimeRange): { placed: Placed[]; lanes: number } {
  const ends: number[] = [];
  const placed = timed(items)
    .map((item) => ({ item, span: spanOf(item) }))
    .sort((a, b) => a.span.from - b.span.from || a.span.to - b.span.to)
    .map(({ item, span }) => {
      let lane = ends.findIndex((end) => end <= span.from);
      if (lane === -1) lane = ends.push(span.to) - 1;
      else ends[lane] = span.to;
      const left = offset(span.from, range);
      return { item, lane, left, width: offset(span.to, range) - left };
    });
  return { placed, lanes: Math.max(1, ends.length) };
}

/** Una fila de Actividad: un área con lo de hoy; `area` null es la fila de lo que no tiene área. */
export interface AreaRow {
  area: AgendaArea | null;
  /** Lo que tiene hora, en la franja. */
  timed: AgendaItem[];
  /** Lo que no tiene hora (un mantenimiento que vence, una devolución), junto al nombre de la fila. */
  allDay: AgendaItem[];
}

/**
 * Las filas de Actividad (ADR 0026, revisión de IN-02): primero lo que no tiene área, si hay; después cada área, también
 * las libres, y al final las áreas de lo que no estaba entre ellas (un equipo guardado en un depósito).
 */
export function areaRows(areas: readonly AgendaArea[], items: readonly AgendaItem[]): AreaRow[] {
  const known = new Map(areas.map((area) => [area.id, area]));
  for (const item of items) if (item.area && !known.has(item.area.id)) known.set(item.area.id, item.area);
  const rowOf = (area: AgendaArea | null): AreaRow => {
    const own = items.filter((item) => (item.area?.id ?? null) === (area?.id ?? null));
    return { area, timed: timed(own), allDay: allDay(own) };
  };
  const loose = rowOf(null);
  const hasLoose = loose.timed.length + loose.allDay.length > 0;
  return [...(hasLoose ? [loose] : []), ...[...known.values()].map(rowOf)];
}

/**
 * Hasta qué hora está en uso un área en el minuto dado, o null si está libre: cuenta lo que no terminó y cuya franja
 * incluye ese minuto. Responde «¿qué laboratorio está libre ahora?».
 */
export function busyUntil(row: AreaRow, minutes: number): number | null {
  const ends = row.timed
    .filter((item) => item.status !== 'done')
    .map(spanOf)
    .filter((span) => span.from <= minutes && minutes < span.to)
    .map((span) => span.to);
  return ends.length > 0 ? Math.max(...ends) : null;
}

/** El estado de una actividad, en singular, y su grupo en la lista del móvil, en plural. */
export const statusText: Record<AgendaStatus, { one: string; group: string }> = {
  in_progress: { one: 'En proceso', group: 'En proceso' },
  upcoming: { one: 'Por iniciar', group: 'Por iniciar' },
  done: { one: 'Finalizada', group: 'Finalizadas' },
};

/** El orden de la lista del móvil: lo que pasa ahora, lo que viene y lo que ya terminó. */
export const statusOrder: readonly AgendaStatus[] = ['in_progress', 'upcoming', 'done'];

/** «1 en proceso · 3 por iniciar · 2 finalizadas»: solo los estados que tiene el día. */
export function statusSummary(items: readonly AgendaItem[]): string {
  const parts = statusOrder.flatMap((status) => {
    const n = items.filter((item) => item.status === status).length;
    if (n === 0) return [];
    return [status === 'done' ? countText(n, 'finalizada', 'finalizadas') : `${n} ${statusText[status].one.toLowerCase()}`];
  });
  return parts.join(' · ');
}

/** «08:00–10:00» o «Todo el día». */
export const timeLabel = (item: AgendaItem) => (item.startsAt && item.endsAt ? `${item.startsAt}–${item.endsAt}` : 'Todo el día');

/**
 * Los tramos fijos del mapa de calor (ADR 0026): 0, 1–2, 3–5, 6–9 y 10 o más, para que un mes tranquilo no parezca
 * cargado. El tramo 0 es un día vacío.
 */
export const heatTiers = [
  { level: 0, min: 0, label: '0' },
  { level: 1, min: 1, label: '1–2' },
  { level: 2, min: 3, label: '3–5' },
  { level: 3, min: 6, label: '6–9' },
  { level: 4, min: 10, label: '10 o más' },
] as const;

export type HeatLevel = (typeof heatTiers)[number]['level'];

export function heatLevel(total: number): HeatLevel {
  return [...heatTiers].reverse().find((tier) => total >= tier.min)?.level ?? 0;
}

/** «3 prácticas y 1 mantenimiento» o «Sin actividades», con el nombre que cada módulo da a sus tipos. */
export function dayContents(
  counts: ReadonlyArray<{ moduleCode: string; type: string; count: number }>,
  nounOf: (moduleCode: string, type: string) => { one: string; many: string } | undefined,
): string {
  const parts = counts.map((entry) => {
    const noun = nounOf(entry.moduleCode, entry.type) ?? { one: 'actividad', many: 'actividades' };
    return countText(entry.count, noun.one, noun.many);
  });
  if (parts.length === 0) return 'Sin actividades';
  return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)!}`;
}
