import type { LabsRequest } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { holdRows } from './request-hold-rows';

const lines: LabsRequest['lines'] = [
  { kind: 'reagent', itemId: null, name: 'Cloruro de sodio', quantity: '50', unit: 'g', check: 'ok', available: '80' },
  { kind: 'equipment', assetTypeId: null, name: 'Balanza', perGroup: null, quantity: 2, check: 'ok', available: 2 },
  { kind: 'material', name: 'Guantes', perGroup: null, quantity: '10', check: 'unverified' },
];

const asset = (code: string) => ({ id: '00000000-0000-4000-8000-000000000001', code });

describe('lo apartado por línea', () => {
  it('dice cuánto se apartó y cuánto falta, con restas exactas', () => {
    const rows = holdRows(lines, { holds: [{ line: 1, held: '30', assets: [], complete: false }] });
    expect(rows).toEqual([{ line: 1, text: 'Cloruro de sodio: apartado 30 de 50 g', missing: 'Falta 20 g' }]);
    expect(holdRows(lines, { holds: [{ line: 1, held: '0.1', assets: [], complete: false }] })[0]?.missing).toBe('Falta 49,9 g');
  });

  it('no marca falta cuando alcanza', () => {
    expect(holdRows(lines, { holds: [{ line: 1, held: '50', assets: [], complete: true }] })[0]?.missing).toBeNull();
  });

  it('lista los códigos de los equipos y cuántos faltan', () => {
    expect(holdRows(lines, { holds: [{ line: 2, held: '2', assets: [asset('BAL-01'), asset('BAL-02')], complete: true }] })).toEqual([{ line: 2, text: 'Balanza: BAL-01, BAL-02', missing: null }]);
    expect(holdRows(lines, { holds: [{ line: 2, held: '1', assets: [asset('BAL-01')], complete: false }] })[0]?.missing).toBe('Falta 1 balanza');
    expect(holdRows(lines, { holds: [{ line: 2, held: '0', assets: [], complete: false }] })[0]).toEqual({ line: 2, text: 'Balanza: ninguno apartado', missing: 'Faltan 2 de balanza' });
  });

  it('ignora lo que no se reserva o no existe', () => {
    expect(holdRows(lines, { holds: [{ line: 3, held: '0', assets: [], complete: true }, { line: 9, held: '0', assets: [], complete: true }] })).toEqual([]);
  });
});
