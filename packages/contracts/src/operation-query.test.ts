import { describe, expect, it } from 'vitest';
import { operationFacetsQuery, operationListQuery, operationTotalsQuery } from './reagents.js';

const A = 'da000000-0000-4000-8000-00000000000a';

describe('filtros de Movimientos (ADR 0014)', () => {
  it('un valor suelto y los repetidos llegan como lista, sin repetidos', () => {
    expect(operationListQuery.parse({ type: 'issue', days: '30' })).toEqual({ type: ['issue'], days: 30, limit: 50 });
    expect(operationListQuery.parse({ type: ['issue', 'adjustment', 'issue'], productId: [A] })).toMatchObject({
      type: ['issue', 'adjustment'],
      productId: [A],
    });
    expect(operationListQuery.parse({})).toEqual({ limit: 50 });
  });

  it('el periodo es por días o por fechas válidas y ordenadas', () => {
    expect(operationFacetsQuery.parse({ from: '2026-03-10', to: '2026-03-10' })).toEqual({ from: '2026-03-10', to: '2026-03-10' });
    expect(operationFacetsQuery.parse({ to: '2026-03-10' })).toEqual({ to: '2026-03-10' });
    for (const invalid of [
      { from: '2026-03-11', to: '2026-03-10' },
      { days: '7', from: '2026-03-10' },
      { from: '2026-02-30' },
      { type: [] },
      { type: 'baja' },
      { destination: '' },
      { productId: Array.from({ length: 101 }, () => A) },
    ]) {
      expect(operationListQuery.safeParse(invalid).success).toBe(false);
    }
  });

  it('los totales exigen cómo agrupar; los conteos no aceptan página', () => {
    expect(operationTotalsQuery.safeParse({}).success).toBe(false);
    expect(operationTotalsQuery.parse({ groupBy: 'month', reason: 'Conteo' })).toEqual({ groupBy: 'month', reason: ['Conteo'] });
    expect(operationFacetsQuery.safeParse({ limit: '5' }).success).toBe(false);
    expect(operationFacetsQuery.parse({ productQuery: '  nacl ' })).toEqual({ productQuery: 'nacl' });
  });
});
