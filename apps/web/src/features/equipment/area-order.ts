import type { Area } from '@platlab/contracts';

/** Con una sola sede, repetirla en cada área no dice nada: solo se muestra si hay más de una. */
export const hasSeveralSites = (areas: Pick<Area, 'parentName'>[]) => new Set(areas.flatMap((area) => area.parentName ?? [])).size > 1;

/**
 * Las áreas que más atención piden, para el Resumen (ADR 0019): primero las que tienen más equipos fuera de servicio,
 * luego las de más uso limitado y, a igualdad, por nombre. Se queda con las `limit` primeras; la lista recibida no cambia.
 */
export function attentionAreas<T extends Pick<Area, 'name' | 'faulted' | 'restricted'>>(areas: T[], limit = 6): T[] {
  return [...areas]
    .sort((a, b) => b.faulted - a.faulted || b.restricted - a.restricted || a.name.localeCompare(b.name, 'es'))
    .slice(0, limit);
}
