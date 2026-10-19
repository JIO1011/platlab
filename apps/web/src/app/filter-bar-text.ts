import { formatShortDate } from './format';

/**
 * Lo que dice el botón de un filtro de la barra: solo su nombre sin nada elegido; con una opción, esa opción
 * («Tipo: Calibración»); con varias, cuántas («Tipo: 2»).
 */
export function triggerText(label: string, chosen: readonly string[]): string {
  if (chosen.length === 0) return label;
  return `${label}: ${chosen.length === 1 ? chosen[0] : chosen.length}`;
}

/** El periodo elegido en pocas palabras («01/10/2026 – 19/10/2026», «Desde 01/10/2026»); sin extremos, nada. */
export function rangeText(from: string | null, to: string | null): string | null {
  if (from && to) return `${formatShortDate(from)} – ${formatShortDate(to)}`;
  if (from) return `Desde ${formatShortDate(from)}`;
  if (to) return `Hasta ${formatShortDate(to)}`;
  return null;
}
