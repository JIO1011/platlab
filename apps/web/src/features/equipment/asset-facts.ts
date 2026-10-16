import { formatDate } from '../../app/format';

/** Hoy como fecha civil AAAA-MM-DD en la zona del espacio, nunca en la del navegador (03 §3). */
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const parts = (isoDate: string) => {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return { year, month, day };
};

/** Meses civiles completos de `from` a `to` (0 si `to` no pasa de `from`). */
function wholeMonths(from: string, to: string): number {
  const a = parts(from);
  const b = parts(to);
  const months = (b.year - a.year) * 12 + (b.month - a.month) - (b.day < a.day ? 1 : 0);
  return Math.max(0, months);
}

const daysBetween = (from: string, to: string) => {
  const utc = (value: string) => {
    const { year, month, day } = parts(value);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * La garantía en una frase: «Vence en 8 meses» (o «en 12 días» si falta menos de un mes, «Vence hoy»),
 * «Vencida el 3 mar 2025» o «Sin garantía». El último día de garantía aún la cubre.
 */
export function warrantyText(warrantyUntil: string | null, today: string): string {
  if (warrantyUntil === null) return 'Sin garantía';
  if (warrantyUntil < today) return `Vencida el ${formatDate(warrantyUntil)}`;
  if (warrantyUntil === today) return 'Vence hoy';
  const months = wholeMonths(today, warrantyUntil);
  return months >= 1 ? `Vence en ${plural(months, 'mes', 'meses')}` : `Vence en ${plural(daysBetween(today, warrantyUntil), 'día', 'días')}`;
}

/**
 * La vida útil que queda, contada desde la compra: «Quedan 3 años», «Quedan 2 años y 4 meses»,
 * «Quedan 5 meses», «Cumplida» o «Sin dato» si falta la fecha de compra o los años.
 */
export function usefulLifeText(acquiredOn: string | null, years: number | null, today: string): string {
  if (acquiredOn === null || years === null) return 'Sin dato';
  const { year, month, day } = parts(acquiredOn);
  const end = new Date(Date.UTC(year + years, month - 1, day)).toISOString().slice(0, 10);
  if (end <= today) return 'Cumplida';
  const months = wholeMonths(today, end);
  if (months < 1) return `Quedan ${plural(daysBetween(today, end), 'día', 'días')}`;
  const left = months % 12;
  const whole = Math.floor(months / 12);
  if (whole === 0) return `Quedan ${plural(months, 'mes', 'meses')}`;
  return `Quedan ${plural(whole, 'año', 'años')}${left > 0 ? ` y ${plural(left, 'mes', 'meses')}` : ''}`;
}

/**
 * El importe «USD 9.800,00» desde la cadena decimal del servidor, sin pasar por `number`: miles con punto,
 * coma decimal y siempre dos decimales.
 */
export function formatMoney(value: string): string {
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return `USD ${value}`;
  const [, whole = '0', cents = ''] = match;
  return `USD ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents.padEnd(2, '0')}`;
}
