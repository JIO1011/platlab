import { describe, expect, it } from 'vitest';
import { inputOf, itemDetail, summarizePicks, type PickItem } from './request-picks';

const item = (positionId: string, over: Partial<PickItem> = {}): PickItem => ({
  positionId,
  containerCode: `F-${positionId}`,
  lotCode: 'L-01',
  expiresOn: '2026-12-05',
  locationName: 'Estante 2',
  available: '40',
  held: '0',
  ...over,
});

const items = [item('a', { held: '12.5' }), item('b'), item('c', { available: '3' })];

describe('los frascos de un reactivo apartado', () => {
  it('precarga cada campo con lo apartado, con coma decimal, y deja vacío el que no tiene nada', () => {
    expect(items.map((each) => inputOf(each, {}))).toEqual(['12,5', '', '']);
    expect(inputOf(item('d', { held: '0.000' }), {})).toBe('');
    expect(inputOf(items[0]!, { a: '' })).toBe('');
  });

  it('envía lo precargado tal cual, con punto decimal', () => {
    const summary = summarizePicks(items, {}, '20');
    expect(summary.picks).toEqual([{ positionId: 'a', quantity: '12.5' }]);
    expect(summary).toMatchObject({ total: '12.5', missing: '7.5', exceedsNeeded: false, canSave: true });
  });

  it('omite lo vacío y el cero, que no son errores', () => {
    const summary = summarizePicks(items, { a: '', b: '0', c: '0,00' }, '20');
    expect(summary).toMatchObject({ picks: [], issues: {}, total: '0', missing: '20', canSave: true });
  });

  it('no deja guardar si el total supera lo pedido', () => {
    const summary = summarizePicks(items, { a: '15', b: '5,5' }, '20');
    expect(summary).toMatchObject({ total: '20.5', missing: null, exceedsNeeded: true, canSave: false });
  });

  it('marca la cantidad mayor que lo disponible en ese frasco', () => {
    const summary = summarizePicks(items, { c: '3,5' }, '20');
    expect(summary.issues).toEqual({ c: 'Solo hay 3 disponible.' });
    expect(summary.canSave).toBe(false);
    expect(summarizePicks(items, { c: '3' }, '20').canSave).toBe(true);
  });

  it('marca como inválido lo que no es una cantidad decimal positiva', () => {
    for (const text of ['abc', '-1', '1,2,3', '2,', '1e3', '0,0000000001', '2 g']) {
      const summary = summarizePicks(items, { b: text }, '20');
      expect(summary.issues.b, text).toBeDefined();
      expect(summary.picks.some((pick) => pick.positionId === 'b')).toBe(false);
      expect(summary.canSave).toBe(false);
    }
  });

  it('calcula la falta exacta con decimales, sin errores de coma flotante', () => {
    const summary = summarizePicks(items, { a: '0,1', b: '0,2' }, '0.6');
    expect(summary).toMatchObject({ total: '0.3', missing: '0.3', exceedsNeeded: false });
    expect(summarizePicks(items, { a: '0,3', b: '0,3' }, '0.6')).toMatchObject({ total: '0.6', missing: null, canSave: true });
  });

  it('dice el lote, el vencimiento como dd-mm-aaaa y la ubicación', () => {
    expect(itemDetail(items[1]!)).toBe('Lote L-01 · vence 05-12-2026 · Estante 2');
    expect(itemDetail(item('e', { expiresOn: null }))).toBe('Lote L-01 · sin vencimiento · Estante 2');
  });
});
