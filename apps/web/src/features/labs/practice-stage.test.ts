import { describe, expect, it } from 'vitest';
import { blockAssets, lineCodes } from './practice-assets';
import { canReportIncident, checklistNote, isChangeable, startBlockedReason, toggleLine, uncheckedCount } from './practice-stage';

describe('etapas de un bloque', () => {
  it('cambia y marca la lista solo antes de empezar', () => {
    expect(['scheduled', 'ready', 'running', 'closed'].map((stage) => isChangeable(stage as 'scheduled'))).toEqual([true, true, false, false]);
  });

  it('reporta incidencias solo en curso o cerrada', () => {
    expect(['scheduled', 'ready', 'running', 'closed'].map((stage) => canReportIncident(stage as 'scheduled'))).toEqual([false, false, true, true]);
  });

  it('marca y desmarca líneas sin repetirlas y en orden', () => {
    expect(toggleLine([3, 1], 2, true)).toEqual([1, 2, 3]);
    expect(toggleLine([1, 2], 2, true)).toEqual([1, 2]);
    expect(toggleLine([1, 2], 1, false)).toEqual([2]);
  });

  it('cuenta lo que falta marcar, sin contar líneas que ya no existen', () => {
    expect(uncheckedCount(5, [1, 2])).toBe(3);
    expect(uncheckedCount(2, [1, 2, 7])).toBe(0);
  });

  it('dice cuántas faltan sin bloquear', () => {
    expect(checklistNote(0, [])).toBeNull();
    expect(checklistNote(3, [1, 2])).toBe('Falta 1 línea por marcar.');
    expect(checklistNote(3, [])).toBe('Faltan 3 líneas por marcar.');
    expect(checklistNote(2, [1, 2])).toBe('Todas las líneas están marcadas.');
  });

  it('no inicia antes del día del bloque', () => {
    expect(startBlockedReason('2026-11-09', '2026-11-05')).toBe('Se inicia desde el día de la práctica, lun 9 nov.');
    expect(startBlockedReason('2026-11-09', '2026-11-09')).toBeNull();
    expect(startBlockedReason('2026-11-02', '2026-11-09')).toBeNull();
  });
});

describe('equipos apartados de un bloque', () => {
  const lines = [
    { kind: 'reagent', itemId: null, name: 'Sal', quantity: '1', unit: 'g', check: 'ok', available: '1' },
    { kind: 'equipment', assetTypeId: null, name: 'Balanza', perGroup: null, quantity: 2, check: 'ok', available: 2 },
  ] as const;
  const bal = (n: number) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, code: `BAL-0${n}` });
  const block = { holds: [{ line: 1, held: '1', assets: [], complete: true }, { line: 2, held: '2', assets: [bal(1), bal(2)], complete: true }] };

  it('lista los equipos con su línea', () => {
    expect(blockAssets([...lines], block)).toEqual([
      { id: bal(1).id, code: 'BAL-01', lineName: 'Balanza' },
      { id: bal(2).id, code: 'BAL-02', lineName: 'Balanza' },
    ]);
  });

  it('da los códigos de una línea para imprimir, y vacío sin bloque', () => {
    expect(lineCodes(block, 2)).toBe('BAL-01, BAL-02');
    expect(lineCodes(block, 1)).toBe('');
    expect(lineCodes(undefined, 2)).toBe('');
  });
});
