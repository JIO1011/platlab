/** Escala entera y limpia: 0, la mitad si es entera y el máximo (1, 2, 3, 4, 5, 10, 15…). */
export function niceScale(peak: number): { max: number; ticks: number[] } {
  const top = Math.max(1, peak);
  const max = top <= 5 ? top : Math.ceil(top / 5) * 5;
  const ticks = max % 2 === 0 ? [0, max / 2, max] : [0, max];
  return { max, ticks };
}

/**
 * A qué posición pasa el teclado dentro de un gráfico de `length` posiciones: flechas, Inicio y Fin.
 * `active` es la posición actual (`null` si no hay); devuelve `null` si la tecla no mueve nada.
 */
export function stepIndex(key: string, active: number | null, length: number): number | null {
  const last = length - 1;
  if (key === 'ArrowRight') return Math.min(last, (active ?? -1) + 1);
  if (key === 'ArrowLeft') return Math.max(0, (active ?? length) - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  return null;
}
