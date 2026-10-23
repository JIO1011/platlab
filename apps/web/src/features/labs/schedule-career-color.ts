/**
 * El color de fondo de un bloque del Cronograma según su carrera (decisión del usuario, 24-10-2026): una paleta de
 * tokens suaves (`--color-career-N`, texto `ink` con contraste AA) y un tono estable por carrera, así la misma carrera
 * se ve igual en toda la tabla, en «Por programar» y de un día a otro. El color solo distingue; la carrera va escrita en
 * el bloque. Las clases se escriben completas para que Tailwind las encuentre.
 */
export const careerTones = ['bg-career-1', 'bg-career-2', 'bg-career-3', 'bg-career-4', 'bg-career-5', 'bg-career-6', 'bg-career-7', 'bg-career-8'] as const;

/** El fondo de un bloque sin carrera: el suave del módulo. */
export const neutralTone = 'bg-action-soft';

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

/** La clase de fondo del bloque de esa carrera; sin carrera, el fondo neutro. */
export function careerTone(career: string | null): string {
  const key = career ? normalized(career) : '';
  return key === '' ? neutralTone : careerTones[hash(key) % careerTones.length]!;
}
