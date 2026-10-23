/** Palabras que no dicen nada del área: artículos y preposiciones. */
const fillerWords = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E', 'PARA', 'EN']);

/** Palabras que casi todo nombre de área lleva y que no la distinguen. */
const genericWords = new Set(['LABORATORIO', 'LAB', 'SALA', 'AULA', 'TALLER', 'AREA']);

/** El contrato admite siglas de 2 a 5 caracteres. */
const maxLength = 5;

/**
 * La sigla que se sugiere al habilitar un área, desde su nombre: sin tildes y en mayúsculas, sin palabras vacías ni
 * genéricas. Con 2 o más palabras significativas, sus iniciales (hasta 5); con una, sus 3 primeras letras; con ninguna,
 * las 3 primeras letras del nombre. Si ya la usa otro espacio (`taken`), agrega 2, 3… sin pasar de 5 caracteres.
 * «Laboratorio de Anatomía» → ANA, «Biología Molecular» → BM, «Sala de Química» con QUI tomada → QUI2.
 */
export function suggestAbbreviation(name: string, taken: string[]): string {
  const words = name.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().match(/[A-Z]+/g) ?? [];
  const significant = words.filter((word) => !fillerWords.has(word) && !genericWords.has(word));
  const base =
    significant.length >= 2
      ? significant.map((word) => word.charAt(0)).join('').slice(0, maxLength)
      : (significant[0] ?? words.join('')).slice(0, 3);

  const used = new Set(taken.map((abbreviation) => abbreviation.toUpperCase()));
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base.slice(0, maxLength - String(n).length)}${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return base;
}
