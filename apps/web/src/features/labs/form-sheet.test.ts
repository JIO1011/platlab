import { describe, expect, it } from 'vitest';
import { MIN_RESOURCE_ROWS, hasTrailingGap, resourceRows } from './form-sheet';

describe('resourceRows', () => {
  it('con los tres datos extra de la plantilla rellena lo que sobra de la hoja', () => {
    // 265 − (14 + (1 + 7 + 2) × 4,5 + 12 + 18 + 6) = 170 mm → 37 filas de 4,5 mm.
    expect(resourceRows(3)).toBe(37);
  });

  it('más datos extra dejan menos filas de relleno', () => {
    expect(resourceRows(5)).toBeLessThan(resourceRows(3));
    expect(resourceRows(0)).toBeGreaterThan(resourceRows(3));
  });

  it('nunca baja de la capacidad mínima, aunque la hoja pase a otra página', () => {
    expect(resourceRows(30)).toBe(MIN_RESOURCE_ROWS);
  });

  it('con los datos de la plantilla caben al menos las filas mínimas', () => {
    expect(resourceRows(3)).toBeGreaterThanOrEqual(MIN_RESOURCE_ROWS);
  });
});

describe('hasTrailingGap', () => {
  it('los datos extra impares dejan media celda libre al final', () => {
    expect(hasTrailingGap(3)).toBe(true);
    expect(hasTrailingGap(0)).toBe(false);
    expect(hasTrailingGap(4)).toBe(false);
  });
});
