import type { Asset } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { changedFields, createPayload, emptyForm, formOfAsset, hasPendingChanges, normalizeForm, NONE, parseMoney, parseYears } from './asset-form';

const asset: Asset = {
  id: '3f1a4b2c-0000-4000-8000-000000000001',
  code: 'EQ-0001',
  name: 'Microscopio',
  type: { id: '3f1a4b2c-0000-4000-8000-000000000002', name: 'Óptico' },
  brand: 'Olympus',
  model: null,
  serialNumber: null,
  powerSupply: '110 V',
  location: { id: '3f1a4b2c-0000-4000-8000-000000000003', code: 'L-1', name: 'Sala 1', path: ['Sala 1'], areaId: '3f1a4b2c-0000-4000-8000-000000000003' },
  responsible: null,
  condition: 'operational',
  conservation: null,
  availability: 'available',
  supplier: null,
  acquiredOn: '2024-03-01',
  warrantyUntil: '2026-03-01',
  usefulLifeYears: 10,
  replacementValue: '9800.00',
  department: null,
  photoUrl: null,
  createdAt: '2024-03-02T10:00:00Z',
};

describe('parseMoney', () => {
  it('vacío es «sin dato»', () => {
    expect(parseMoney('')).toEqual({ value: null });
    expect(parseMoney('   ')).toEqual({ value: null });
  });

  it('pasa la coma decimal a la cadena de la API con dos decimales', () => {
    expect(parseMoney('9800')).toEqual({ value: '9800.00' });
    expect(parseMoney('9800,5')).toEqual({ value: '9800.50' });
    expect(parseMoney('9800,50')).toEqual({ value: '9800.50' });
    expect(parseMoney('9.800,50')).toEqual({ value: '9800.50' });
    expect(parseMoney('1.234.567,8')).toEqual({ value: '1234567.80' });
    expect(parseMoney('12.5')).toEqual({ value: '12.50' });
    expect(parseMoney('0,05')).toEqual({ value: '0.05' });
  });

  it('el límite es de 12 enteros y 2 decimales', () => {
    expect(parseMoney('999999999999,99')).toEqual({ value: '999999999999.99' });
    expect(parseMoney('1000000000000').error).toBeDefined();
    expect(parseMoney('1,234').error).toBeDefined();
  });

  it('no adivina un punto con tres cifras: pide corregirlo', () => {
    expect(parseMoney('9.800').error).toMatch(/miles/);
    expect(parseMoney('1.234.567').error).toMatch(/miles/);
  });

  it('rechaza negativos y texto', () => {
    expect(parseMoney('-5').error).toBeDefined();
    expect(parseMoney('diez').error).toBeDefined();
    expect(parseMoney('5 USD').error).toBeDefined();
  });
});

describe('parseYears', () => {
  it('vacío es «sin dato» y 1 y 100 son los límites', () => {
    expect(parseYears('')).toEqual({ value: null });
    expect(parseYears('1')).toEqual({ value: 1 });
    expect(parseYears(' 100 ')).toEqual({ value: 100 });
  });

  it('rechaza 0, 101, decimales y texto', () => {
    expect(parseYears('0').error).toBeDefined();
    expect(parseYears('101').error).toBeDefined();
    expect(parseYears('2,5').error).toBeDefined();
    expect(parseYears('-3').error).toBeDefined();
    expect(parseYears('diez').error).toBeDefined();
  });
});

describe('normalizeForm', () => {
  it('recorta el texto y deja vacío como null', () => {
    const { fields, errors } = normalizeForm({ ...emptyForm, name: '  Balanza  ', brand: ' ', typeId: 't1' });
    expect(fields).toMatchObject({ name: 'Balanza', brand: null, responsibleId: null, conservation: null, replacementValue: null });
    expect(errors).toEqual({});
  });

  it('marca la garantía que termina antes de la compra y acepta el mismo día', () => {
    const before = normalizeForm({ ...emptyForm, acquiredOn: '2024-03-02', warrantyUntil: '2024-03-01' });
    expect(before.errors.warrantyUntil).toBeDefined();
    const same = normalizeForm({ ...emptyForm, acquiredOn: '2024-03-01', warrantyUntil: '2024-03-01' });
    expect(same.errors.warrantyUntil).toBeUndefined();
  });

  it('señala la vida útil y el valor mal escritos en su campo', () => {
    const { errors } = normalizeForm({ ...emptyForm, usefulLifeYears: '0', replacementValue: '9.800' });
    expect(Object.keys(errors).sort()).toEqual(['replacementValue', 'usefulLifeYears']);
  });
});

describe('changedFields', () => {
  const initial = normalizeForm(formOfAsset(asset)).fields;

  it('sin tocar nada no hay cambios, aunque el importe se escriba distinto', () => {
    expect(changedFields(initial, normalizeForm(formOfAsset(asset)).fields)).toEqual({});
    expect(changedFields(initial, normalizeForm({ ...formOfAsset(asset), replacementValue: '9800' }).fields)).toEqual({});
  });

  it('envía solo lo que cambió y null borra el dato', () => {
    const next = normalizeForm({ ...formOfAsset(asset), brand: '', model: 'CX23', usefulLifeYears: '12' }).fields;
    expect(changedFields(initial, next)).toEqual({ brand: null, model: 'CX23', usefulLifeYears: 12 });
  });

  it('el departamento se envía al elegirlo y null lo quita', () => {
    const owned = { ...asset, department: { id: 'd1', name: 'Química' } };
    expect(formOfAsset(owned).departmentId).toBe('d1');
    expect(formOfAsset(asset).departmentId).toBe(NONE);
    const saved = normalizeForm(formOfAsset(owned)).fields;
    expect(changedFields(saved, normalizeForm({ ...formOfAsset(owned), departmentId: NONE }).fields)).toEqual({ departmentId: null });
    expect(changedFields(initial, normalizeForm({ ...formOfAsset(asset), departmentId: 'd2' }).fields)).toEqual({ departmentId: 'd2' });
  });
});

describe('createPayload', () => {
  it('omite lo vacío, también el código, y añade ubicación y condición', () => {
    const { fields } = normalizeForm({ ...emptyForm, name: 'Balanza', typeId: 't1', brand: 'Ohaus', replacementValue: '120' });
    expect(createPayload(fields, { locationId: 'l1', condition: 'restricted' })).toEqual({
      name: 'Balanza',
      typeId: 't1',
      brand: 'Ohaus',
      replacementValue: '120.00',
      locationId: 'l1',
      condition: 'restricted',
    });
  });

  it('envía el departamento solo si se eligió', () => {
    const named = { ...emptyForm, name: 'Balanza', typeId: 't1' };
    expect(createPayload(normalizeForm(named).fields, { locationId: 'l1', condition: 'operational' })).not.toHaveProperty('departmentId');
    expect(createPayload(normalizeForm({ ...named, departmentId: 'd1' }).fields, { locationId: 'l1', condition: 'operational' })).toMatchObject({ departmentId: 'd1' });
  });

  it('con código escrito lo envía', () => {
    const { fields } = normalizeForm({ ...emptyForm, name: 'Balanza', typeId: 't1', code: ' B-1 ' });
    expect(createPayload(fields, { locationId: 'l1', condition: 'operational' })).toMatchObject({ code: 'B-1' });
  });
});

describe('hasPendingChanges', () => {
  const saved = normalizeForm(formOfAsset(asset)).fields;

  it('sin cambios ni foto, no hay nada por guardar', () => {
    expect(hasPendingChanges(saved, normalizeForm(formOfAsset(asset)), false)).toBe(false);
  });

  it('solo la foto elegida habilita guardar', () => {
    expect(hasPendingChanges(saved, normalizeForm(formOfAsset(asset)), true)).toBe(true);
  });

  it('un dato cambiado habilita guardar sin foto', () => {
    const next = normalizeForm({ ...formOfAsset(asset), brand: 'Nikon' });
    expect(hasPendingChanges(saved, next, false)).toBe(true);
  });

  it('un dato con error se muestra aunque no cambie nada más', () => {
    const next = normalizeForm({ ...formOfAsset(asset), usefulLifeYears: 'abc' });
    expect(hasPendingChanges(saved, next, false)).toBe(true);
  });
});
