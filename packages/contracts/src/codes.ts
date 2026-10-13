/**
 * Códigos automáticos (ADR 0015), puros para que el servidor y la web numeren igual. Un código
 * cumple el formato común de 03 §1: empieza por letra o número y sigue con letras, números, «.»,
 * «_» o «-», hasta 64 caracteres.
 */

/**
 * Código a partir de un nombre: sin tildes, en mayúsculas y con las palabras unidas por «-», hasta
 * `maxLength` caracteres sin cortar una palabra (`Ácido clorhídrico 37 %` → `ACIDO-CLORHIDRICO-37`).
 * Si el nombre no tiene letras ni números latinos, devuelve `fallback`.
 */
export function codeFromName(name: string, fallback: string, maxLength = 20): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  let code = '';
  for (const word of words) {
    const next = code ? `${code}-${word}` : word;
    if (next.length > maxLength) {
      if (!code) code = word.slice(0, maxLength);
      break;
    }
    code = next;
  }
  return code || fallback;
}

/** El código, o el primero libre de `código-2`, `código-3`…; `taken` compara sin mayúsculas. */
export function firstFreeCode(base: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((code) => code.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

/** Parte un código en su prefijo y su número final, si lo tiene (`AC-BIO-007` → `AC-BIO-`, `007`). */
function trailingNumber(code: string): { prefix: string; digits: string } | null {
  const match = /^(.*?)(\d+)$/.exec(code);
  return match ? { prefix: match[1] ?? '', digits: match[2] ?? '' } : null;
}

/** Siguiente número conservando los ceros a la izquierda (`009` → `010`, `999` → `1000`). */
function increment(digits: string, by: number): string {
  return (BigInt(digits) + BigInt(by)).toString().padStart(digits.length, '0');
}

/**
 * Códigos de `count` frascos en serie desde el primero: con número final, lo incrementa
 * (`LAB-7` → `LAB-7`, `LAB-8`); sin él, numera desde 1 (`LAB` → `LAB-1`, `LAB-2`). Un solo frasco
 * lleva el código tal cual.
 */
export function bottleCodes(code: string, count: number): string[] {
  if (count === 1) return [code];
  const parts = trailingNumber(code);
  return Array.from({ length: count }, (_, index) =>
    parts ? `${parts.prefix}${increment(parts.digits, index)}` : `${code}-${index + 1}`,
  );
}

/** El código que sigue a otro en su serie (`AC-BIO-001` → `AC-BIO-002`). */
export function nextCode(code: string): string {
  return bottleCodes(code, 2)[1] ?? code;
}

/**
 * Primera serie de `count` códigos libres desde `first` (ADR 0015): si alguno está ocupado en el
 * espacio, salta al siguiente número. `taken` compara sin mayúsculas.
 */
export function freeSeries(first: string, count: number, taken: Iterable<string>): string[] {
  const used = new Set([...taken].map((code) => code.toLowerCase()));
  for (let start = first; ; start = nextCode(start)) {
    const series = bottleCodes(start, count);
    if (series.every((code) => !used.has(code.toLowerCase()))) return series;
  }
}

/** Prefijo de la serie sugerida a partir del nombre: tres letras o números (`Acetona` → `ACE-001`). */
export function seriesFromName(name: string): string {
  return `${codeFromName(name, 'FRA').replace(/-/g, '').slice(0, 3)}-001`;
}
