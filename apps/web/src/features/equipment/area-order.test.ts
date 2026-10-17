import { describe, expect, it } from 'vitest';
import { attentionAreas, hasSeveralSites } from './area-order';

describe('hasSeveralSites', () => {
  it('es verdadero solo con más de una sede distinta', () => {
    expect(hasSeveralSites([{ parentName: 'Campus Norte' }, { parentName: 'Campus Sur' }])).toBe(true);
    expect(hasSeveralSites([{ parentName: 'Campus Norte' }, { parentName: 'Campus Norte' }, { parentName: null }])).toBe(false);
    expect(hasSeveralSites([])).toBe(false);
  });
});

const area = (name: string, faulted = 0, restricted = 0) => ({ name, faulted, restricted });
const names = (areas: ReturnType<typeof area>[]) => areas.map((entry) => entry.name);

describe('attentionAreas', () => {
  it('pone primero las de más fuera de servicio, aunque otra tenga más uso limitado', () => {
    const ordered = attentionAreas([area('Sala A', 0, 9), area('Sala B', 2, 0), area('Sala C', 1, 5)]);
    expect(names(ordered)).toEqual(['Sala B', 'Sala C', 'Sala A']);
  });

  it('a igual fuera de servicio, desempata por uso limitado y luego por nombre', () => {
    const ordered = attentionAreas([area('Sala Z', 1, 1), area('Sala B', 1, 3), area('Sala A', 1, 1)]);
    expect(names(ordered)).toEqual(['Sala B', 'Sala A', 'Sala Z']);
  });

  it('con todas operativas queda el orden alfabético, con las tildes en su sitio', () => {
    const ordered = attentionAreas([area('Óptica'), area('Balanzas'), area('Química'), area('Ósmosis')]);
    expect(names(ordered)).toEqual(['Balanzas', 'Óptica', 'Ósmosis', 'Química']);
  });

  it('se queda con las seis primeras por omisión, o con las que se pidan', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name, index) => area(name, 0, index));
    expect(names(attentionAreas(many))).toEqual(['H', 'G', 'F', 'E', 'D', 'C']);
    expect(attentionAreas(many, 2)).toHaveLength(2);
  });

  it('con menos de seis devuelve todas, y sin áreas, nada', () => {
    expect(attentionAreas([area('A'), area('B')])).toHaveLength(2);
    expect(attentionAreas([])).toEqual([]);
  });

  it('no altera la lista recibida', () => {
    const input = [area('B'), area('A', 1)];
    attentionAreas(input);
    expect(names(input)).toEqual(['B', 'A']);
  });
});
