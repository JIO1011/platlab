import type { WorkResult } from '@platlab/contracts';
import { formatDate } from '../../app/format';

/**
 * Plazos de Mantenimiento (ADR 0020), calculados al consultar: todas las fechas son días civiles AAAA-MM-DD
 * en la zona del espacio y se comparan sin horas.
 */

/** Lo que basta para ubicar un trabajo: su fecha y el resultado del último registro de su plan. */
interface DueEntry {
  dueOn: string;
  lastResult: WorkResult | null;
}

/** Hoy en la zona del espacio, AAAA-MM-DD; `now` en milisegundos. */
export function todayInZone(timeZone: string, now: number): string {
  // en-CA escribe AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

/** Días civiles de `today` a `dueOn`: negativo si ya pasó. */
export function daysUntil(dueOn: string, today: string): number {
  const utc = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  };
  return Math.round((utc(dueOn) - utc(today)) / 86_400_000);
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
  const days = daysUntil(entry.dueOn, today);
  if (days < 0) return 'overdue';
  return days <= 30 ? 'upcoming' : null;
}

/** «Por hacer» agrupado en su orden, sin grupos vacíos; dentro de cada uno se conserva el orden recibido. */
export function groupDue<T extends DueEntry>(items: T[], today: string): Array<{ group: DueGroup; label: string; items: T[] }> {
  return (Object.keys(groupLabels) as DueGroup[])
    .map((group) => ({ group, label: groupLabels[group], items: items.filter((item) => dueGroup(item, today) === group) }))
    .filter((entry) => entry.items.length > 0);
}

/** El plazo en palabras: «Vence hoy», «hace 3 días», «en 1 día». */
export function dueText(dueOn: string, today: string): string {
  const days = daysUntil(dueOn, today);
  const span = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
  if (days === 0) return 'Vence hoy';
  return days < 0 ? `hace ${span(-days)}` : `en ${span(days)}`;
}

/** Qué tan a tiempo se hizo un trabajo (M-01c): «Tocaba el 12 nov 2026 · hecho a tiempo» o «… · hecho 3 días después». */
export function doneText(dueOn: string, performedOn: string): string {
  const late = daysUntil(performedOn, dueOn);
  return `Tocaba el ${formatDate(dueOn)} · ${late <= 0 ? 'hecho a tiempo' : `hecho ${late} ${late === 1 ? 'día' : 'días'} después`}`;
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
    const ago = -daysUntil(entry.lastPerformedOn, today);
    return { date: entry.lastPerformedOn, text: `Repetir · no conforme ${ago === 0 ? 'hoy' : `hace ${ago} ${ago === 1 ? 'día' : 'días'}`}` };
  }
  const days = daysUntil(entry.dueOn, today);
  return { date: entry.dueOn, text: days < 0 ? `Atrasado · ${dueText(entry.dueOn, today)}` : dueText(entry.dueOn, today) };
}

export type DueTone = 'danger' | 'warning' | 'success' | 'neutral';

/** Semáforo: rojo vencido o no conforme, ámbar hasta 30 días, verde después y neutro sin plan (null). */
export function dueTone(entry: DueEntry | null, today: string): DueTone {
  if (!entry) return 'neutral';
  if (entry.lastResult === 'fail') return 'danger';
  const days = daysUntil(entry.dueOn, today);
  if (days < 0) return 'danger';
  return days <= 30 ? 'warning' : 'success';
}
