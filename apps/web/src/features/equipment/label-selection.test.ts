import { describe, expect, it } from 'vitest';
import {
  dropTypes,
  dropUnits,
  isUnitPicked,
  noSelection,
  pickTypes,
  pickUnits,
  pickedBySearch,
  selectionCount,
  selectionSearch,
  toggleType,
  toggleUnit,
  typePicked,
} from './label-selection';

const microscope = (id: string) => ({ id, typeId: 'microscope' });
const balance = (id: string) => ({ id, typeId: 'balance' });
/** Cuántas unidades tiene cada tipo con el filtro de estado actual. */
const totals: Record<string, number> = { microscope: 50, balance: 4 };
const totalOf = (typeId: string) => totals[typeId] ?? 0;

describe('elegir un tipo', () => {
  it('elige todas sus unidades y cuenta su cantidad', () => {
    const selection = pickTypes(noSelection, ['microscope']);
    expect(isUnitPicked(selection, microscope('m1'))).toBe(true);
    expect(isUnitPicked(selection, balance('b1'))).toBe(false);
    expect(selectionCount(selection, totalOf)).toBe(50);
  });

  it('absorbe las unidades sueltas de ese tipo y deja las de otros', () => {
    const loose = pickUnits(noSelection, [microscope('m1'), microscope('m2'), balance('b1')]);
    const selection = pickTypes(loose, ['microscope']);
    expect(selection.units.has('m1')).toBe(false);
    expect(selection.units.get('b1')).toBe('balance');
    expect(selectionCount(selection, totalOf)).toBe(51);
  });

  it('tocar un tipo entero lo quita; a medias, lo elige entero', () => {
    const whole = toggleType(noSelection, 'balance', 4);
    expect(typePicked(whole, 'balance', 4)).toBe(4);
    expect(typePicked(toggleType(whole, 'balance', 4), 'balance', 4)).toBe(0);
    const partial = pickUnits(noSelection, [balance('b1')]);
    expect(typePicked(partial, 'balance', 4)).toBe(1);
    expect(typePicked(toggleType(partial, 'balance', 4), 'balance', 4)).toBe(4);
  });
});

describe('excluir y volver a incluir', () => {
  it('tocar una unidad de un tipo elegido la excluye y se descuenta', () => {
    const selection = toggleUnit(pickTypes(noSelection, ['microscope']), microscope('m7'));
    expect(isUnitPicked(selection, microscope('m7'))).toBe(false);
    expect(isUnitPicked(selection, microscope('m8'))).toBe(true);
    expect(typePicked(selection, 'microscope', 50)).toBe(49);
    expect(selectionCount(selection, totalOf)).toBe(49);
  });

  it('tocarla otra vez la incluye de nuevo', () => {
    const excluded = toggleUnit(pickTypes(noSelection, ['microscope']), microscope('m7'));
    const selection = toggleUnit(excluded, microscope('m7'));
    expect(isUnitPicked(selection, microscope('m7'))).toBe(true);
    expect(selectionCount(selection, totalOf)).toBe(50);
  });

  it('tocar una unidad de un tipo no elegido la deja suelta, y otra vez la quita', () => {
    const loose = toggleUnit(noSelection, balance('b2'));
    expect(loose.units.get('b2')).toBe('balance');
    expect(selectionCount(loose, totalOf)).toBe(1);
    expect(selectionCount(toggleUnit(loose, balance('b2')), totalOf)).toBe(0);
  });

  it('no modifica la elección anterior', () => {
    const before = pickTypes(noSelection, ['microscope']);
    toggleUnit(before, microscope('m7'));
    expect(before.types.get('microscope')?.size).toBe(0);
  });
});

describe('cuenta con el filtro de estado', () => {
  it('usa la cantidad que da el filtro actual, no el total del tipo', () => {
    const selection = pickTypes(noSelection, ['microscope', 'balance']);
    expect(selectionCount(selection, (typeId) => (typeId === 'microscope' ? 3 : 0))).toBe(3);
  });

  it('suma tipos enteros, exclusiones y sueltas', () => {
    let selection = pickTypes(noSelection, ['microscope']);
    selection = dropUnits(selection, [microscope('m1'), microscope('m2')]);
    selection = pickUnits(selection, [balance('b1')]);
    expect(selectionCount(selection, totalOf)).toBe(48 + 1);
  });
});

describe('quitar de lo visible', () => {
  it('quitar tipos los saca de la elección', () => {
    const selection = dropTypes(pickTypes(noSelection, ['microscope', 'balance']), ['balance']);
    expect(selection.types.has('balance')).toBe(false);
    expect(selection.types.has('microscope')).toBe(true);
  });

  it('elegir de nuevo un tipo olvida sus exclusiones', () => {
    const excluded = dropUnits(pickTypes(noSelection, ['microscope']), [microscope('m1')]);
    expect(typePicked(pickTypes(excluded, ['microscope']), 'microscope', 50)).toBe(50);
  });
});

describe('en la URL', () => {
  it('sin elección no escribe nada', () => {
    expect(selectionSearch(noSelection).toString()).toBe('');
  });

  it('escribe tipos, exclusiones y sueltas, y la página los lee de vuelta', () => {
    let selection = pickTypes(noSelection, ['microscope']);
    selection = dropUnits(selection, [microscope('m1')]);
    selection = pickUnits(selection, [balance('b1')]);
    const search = selectionSearch(selection);
    expect(search.get('tipos')).toBe('microscope');
    expect(search.get('excluir')).toBe('m1');
    expect(search.get('equipos')).toBe('b1');
    const picked = pickedBySearch(search);
    expect(picked?.({ id: 'm2', type: { id: 'microscope' } })).toBe(true);
    expect(picked?.({ id: 'm1', type: { id: 'microscope' } })).toBe(false);
    expect(picked?.({ id: 'b1', type: { id: 'balance' } })).toBe(true);
    expect(picked?.({ id: 'b2', type: { id: 'balance' } })).toBe(false);
  });

  it('sin tipos ni equipos, la página muestra todas', () => {
    expect(pickedBySearch(new URLSearchParams('q=ab'))).toBeNull();
  });
});
