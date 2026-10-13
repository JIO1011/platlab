// Prototipo R-01D: solo interfaz
import { describe, expect, it } from 'vitest';
import { bottleCodes, casOptional, childrenOf, emptyDraft, freeCodeIfTaken, lastSuffix, levelOneParent, newProductCode, nextCode, takenSet, toPlaces, validateNew } from './wizard-model';

describe('newProductCode', () => {
  it('toma 3 letras del nombre, en mayúsculas y sin tildes', () => {
    expect(newProductCode('Acetona Biotec')).toBe('ACE-001');
    expect(newProductCode('Ácido clorhídrico')).toBe('ACI-001');
    expect(newProductCode('  1,4-Dioxano')).toBe('DIO-001');
  });
  it('con menos letras usa las que haya y sin nombre no sugiere nada', () => {
    expect(newProductCode('Ag')).toBe('AG-001');
    expect(newProductCode('')).toBe('');
    expect(newProductCode('123')).toBe('');
  });
});

describe('nextCode', () => {
  it('incrementa el último grupo numérico del código más alto conservando los ceros', () => {
    expect(nextCode(['AC-BIO-001'])).toBe('AC-BIO-002');
    expect(nextCode(['HCL-2026-01-02'])).toBe('HCL-2026-01-03');
    expect(nextCode(['AC-001', 'AC-009', 'AC-004'])).toBe('AC-010');
    expect(nextCode(['AC-099'])).toBe('AC-100');
  });
  it('ignora los códigos sin número', () => {
    expect(nextCode(['SIN', 'AC-007'])).toBe('AC-008');
    expect(nextCode(['SIN'])).toBeNull();
    expect(nextCode([])).toBeNull();
  });
});

describe('bottleCodes', () => {
  it('numera a partir del número final', () => {
    expect(bottleCodes('LAB-7', 3)).toEqual(['LAB-7', 'LAB-8', 'LAB-9']);
    expect(bottleCodes('ACE-001', 3)).toEqual(['ACE-001', 'ACE-002', 'ACE-003']);
  });
  it('si no termina en número añade -1, -2… a cada frasco', () => {
    expect(bottleCodes('LAB', 3)).toEqual(['LAB-1', 'LAB-2', 'LAB-3']);
  });
  it('un solo frasco lleva el código tal cual', () => {
    expect(bottleCodes('LAB', 1)).toEqual(['LAB']);
    expect(bottleCodes('LAB-7', 1)).toEqual(['LAB-7']);
    expect(bottleCodes('', 3)).toEqual([]);
  });
  it('lastSuffix da el número del último frasco solo con más de uno', () => {
    expect(lastSuffix('ACE-001', 4)).toBe('004');
    expect(lastSuffix('LAB-7', 3)).toBe('9');
    expect(lastSuffix('LAB', 3)).toBe('3');
    expect(lastSuffix('ACE-001', 1)).toBeNull();
  });
});

describe('freeCodeIfTaken', () => {
  const taken = takenSet(['AC-BIO-001', 'ac-bio-003']);
  it('no dice nada si no choca', () => {
    expect(freeCodeIfTaken('AC-BIO-004', 2, taken)).toBeNull();
  });
  it('propone el primer código libre', () => {
    expect(freeCodeIfTaken('AC-BIO-001', 1, taken)).toBe('AC-BIO-002');
    expect(freeCodeIfTaken('AC-BIO-002', 2, taken)).toBe('AC-BIO-004');
  });
  it('compara sin tildes ni mayúsculas', () => {
    expect(freeCodeIfTaken('ac-bio-003', 1, taken)).toBe('ac-bio-004');
  });
});

describe('ubicaciones por niveles', () => {
  const places = toPlaces([
    { id: 's', name: 'Sede', kind: 'site' },
    { id: 'r', name: 'Laboratorio', kind: 'room' },
    { id: 'a', name: 'Almacén', kind: 'storage' },
  ]);
  it('omite la raíz única y cuelga los subniveles simulados', () => {
    expect(levelOneParent(places)).toBe('s');
    expect(childrenOf(places, 's').map((place) => place.name)).toEqual(['Laboratorio', 'Almacén']);
    const level2 = childrenOf(places, 'r');
    expect(level2.length).toBeGreaterThan(0);
    expect(level2.every((place) => place.local)).toBe(true);
    expect(childrenOf(places, level2[0]?.id ?? '').length).toBe(3);
  });
  it('con varias raíces el primer nivel son las raíces', () => {
    const many = toPlaces([{ id: 'x', name: 'X', kind: 'room' }]);
    expect(levelOneParent(many)).toBe('x');
    expect(levelOneParent([{ id: '1', name: 'A', parentId: null }, { id: '2', name: 'B', parentId: null }])).toBeNull();
  });
});

describe('CAS obligatorio salvo en mezclas', () => {
  it('exige el CAS salvo con estado físico «Mezcla»', () => {
    const base = { ...emptyDraft, name: 'Reactivo', state: 'liquid' };
    expect(validateNew(base).cas).toBeDefined();
    expect(validateNew({ ...base, state: 'mixture' }).cas).toBeUndefined();
    expect(casOptional({ ...base, state: 'mixture' })).toBe(true);
    expect(validateNew({ ...base, state: 'mixture', cas: '64-17-4' }).cas).toBeDefined();
  });
});
