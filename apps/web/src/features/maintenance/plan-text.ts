import type { IntervalUnit, Plan } from '@platlab/contracts';

const units: Record<IntervalUnit, [one: string, many: string]> = {
  day: ['día', 'días'],
  week: ['semana', 'semanas'],
  month: ['mes', 'meses'],
  year: ['año', 'años'],
};

export const intervalUnitOptions = (Object.keys(units) as IntervalUnit[]).map((value) => ({ value, label: units[value][1] }));

/** «Cada mes», «Cada 6 meses», «Cada 15 días». */
export function frequencyText(count: number, unit: IntervalUnit): string {
  const [one, many] = units[unit];
  return count === 1 ? `Cada ${one}` : `Cada ${count} ${many}`;
}

/** El alcance del plan: «Balanzas · 5 equipos» o «BAL-03 · plan propio». */
export function scopeText(plan: Pick<Plan, 'assetType' | 'asset' | 'assetCount'>): string {
  if (plan.asset) return `${plan.asset.code} · plan propio`;
  return `${plan.assetType?.name ?? 'Tipo de equipo'} · ${plan.assetCount} ${plan.assetCount === 1 ? 'equipo' : 'equipos'}`;
}
