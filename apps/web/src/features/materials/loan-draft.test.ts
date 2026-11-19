import type { MaterialStockLine } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { lineProblem, pickMaterial, positionChoices, stepLine, ticketTotals, type DraftLine } from './loan-draft';

const position = (positionId: string, available: string): MaterialStockLine => ({
  positionId,
  productId: 'p1',
  locationId: `l-${positionId}`,
  locationName: positionId,
  locationPath: [positionId],
  balance: available,
  available,
  unit: 'u',
  lot: null,
  expiresOn: null,
});
const glass = { id: 'p1', name: 'Vasos', baseUnit: 'u' };
const stock = [position('a', '3'), position('b', '5')];

describe('pickMaterial', () => {
  it('agrega el material con una unidad de la ubicación con más disponible', () => {
    const [line] = pickMaterial([], glass, stock);
    expect(line).toMatchObject({ positionId: 'b', quantity: '1', unit: 'u' });
  });
  it('tocar de nuevo suma una unidad y, al llegar al tope, abre otra ubicación', () => {
    let lines = pickMaterial([], glass, [position('a', '2')]);
    lines = pickMaterial(lines, glass, [position('a', '2')]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe('2');
    expect(pickMaterial(lines, glass, [position('a', '2')])).toHaveLength(1);
    const two = pickMaterial(lines, glass, [position('a', '2'), position('b', '1')]);
    expect(two.map((line) => line.positionId)).toEqual(['a', 'b']);
  });
  it('sin disponible no agrega nada', () => {
    expect(pickMaterial([], glass, [position('a', '0')])).toEqual([]);
  });
});

describe('stepLine', () => {
  const base: DraftLine = { key: 'k', productId: 'p1', name: 'Vasos', unit: 'u', positions: [position('a', '2')], positionId: 'a', quantity: '1' };
  it('suma sin pasar de lo disponible y quita la línea al restar la última unidad', () => {
    const up = stepLine([base], 'k', 1);
    expect(up[0]?.quantity).toBe('2');
    expect(stepLine(up, 'k', 1)[0]?.quantity).toBe('2');
    expect(stepLine([base], 'k', -1)).toEqual([]);
  });
});

describe('lineProblem, positionChoices y ticketTotals', () => {
  const line = (key: string, positionId: string, quantity: string): DraftLine => ({ key, productId: 'p1', name: 'Vasos', unit: 'u', positions: stock, positionId, quantity });
  it('avisa lo que impide prestar una línea', () => {
    expect(lineProblem(line('x', 'a', ''))).toBe('Escribe una cantidad mayor que cero');
    expect(lineProblem(line('x', 'a', '4'))).toBe('Hay 3 u disponibles');
    expect(lineProblem(line('x', 'a', '3'))).toBeNull();
  });
  it('no ofrece una ubicación que otra línea del mismo material ya usa', () => {
    const lines = [line('x', 'a', '1'), line('y', 'b', '1')];
    expect(positionChoices(lines, lines[0]!).map((p) => p.positionId)).toEqual(['a']);
  });
  it('cuenta materiales distintos y suma las unidades válidas', () => {
    expect(ticketTotals([line('x', 'a', '2'), line('y', 'b', '3'), line('z', 'b', 'abc')])).toEqual({ materials: 1, units: '5' });
  });
});
