/**
 * Cantidades exactas en la interfaz (03 §1): se formatean y normalizan como texto, sin pasar
 * nunca por `number`. La API transporta cadenas con punto decimal; en pantalla se usa es-EC.
 */

/** «-1234.5» → «−1.234,5». */
export function formatDecimal(value: string): string {
  const negative = value.startsWith('-');
  const [integer = '0', fraction] = (negative ? value.slice(1) : value).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '−' : ''}${grouped}${fraction ? `,${fraction}` : ''}`;
}

/**
 * Cadena de la API → texto para un campo editable: coma decimal y sin separador de miles, para
 * que vuelva igual por `normalizeDecimalInput` («2257.5» → «2257,5»). `formatDecimal` no sirve
 * aquí: «2.257» se leería como dos coma dos.
 */
export function toDecimalInput(value: string): string {
  return value.replace('.', ',');
}

/**
 * Lo que escribe la persona → cadena decimal de la API. Acepta coma decimal («79,5») y punto
 * («79.5»); con coma presente, los puntos se toman como separadores de miles («1.234,5»).
 * No valida: el contrato decide si el resultado es una cantidad aceptable.
 */
export function normalizeDecimalInput(input: string): string {
  const compact = input.trim().replace(/\s+/g, '').replace(/^−/, '-');
  if (compact.includes(',')) return compact.replace(/\./g, '').replace(',', '.');
  return compact;
}

const SCALE = 9;
const FACTOR = 10n ** BigInt(SCALE);

/** Cadena decimal de la API → entero en milmillonésimas (numeric(24,9)); null si no es válida. */
function toUnits(value: string): bigint | null {
  const match = /^(-?)(\d{1,15})(?:\.(\d{1,9}))?$/.exec(value);
  if (!match) return null;
  const [, sign, integer = '0', fraction = ''] = match;
  const units = BigInt(integer) * FACTOR + BigInt(fraction.padEnd(SCALE, '0'));
  return sign ? -units : units;
}

function fromUnits(units: bigint): string {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const integer = absolute / FACTOR;
  const fraction = (absolute % FACTOR).toString().padStart(SCALE, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Porcentaje de una cantidad, redondeado hacia abajo a 9 decimales (atajos «25 %», «50 %»).
 * Nunca pasa por `number`: un atajo no debe proponer más de lo que hay.
 */
export function percentOfDecimal(value: string, percent: number): string | null {
  const units = toUnits(value);
  if (units === null || !Number.isInteger(percent) || percent < 0 || percent > 100) return null;
  return fromUnits((units * BigInt(percent)) / 100n);
}

/** a − b con exactitud; null si alguna no es una cadena decimal válida. */
export function subtractDecimal(a: string, b: string): string | null {
  const left = toUnits(a);
  const right = toUnits(b);
  if (left === null || right === null) return null;
  return fromUnits(left - right);
}

/** a + b con exactitud; null si alguna no es una cadena decimal válida. */
export function addDecimal(a: string, b: string): string | null {
  const left = toUnits(a);
  const right = toUnits(b);
  if (left === null || right === null) return null;
  return fromUnits(left + right);
}

/** Qué porcentaje de `whole` es `part`, entero de 0 a 100 (barra de «% restante» de un frasco). */
export function ratioPercent(part: string, whole: string): number | null {
  const numerator = toUnits(part);
  const denominator = toUnits(whole);
  if (numerator === null || denominator === null || denominator <= 0n) return null;
  const percent = (numerator * 100n) / denominator;
  return Number(percent < 0n ? 0n : percent > 100n ? 100n : percent);
}

/** n / d redondeado a entero con la mitad alejándose de cero (la mitad «hacia arriba» en positivos). */
function roundedQuotient(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = (2n * n + d) / (2n * d);
  return negative ? -quotient : quotient;
}

/** Entero con `decimals` decimales implícitos → cadena con exactamente esos decimales («-2.10»). */
function fixed(scaled: bigint, decimals: number): string {
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  const base = 10n ** BigInt(decimals);
  const integer = absolute / base;
  const fraction = decimals > 0 ? `.${(absolute % base).toString().padStart(decimals, '0')}` : '';
  return `${negative && absolute !== 0n ? '-' : ''}${integer}${fraction}`;
}

const validDecimals = (decimals: number) => Number.isInteger(decimals) && decimals >= 0 && decimals <= SCALE;

/**
 * Redondea a `decimals` (0 a 9) con la mitad hacia arriba y devuelve la cadena con esos decimales
 * exactos («43.5949», 2 → «43.59»); null si no es una cadena decimal válida.
 */
export function roundDecimal(value: string, decimals: number): string | null {
  const units = toUnits(value);
  if (units === null || !validDecimals(decimals)) return null;
  return fixed(roundedQuotient(units, 10n ** BigInt(SCALE - decimals)), decimals);
}

/** a × b con exactitud, redondeado a `decimals`; null si alguna no es válida. Nunca pasa por `number`. */
export function multiplyDecimal(a: string, b: string, decimals: number): string | null {
  const left = toUnits(a);
  const right = toUnits(b);
  if (left === null || right === null || !validDecimals(decimals)) return null;
  return fixed(roundedQuotient(left * right, 10n ** BigInt(2 * SCALE - decimals)), decimals);
}

/** a ÷ b con exactitud, redondeado a `decimals`; null si alguna no es válida o b es cero. */
export function divideDecimal(a: string, b: string, decimals: number): string | null {
  const left = toUnits(a);
  const right = toUnits(b);
  if (left === null || right === null || right === 0n || !validDecimals(decimals)) return null;
  return fixed(roundedQuotient(left * 10n ** BigInt(decimals), right), decimals);
}
