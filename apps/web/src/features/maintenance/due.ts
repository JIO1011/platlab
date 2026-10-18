import type { WorkResult } from '@platlab/contracts';

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

export type DueGroup = 'nonconforming' | 'overdue' | 'week' | 'month';

const groupLabels: Record<DueGroup, string> = {
  nonconforming: 'No conformes',
  overdue: 'Vencidos',
  week: 'Próximos 7 días',
  month: 'De 8 a 30 días',
};

/** El grupo de «Por hacer»; null si toca después de 30 días. Un no conforme va primero, sea cual sea su fecha. */
export function dueGroup(entry: DueEntry, today: string): DueGroup | null {
  if (entry.lastResult === 'fail') return 'nonconforming';
  const days = daysUntil(entry.dueOn, today);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'week';
  return days <= 30 ? 'month' : null;
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

export type DueTone = 'danger' | 'warning' | 'success' | 'neutral';

/** Semáforo: rojo vencido o no conforme, ámbar hasta 30 días, verde después y neutro sin plan (null). */
export function dueTone(entry: DueEntry | null, today: string): DueTone {
  if (!entry) return 'neutral';
  if (entry.lastResult === 'fail') return 'danger';
  const days = daysUntil(entry.dueOn, today);
  if (days < 0) return 'danger';
  return days <= 30 ? 'warning' : 'success';
}
