import type { WeeklyHours } from '@platlab/contracts';

/** Los siete días del horario, por su clave ISO ("1" es lunes), con su nombre y su abreviatura. */
export const days = [
  { key: '1', short: 'Lun', name: 'Lunes' },
  { key: '2', short: 'Mar', name: 'Martes' },
  { key: '3', short: 'Mié', name: 'Miércoles' },
  { key: '4', short: 'Jue', name: 'Jueves' },
  { key: '5', short: 'Vie', name: 'Viernes' },
  { key: '6', short: 'Sáb', name: 'Sábado' },
  { key: '7', short: 'Dom', name: 'Domingo' },
] as const;

export type DayKey = (typeof days)[number]['key'];

/** Lunes a viernes: los días hábiles a los que se copia el horario de un día. */
export const weekdays: readonly DayKey[] = ['1', '2', '3', '4', '5'];

/** «Lun–Jue, Sáb»: los días seguidos de un tramo van con guion y los demás, separados por comas. */
function dayRuns(indexes: number[]): string {
  const runs: number[][] = [];
  for (const index of indexes) {
    const last = runs.at(-1);
    if (last && last.at(-1) === index - 1) last.push(index);
    else runs.push([index]);
  }
  return runs
    .map((run) => (run.length === 1 ? days[run[0]!]!.short : `${days[run[0]!]!.short}–${days[run.at(-1)!]!.short}`))
    .join(', ');
}

/**
 * El horario en pocas líneas: los días con las mismas franjas se juntan, «Lun–Jue 07:00–13:00 · 14:00–19:00». Los
 * días cerrados no se nombran; sin ninguna franja, la lista queda vacía.
 */
export function hoursSummary(hours: WeeklyHours): string[] {
  const groups = new Map<string, number[]>();
  days.forEach((day, index) => {
    const slots = hours[day.key];
    if (slots.length === 0) return;
    const signature = slots.map((slot) => `${slot.opens}–${slot.closes}`).join(' · ');
    groups.set(signature, [...(groups.get(signature) ?? []), index]);
  });
  return [...groups].map(([signature, indexes]) => `${dayRuns(indexes)} ${signature}`);
}
