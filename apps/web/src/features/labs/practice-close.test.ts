import type { LabsRequest } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { closeRows, quantityText, summarizeClose } from './practice-close';

const lines: LabsRequest['lines'] = [
  { kind: 'reagent', itemId: null, name: 'Cloruro de sodio', quantity: '50', unit: 'g', check: 'ok', available: '80' },
  { kind: 'equipment', assetTypeId: null, name: 'Balanza', perGroup: null, quantity: 2, check: 'ok', available: 2 },
  { kind: 'reagent', itemId: null, name: 'Etanol', quantity: '1', unit: 'L', check: 'ok', available: '5' },
];
const asset = { id: '00000000-0000-4000-8000-000000000001', code: 'BAL-01' };
const holds = [
  { line: 1, held: '50', assets: [], complete: true },
  { line: 2, held: '1', assets: [asset], complete: false },
  { line: 3, held: '0', assets: [], complete: false },
];

describe('cerrar la práctica', () => {
  it('rinde solo los reactivos con algo apartado', () => {
    expect(closeRows(lines, { holds })).toEqual([{ line: 1, name: 'Cloruro de sodio', unit: 'g', held: '50' }]);
  });

  it('exige lo utilizado de cada reactivo', () => {
    const summary = summarizeClose(closeRows(lines, { holds }), {});
    expect(summary.canClose).toBe(false);
    expect(summary.lines[0]).toMatchObject({ blank: true, issue: 'Indica cuánto se utilizó, aunque sea 0.', used: null, returned: null });
    expect(summary.usage).toEqual([]);
  });

  it('acepta coma o punto y calcula lo devuelto con decimales exactos', () => {
    const rows = closeRows(lines, { holds: [{ line: 1, held: '50.3', assets: [], complete: true }] });
    const comma = summarizeClose(rows, { 1: '12,1' });
    expect(comma.lines[0]).toMatchObject({ used: '12.1', returned: '38.2', issue: null });
    expect(comma.usage).toEqual([{ line: 1, used: '12.1' }]);
    expect(summarizeClose(rows, { 1: '12.1' }).usage).toEqual(comma.usage);
    expect(summarizeClose(rows, { 1: '0,1' }).lines[0]?.returned).toBe('50.2');
  });

  it('acepta cero y todo lo apartado', () => {
    const rows = closeRows(lines, { holds });
    expect(summarizeClose(rows, { 1: '0' })).toMatchObject({ canClose: true, lines: [{ returned: '50' }] });
    expect(summarizeClose(rows, { 1: '50' })).toMatchObject({ canClose: true, lines: [{ returned: '0' }] });
  });

  it('rechaza lo que supera lo apartado o no es una cantidad', () => {
    const rows = closeRows(lines, { holds });
    expect(summarizeClose(rows, { 1: '50,1' }).lines[0]).toMatchObject({ blank: false, issue: 'Solo se apartó 50 g.', returned: null });
    expect(summarizeClose(rows, { 1: '-1' }).canClose).toBe(false);
    expect(summarizeClose(rows, { 1: 'abc' }).lines[0]?.issue).toBe('Escribe una cantidad de cero o más, como 2,5.');
  });

  it('dice la cantidad con su unidad', () => {
    expect(quantityText('1250', 'g')).toBe('1.250 g');
    expect(quantityText('3', '')).toBe('3');
  });
});
