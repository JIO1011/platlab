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
 * Lo que escribe la persona → cadena decimal de la API. Acepta coma decimal («79,5») y punto
 * («79.5»); con coma presente, los puntos se toman como separadores de miles («1.234,5»).
 * No valida: el contrato decide si el resultado es una cantidad aceptable.
 */
export function normalizeDecimalInput(input: string): string {
  const compact = input.trim().replace(/\s+/g, '').replace(/^−/, '-');
  if (compact.includes(',')) return compact.replace(/\./g, '').replace(',', '.');
  return compact;
}
