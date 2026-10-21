import { describe, expect, it } from 'vitest';
import { groupAreas, groupChoices, shelfRows, type WorkspaceArea } from './plan-model';

const id = (n: number) => `da000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const area = (n: number, name: string, group: { id: string; name: string } | null = null, shelves: WorkspaceArea['shelves'] = []): WorkspaceArea => ({
  id: id(n),
  code: `A${n}`,
  name,
  group,
  manager: null,
  shelves,
  counts: {},
});
const campus = { id: id(90), name: 'Sede central' };
const annex = { id: id(91), name: 'Anexo' };

describe('croquis de Áreas (ADR 0024)', () => {
  it('agrupa por sede o edificio, ordenados por nombre, y deja «Sin edificio» al final', () => {
    const groups = groupAreas([area(1, 'Zoología'), area(2, 'Química', campus), area(3, 'Física', campus), area(4, 'Bodega', annex)]);
    expect(groups.map((group) => group.name)).toEqual(['Anexo', 'Sede central', 'Sin edificio']);
    expect(groups[1]?.areas.map((entry) => entry.name)).toEqual(['Física', 'Química']);
    expect(groups[2]?.id).toBeNull();
  });

  it('sin áreas sin edificio no hay contorno «Sin edificio»', () => {
    expect(groupAreas([area(1, 'Química', campus)]).map((group) => group.name)).toEqual(['Sede central']);
    expect(groupAreas([])).toEqual([]);
  });

  it('ofrece solo las sedes y los edificios que existen para crear un área', () => {
    expect(groupChoices([area(1, 'Zoología'), area(2, 'Química', campus)])).toEqual([campus]);
  });

  it('ordena los estantes con sus niveles detrás y sangrados', () => {
    const shelves = [
      { id: id(12), code: 'B', name: 'Estante B', parentId: id(1) },
      { id: id(11), code: 'A', name: 'Estante A', parentId: id(1) },
      { id: id(13), code: 'A1', name: 'Nivel 1', parentId: id(11) },
    ];
    const rows = shelfRows(area(1, 'Química', campus, shelves));
    expect(rows.map(({ shelf, depth }) => [shelf.name, depth])).toEqual([
      ['Estante A', 0],
      ['Nivel 1', 1],
      ['Estante B', 0],
    ]);
  });
});
