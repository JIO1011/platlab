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

/** Ajuste con signo y distinto de cero, con la misma escala. */
export const adjustmentQuantity = z
  .string()
  .regex(/^-?(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal distinta de cero');

/** Unidad en la que se captura una cantidad (u, g, mL…); el servidor la convierte a la base del ítem o la rechaza. */
export const unit = z.string().regex(/^[A-Za-z]{1,10}$/, 'Unidad inválida');

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

const fractionDigits = (value: string) => value.split('.')[1]?.length ?? 0;

/** Un decimal no negativo como entero exacto con `scale` decimales. */
function toScaled(value: string, scale: number): bigint {
  const [int = '0', frac = ''] = value.split('.');
  return BigInt(int + frac.padEnd(scale, '0'));
}

/** Entero escalado de vuelta a decimal, sin ceros de más («1.50» → «1.5», «2.00» → «2»). */
function fromScaled(total: bigint, scale: number): string {
  if (scale === 0) return total.toString();
  const digits = total.toString().padStart(scale + 1, '0');
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/\.?0+$/, '');
}

/** Suma exacta de `decimalString` no negativas, sin pasar por `number`; sin ceros de más («1.50» + «0.5» = «2»). */
export function sumDecimals(values: readonly string[]): string {
  const scale = Math.max(0, ...values.map(fractionDigits));
  return fromScaled(
    values.reduce((sum, value) => sum + toScaled(value, scale), 0n),
    scale,
  );
}

/** Resta exacta de `decimalString` no negativas con `a` ≥ `b` («3» − «0.5» = «2.5»); una diferencia negativa es un error de quien llama. */
export function subtractDecimals(a: string, b: string): string {
  const scale = Math.max(fractionDigits(a), fractionDigits(b));
  const difference = toScaled(a, scale) - toScaled(b, scale);
  if (difference < 0n) throw new RangeError('La resta no puede ser negativa');
  return fromScaled(difference, scale);
}
