import { describe, expect, it } from 'vitest';
import { childrenOf, levelOneOf, levelOneParent, recentFirst, toPlaces } from './places';

const location = (id: string, parentId: string | null) => ({ id, code: id.toUpperCase(), name: `Ubicación ${id}`, kind: 'room', parentId });

describe('ubicaciones por niveles', () => {
  it('omite la raíz única con hijas y cuelga las demás de su padre', () => {
    const places = toPlaces([location('s', null), location('r', 's'), location('a', 's'), location('e', 'r')]);
    expect(levelOneParent(places)).toBe('s');
    expect(childrenOf(places, 's').map((place) => place.id)).toEqual(['r', 'a']);
    expect(childrenOf(places, 'r').map((place) => place.id)).toEqual(['e']);
    expect(levelOneOf(places, 'e')).toBe('r');
    expect(levelOneOf(places, 'a')).toBe('a');
  });

  it('una ubicación cuyo padre está fuera del ámbito es una raíz, y una raíz sola sin hijas no se omite', () => {
    const scoped = toPlaces([location('a', 's')]);
    expect(childrenOf(scoped, null).map((place) => place.id)).toEqual(['a']);
    expect(levelOneParent(scoped)).toBeNull();
  });

  it('ordena los recientes primero', () => {
    expect(recentFirst([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['c', 'x', 'a']).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});
