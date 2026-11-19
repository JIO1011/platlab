import type { MaterialMovement } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { ledgerFilterLines, movementNote, movementReference } from './ledger-text';

const row = (extra: Partial<MaterialMovement>): MaterialMovement => ({
  id: '1',
  kind: 'issue',
  at: '2026-11-18T13:30:00.000Z',
  product: { id: '00000000-0000-4000-8000-000000000001', code: 'MAT-001', name: 'Guantes', class: 'consumable' },
  place: 'Estante A',
  lot: null,
  quantity: '-3',
  unit: 'caja',
  reference: null,
  person: null,
  actor: null,
  purpose: null,
  outcome: null,
  detail: null,
  ...extra,
});

describe('textos del libro', () => {
  it('une referencia y persona, o deja un guion', () => {
    expect(movementReference(row({ reference: 'P-0043', person: 'Diego Docente' }))).toBe('P-0043 · Diego Docente');
    expect(movementReference(row({}))).toBe('—');
  });
  it('dice quién registró, el tipo de salida y el motivo, o el daño de una baja', () => {
    expect(movementNote(row({ actor: 'Óscar', purpose: 'clinic', detail: 'Exodoncia' }))).toBe('Registró Óscar · Clínica · Exodoncia');
    expect(movementNote(row({ kind: 'writeoff', outcome: 'damaged', detail: 'Se rompió' }))).toBe('Dañado: Se rompió');
    expect(movementNote(row({}))).toBeNull();
  });
  it('pone los filtros en palabras para la hoja impresa', () => {
    expect(ledgerFilterLines({})).toEqual([]);
    expect(ledgerFilterLines({ kind: 'issue', purpose: 'practice', from: '2026-11-01', q: 'guantes' })).toEqual([
      'Movimiento: Salida',
      'Periodo: 1 nov 2026 a hoy',
      'Tipo de salida: Práctica',
      'Búsqueda: «guantes»',
    ]);
  });
});
