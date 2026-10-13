import { describe, expect, it } from 'vitest';
import {
  casRequired,
  catalogFields,
  childrenOf,
  emptyBottles,
  emptyDraft,
  lastSuffix,
  levelOneOf,
  levelOneParent,
  receiptTare,
  recentFirst,
  seriesOf,
  toPlaces,
  validateBottles,
  validateDraft,
} from './model';

const location = (id: string, parentId: string | null) => ({ id, code: id.toUpperCase(), name: `Ubicación ${id}`, kind: 'room', parentId });

describe('datos de catálogo', () => {
  it('exige el CAS salvo con estado físico «Mezcla», con la regla del contrato', () => {
    const base = { ...emptyDraft, name: 'Reactivo', state: 'liquid' as const };
    expect(validateDraft(base).cas).toBeDefined();
    expect(validateDraft({ ...base, state: 'mixture' }).cas).toBeUndefined();
    expect(casRequired('mixture')).toBe(false);
    expect(casRequired('')).toBe(true);
    expect(validateDraft({ ...base, state: 'mixture', cas: '64-17-4' }).cas).toBeDefined();
    expect(validateDraft({ ...base, cas: '64-17-5' })).toEqual({});
    // Al editar una ficha sin CAS, solo se exige si cambian el CAS o el estado.
    expect(validateDraft(base, { cas: false }).cas).toBeUndefined();
  });

  it('pide nombre y estado, y revisa el enlace y la densidad solo donde cuentan', () => {
    expect(Object.keys(validateDraft(emptyDraft)).sort()).toEqual(['cas', 'name', 'state']);
    const named = { ...emptyDraft, name: 'Etanol', state: 'liquid' as const, cas: '64-17-5' };
    expect(validateDraft({ ...named, sds: 'digital', sdsUrl: 'ficha.pdf' }).sdsUrl).toBeDefined();
    expect(validateDraft({ ...named, sds: 'physical', sdsUrl: 'ficha.pdf' }).sdsUrl).toBeUndefined();
    expect(validateDraft({ ...named, unit: 'mL', density: '0' }).density).toBeDefined();
    expect(validateDraft({ ...named, unit: 'g', density: '0' }).density).toBeUndefined();
  });

  it('envía el enlace solo con ficha digital y la densidad solo en volumen, como cadena decimal', () => {
    const draft = { ...emptyDraft, name: ' Etanol ', state: 'liquid' as const, cas: '64-17-5', sds: 'physical' as const, sdsUrl: 'https://x.y', density: '0,789' };
    expect(catalogFields(draft)).toMatchObject({ name: 'Etanol', sdsKind: 'physical', sdsUrl: null, density: null });
    expect(catalogFields({ ...draft, unit: 'mL', sds: 'digital' })).toMatchObject({ sdsUrl: 'https://x.y', density: '0.789' });
  });
});

describe('frascos', () => {
  it('numera la serie como el servidor y muestra dónde termina', () => {
    expect(seriesOf('ACE-001', 3)).toEqual(['ACE-001', 'ACE-002', 'ACE-003']);
    expect(seriesOf('LAB', 2)).toEqual(['LAB-1', 'LAB-2']);
    expect(seriesOf('LAB', null)).toEqual([]);
    expect(lastSuffix(seriesOf('ACE-001', 4))).toBe('004');
    expect(lastSuffix(seriesOf('ACE-001', 1))).toBeNull();
  });

  it('pide cantidad, frascos, código válido y ubicación', () => {
    expect(Object.keys(validateBottles(emptyBottles, '')).sort()).toEqual(['code', 'placeId', 'quantity']);
    const ready = { ...emptyBottles, quantity: '2,5', count: '3', placeId: 'x' };
    expect(validateBottles(ready, 'ACE-001')).toEqual({});
    expect(validateBottles({ ...ready, quantity: '0' }, 'ACE-001').quantity).toBeDefined();
    expect(validateBottles({ ...ready, count: '51' }, 'ACE-001').count).toBeDefined();
    expect(validateBottles(ready, 'ACE 001').code).toBeDefined();
  });
});

describe('tara del ingreso', () => {
  const base = { unit: 'mL', quantity: '500', grossWeight: '', density: '' };

  it('no pide nada mientras el peso está vacío', () => {
    expect(receiptTare(base)).toEqual({ tare: null, errors: {} });
  });

  it('en volumen pide la densidad y calcula la tara con ella', () => {
    expect(receiptTare({ ...base, grossWeight: '640' }).errors.density).toBeDefined();
    expect(receiptTare({ ...base, grossWeight: '534.5', density: '0.789' }).tare).toBe('140');
  });

  it('avisa cuando el frasco lleno no pesa más que su contenido', () => {
    expect(receiptTare({ ...base, grossWeight: '300', density: '0.789' }).errors.weight).toMatch(/394,5 g/);
  });

  it('en masa no necesita densidad', () => {
    expect(receiptTare({ unit: 'g', quantity: '500', grossWeight: '640', density: '' })).toEqual({ tare: '140', errors: {} });
  });
});

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
