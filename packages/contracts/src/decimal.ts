import { z } from 'zod';

/**
 * Cantidad exacta transportada como cadena decimal (03 §1).
 * Nunca se convierte a `number` para operar: la aritmética ocurre en PostgreSQL.
 */
export const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Debe ser un decimal sin notación científica');

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
