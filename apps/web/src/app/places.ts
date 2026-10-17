import type { Location } from '@platlab/contracts';

/** Una ubicación del árbol de Core: cuelga de otra (`parentId`) o es una raíz del ámbito. */
export interface Place {
  id: string;
  name: string;
  parentId: string | null;
}

/** El árbol desde la lista de la API: una ubicación cuyo padre queda fuera del ámbito es una raíz. */
export function toPlaces(locations: readonly Location[]): Place[] {
  const ids = new Set(locations.map((entry) => entry.id));
  return locations.map((entry) => ({
    id: entry.id,
    name: entry.name,
    parentId: entry.parentId !== null && ids.has(entry.parentId) ? entry.parentId : null,
  }));
}

/** Hijas de una ubicación (`null`: las raíces). */
export const childrenOf = (places: readonly Place[], parentId: string | null): Place[] =>
  places.filter((place) => place.parentId === parentId);

/** Con una sola raíz que tiene hijas (la sede), se omite y el primer nivel son sus hijas. */
export function levelOneParent(places: readonly Place[]): string | null {
  const roots = childrenOf(places, null);
  const [root] = roots;
  return roots.length === 1 && root && childrenOf(places, root.id).length > 0 ? root.id : null;
}

/** La ubicación de primer nivel de la que cuelga otra (la que se recuerda como reciente). */
export function levelOneOf(places: readonly Place[], placeId: string): string {
  const root = levelOneParent(places);
  let current = places.find((place) => place.id === placeId);
  while (current && current.parentId !== root) {
    const parentId = current.parentId;
    current = places.find((place) => place.id === parentId);
  }
  return current?.id ?? placeId;
}

/** El camino del selector por niveles hasta una ubicación: de la de primer nivel a ella; vacío si no está. */
export function pathTo(places: readonly Place[], placeId: string): Place[] {
  const root = levelOneParent(places);
  const path: Place[] = [];
  let current = places.find((place) => place.id === placeId);
  while (current && current.id !== root) {
    path.unshift(current);
    if (current.parentId === root) break;
    const parentId: string | null = current.parentId;
    current = places.find((place) => place.id === parentId);
  }
  return path;
}

/** Los recientes primero, en su orden, y después el resto. */
export function recentFirst<T extends { id: string }>(items: readonly T[], recentIds: readonly string[]): T[] {
  const recent = recentIds.flatMap((id) => items.filter((item) => item.id === id));
  return [...recent, ...items.filter((item) => !recentIds.includes(item.id))];
}
