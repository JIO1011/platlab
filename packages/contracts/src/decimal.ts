import { z } from 'zod';

/**
 * Cantidad exacta transportada como cadena decimal (03 §1).
 * Nunca se convierte a `number` para operar: la aritmética ocurre en PostgreSQL.
 */
export const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Debe ser un decimal sin notación científica');

/** Cantidad mayor que cero, con hasta 15 enteros y 9 decimales: lo que cabe en numeric(24,9) (02 §12). */
export const positiveQuantity = z
  .string()
  .regex(/^(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal mayor que cero');

/** Cantidad de cero o más, con la misma escala: un conteo o lo utilizado de lo apartado. */
export const nonNegativeQuantity = z.string().regex(/^\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal de cero o más');

/** Escala dos decimales al mismo número de cifras como enteros exactos (BigInt), sin pasar por `number`. */
function scaled(a: string, b: string): [bigint, bigint] {
  const [aInt = '0', aFrac = ''] = a.replace('-', '').split('.');
  const [bInt = '0', bFrac = ''] = b.replace('-', '').split('.');
  const digits = Math.max(aFrac.length, bFrac.length);
  const value = (sign: boolean, int: string, frac: string) => (sign ? -1n : 1n) * BigInt(int + frac.padEnd(digits, '0'));
  return [value(a.startsWith('-'), aInt, aFrac), value(b.startsWith('-'), bInt, bFrac)];
}

/** Compara dos `decimalString` exactamente: -1, 0 o 1. */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 {
  const [x, y] = scaled(a, b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Suma exacta de `decimalString` no negativas, sin pasar por `number`; sin ceros de más («1.50» + «0.5» = «2»). */
export function sumDecimals(values: readonly string[]): string {
  const scale = Math.max(0, ...values.map((value) => value.split('.')[1]?.length ?? 0));
  const total = values.reduce((sum, value) => {
    const [int = '0', frac = ''] = value.split('.');
    return sum + BigInt(int + frac.padEnd(scale, '0'));
  }, 0n);
  if (scale === 0) return total.toString();
  const digits = total.toString().padStart(scale + 1, '0');
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/\.?0+$/, '');
}
