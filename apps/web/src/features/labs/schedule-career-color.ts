import { createContext, useContext } from 'react';

/**
 * El color de un bloque del Cronograma según su carrera (decisión del usuario, 24-10-2026; forma «franja de carrera»,
 * 15-11-2026): ocho tonos, cada uno con su tinte (`--tone-bg`, `--color-career-N`, para la etiqueta de la carrera, con
 * texto `ink` AA) y su color fuerte (`--tone-edge`, `-edge`, para la franja del borde izquierdo), y un tono por carrera sin
 * choques entre las visibles (`careerTones`), así la misma carrera se ve igual en toda la tabla y en «Por programar». El
 * color solo distingue; la carrera va escrita en el bloque. Las clases se escriben completas para que Tailwind las encuentre.
 */
export const tones = [
  '[--tone-bg:var(--color-career-1)] [--tone-edge:var(--color-career-1-edge)]',
  '[--tone-bg:var(--color-career-2)] [--tone-edge:var(--color-career-2-edge)]',
  '[--tone-bg:var(--color-career-3)] [--tone-edge:var(--color-career-3-edge)]',
  '[--tone-bg:var(--color-career-4)] [--tone-edge:var(--color-career-4-edge)]',
  '[--tone-bg:var(--color-career-5)] [--tone-edge:var(--color-career-5-edge)]',
  '[--tone-bg:var(--color-career-6)] [--tone-edge:var(--color-career-6-edge)]',
  '[--tone-bg:var(--color-career-7)] [--tone-edge:var(--color-career-7-edge)]',
  '[--tone-bg:var(--color-career-8)] [--tone-edge:var(--color-career-8-edge)]',
] as const;

/** El tinte y la franja de un bloque sin carrera: los del módulo. */
export const neutralTone = '[--tone-bg:var(--color-action-soft)] [--tone-edge:var(--color-action)]';

/** La carrera sin mayúsculas, tildes ni espacios de más: «Ingeniería  Química» y «ingenieria quimica» son la misma. */
function normalized(career: string): string {
  return career.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** FNV-1a de 32 bits: barato, sin estado y el mismo resultado en cada visita. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

/** Lo que decide el tono de cada carrera: dada una carrera, las variables de color de su bloque (`--tone-bg`, `--tone-edge`). */
export type ToneOf = (career: string | null) => string;

/**
 * Reparte los tonos entre las carreras que se ven (la tabla del día y «Por programar»), sin choques: cada carrera, en
 * orden alfabético, parte del tono que le da su nombre y, si ya lo tiene otra, sigue al siguiente libre (con más
 * carreras que tonos, se reparten por igual). Así el mismo nombre suele conservar su tono de un día a otro y dos
 * carreras visibles nunca comparten color mientras no pasen de ocho. Sin carrera, el neutro.
 */
export function careerTones(careers: readonly (string | null)[]): ToneOf {
  const keys = [...new Set(careers.map((career) => (career ? normalized(career) : '')).filter((key) => key !== ''))].sort();
  const uses = tones.map(() => 0);
  const slots = new Map<string, number>();
  for (const key of keys) {
    const least = Math.min(...uses);
    let slot = hash(key) % tones.length;
    while (uses[slot]! > least) slot = (slot + 1) % tones.length;
    uses[slot]! += 1;
    slots.set(key, slot);
  }
  return (career) => {
    const key = career ? normalized(career) : '';
    // Una carrera que no estaba entre las repartidas (no debería pasar) toma el tono de su nombre.
    return key === '' ? neutralTone : tones[slots.get(key) ?? hash(key) % tones.length]!;
  };
}

const ToneContext = createContext<ToneOf>(careerTones([]));

/** Quien provee el reparto de tonos de la pantalla (el Cronograma): bloques, «Por programar» y el indicador de arrastre lo leen. */
export const CareerToneProvider = ToneContext.Provider;

/** El reparto de tonos de la pantalla: dada una carrera, las variables de color de su bloque. */
export function useCareerTone(): ToneOf {
  return useContext(ToneContext);
}
