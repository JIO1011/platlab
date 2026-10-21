import { FORM_STANDARD_LAYOUT } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { MIN_RESOURCE_ROWS, resourceRows } from './form-sheet';

const standard = { rows: FORM_STANDARD_LAYOUT.rows, notes: FORM_STANDARD_LAYOUT.notes };
const rowsOf = (count: number) => Array.from({ length: count }, () => ({ kind: 'row' as const }));

describe('resourceRows', () => {
  it('con la plantilla estándar rellena lo que sobra de la hoja', () => {
    // 7 elementos en la Sección I (un título y seis filas): 265 − (14 + (7 + 2) × 4,5 + 12 + 18 + 6) = 174,5 mm → 38 filas de 4,5 mm.
    expect(resourceRows(standard)).toBe(38);
  });

  it('sin Observaciones sobra más hoja', () => {
    expect(resourceRows({ ...standard, notes: false })).toBeGreaterThan(resourceRows(standard));
  });

  it('más filas en la Sección I dejan menos filas de relleno', () => {
    expect(resourceRows({ rows: rowsOf(10), notes: true })).toBeLessThan(resourceRows({ rows: rowsOf(7), notes: true }));
  });

  it('nunca baja de la capacidad mínima, aunque la hoja pase a otra página', () => {
    expect(resourceRows({ rows: rowsOf(60), notes: true })).toBe(MIN_RESOURCE_ROWS);
  });

  it('con la plantilla estándar caben al menos las filas mínimas', () => {
    expect(resourceRows(standard)).toBeGreaterThanOrEqual(MIN_RESOURCE_ROWS);
  });
});
