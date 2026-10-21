import type { AreasOverview } from '@platlab/contracts';

export type WorkspaceArea = AreasOverview['areas'][number];
type Shelf = WorkspaceArea['shelves'][number];

/** Un contorno del croquis: la sede o el edificio con sus áreas; `id` nulo es «Sin edificio». */
interface AreaGroup {
  id: string | null;
  name: string;
  areas: WorkspaceArea[];
}

const UNGROUPED_NAME = 'Sin edificio';

export const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' });

/** Las áreas por sede o edificio, cada grupo y sus áreas por nombre; las áreas sin grupo cierran la lista. */
export function groupAreas(areas: readonly WorkspaceArea[]): AreaGroup[] {
  const groups = new Map<string, AreaGroup>();
  const ungrouped: WorkspaceArea[] = [];
  for (const area of areas) {
    if (!area.group) {
      ungrouped.push(area);
      continue;
    }
    const group = groups.get(area.group.id) ?? { id: area.group.id, name: area.group.name, areas: [] };
    group.areas.push(area);
    groups.set(area.group.id, group);
  }
  const ordered = [...groups.values()].sort(byName).map((group) => ({ ...group, areas: group.areas.sort(byName) }));
  return ungrouped.length > 0 ? [...ordered, { id: null, name: UNGROUPED_NAME, areas: ungrouped.sort(byName) }] : ordered;
}

/** Las sedes y los edificios que ya tienen áreas, para elegir dónde crear una nueva. */
export function groupChoices(areas: readonly WorkspaceArea[]): Array<{ id: string; name: string }> {
  return groupAreas(areas).flatMap((group) => (group.id ? [{ id: group.id, name: group.name }] : []));
}

/** Los estantes del área y sus niveles, cada uno tras su estante, con la profundidad para sangrarlos. */
export function shelfRows(area: Pick<WorkspaceArea, 'id' | 'shelves'>): Array<{ shelf: Shelf; depth: number }> {
  const walk = (parentId: string, depth: number): Array<{ shelf: Shelf; depth: number }> =>
    area.shelves
      .filter((shelf) => shelf.parentId === parentId)
      .sort(byName)
      .flatMap((shelf) => [{ shelf, depth }, ...walk(shelf.id, depth + 1)]);
  return walk(area.id, 0);
}
