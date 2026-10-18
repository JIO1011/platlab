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

/** Las frecuencias que se eligen de un toque; cualquier otra es «Otro», con su número y su unidad. */
export const frequencyPresets = [
  { value: 'monthly', label: 'Mensual', count: 1, unit: 'month' },
  { value: 'quarterly', label: 'Trimestral', count: 3, unit: 'month' },
  { value: 'semiannual', label: 'Semestral', count: 6, unit: 'month' },
  { value: 'annual', label: 'Anual', count: 1, unit: 'year' },
] as const satisfies ReadonlyArray<{ value: string; label: string; count: number; unit: IntervalUnit }>;

/** La frecuencia de un toque que equivale a cada N unidades; null si no hay (entonces es «Otro»). */
export function presetFor(count: number, unit: IntervalUnit): (typeof frequencyPresets)[number] | null {
  return frequencyPresets.find((preset) => preset.count === count && preset.unit === unit) ?? null;
}
