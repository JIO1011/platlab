import type { WorkResult } from '@platlab/contracts';
import { countText, daysBetween, formatDate } from '../../app/format';

/**
 * Plazos de Mantenimiento (ADR 0020), calculados al consultar: todas las fechas son días civiles AAAA-MM-DD
 * en la zona del espacio y se comparan sin horas.
 */

/** Lo que basta para ubicar un trabajo: su fecha y el resultado del último registro de su plan. */
interface DueEntry {
  dueOn: string;
  lastResult: WorkResult | null;
}

export type DueGroup = 'overdue' | 'upcoming';

const groupLabels: Record<DueGroup, string> = {
  overdue: 'Atrasados',
  upcoming: 'Próximos 30 días',
};

/**
 * El grupo de «Por hacer»; null si toca después de 30 días. Atrasados reúne lo vencido y lo No conforme, sea cual sea
 * su fecha; Próximos 30 días, de hoy a dentro de 30 días.
 */
export function dueGroup(entry: DueEntry, today: string): DueGroup | null {
  if (entry.lastResult === 'fail') return 'overdue';
  const days = daysBetween(today, entry.dueOn);
  if (days < 0) return 'overdue';
  return days <= 30 ? 'upcoming' : null;
}

/** «Por hacer» agrupado en su orden, sin grupos vacíos; dentro de cada uno se conserva el orden recibido. */
export function groupDue<T extends DueEntry>(items: T[], today: string): Array<{ group: DueGroup; label: string; items: T[] }> {
  return (Object.keys(groupLabels) as DueGroup[])
    .map((group) => ({ group, label: groupLabels[group], items: items.filter((item) => dueGroup(item, today) === group) }))
    .filter((entry) => entry.items.length > 0);
}

/**
 * Los primeros `limit` trabajos de «Por hacer» (el Resumen muestra cinco): los atrasados primero y, dentro de cada
 * grupo, el orden recibido, que el servidor da por fecha.
 */
export function firstDue<T extends DueEntry>(items: T[], today: string, limit: number): T[] {
  return groupDue(items, today)
    .flatMap((entry) => entry.items)
    .slice(0, limit);
}

/** El plazo en palabras: «Vence hoy», «hace 3 días», «en 1 día». */
export function dueText(dueOn: string, today: string): string {
  const days = daysBetween(today, dueOn);
  if (days === 0) return 'Vence hoy';
  return days < 0 ? `hace ${countText(-days, 'día', 'días')}` : `en ${countText(days, 'día', 'días')}`;
}

/** Qué tan a tiempo se hizo un trabajo (M-01c): «Tocaba el 12 nov 2026 · hecho a tiempo» o «… · hecho 3 días después». */
export function doneText(dueOn: string, performedOn: string): string {
  const late = daysBetween(dueOn, performedOn);
  return `Tocaba el ${formatDate(dueOn)} · ${late <= 0 ? 'hecho a tiempo' : `hecho ${countText(late, 'día', 'días')} después`}`;
}

/**
 * La fecha y el estado de un trabajo, en palabras (ADR 0020). Un no conforme se cuenta desde su registro, no
 * desde la próxima fecha, que ya avanzó, y pide repetirse: «Repetir · no conforme hace 3 días». Lo demás, por su próxima fecha:
 * «Atrasado · hace 3 días», «Vence hoy», «en 12 días».
 */
export function workStatus(
  entry: { dueOn: string; lastResult: WorkResult | null; lastPerformedOn: string | null },
  today: string,
): { date: string; text: string } {
  if (entry.lastResult === 'fail') {
    if (!entry.lastPerformedOn) return { date: entry.dueOn, text: 'Repetir · no conforme' };
    const ago = -daysBetween(today, entry.lastPerformedOn);
    return { date: entry.lastPerformedOn, text: `Repetir · no conforme ${ago === 0 ? 'hoy' : `hace ${countText(ago, 'día', 'días')}`}` };
  }
  const days = daysBetween(today, entry.dueOn);
  return { date: entry.dueOn, text: days < 0 ? `Atrasado · ${dueText(entry.dueOn, today)}` : dueText(entry.dueOn, today) };
}

export type DueTone = 'danger' | 'warning' | 'success' | 'neutral';

/** Semáforo: rojo vencido o no conforme, ámbar hasta 30 días, verde después y neutro sin plan (null). */
export function dueTone(entry: DueEntry | null, today: string): DueTone {
  if (!entry) return 'neutral';
  if (entry.lastResult === 'fail') return 'danger';
  const days = daysBetween(today, entry.dueOn);
  if (days < 0) return 'danger';
  return days <= 30 ? 'warning' : 'success';
}
