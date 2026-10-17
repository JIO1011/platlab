import type { Fault } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { faultOutcome, limitNote, oldestFirst, usableThenText } from './life-record';

const open: Fault = {
  id: '11111111-1111-4111-8111-111111111111',
  asset: { id: '22222222-2222-4222-8222-222222222222', code: 'EQ-001', name: 'Microscopio', photoUrl: null, location: { name: 'Lab 1', path: ['Lab 1'] } },
  faultType: 'electrical',
  description: 'No enciende',
  usable: false,
  status: 'open',
  reportedBy: { name: 'Docente' },
  reportedAt: '2026-10-10T14:00:00Z',
  attendedBy: null,
  attendedAt: null,
  resolution: null,
  resolvedBy: null,
  resolvedAt: null,
  warranty: null,
};

describe('oldestFirst', () => {
  it('invierte la lista del servidor sin tocar la original', () => {
    const fromServer = ['reciente', 'medio', 'antiguo'];
    expect(oldestFirst(fromServer)).toEqual(['antiguo', 'medio', 'reciente']);
    expect(fromServer).toEqual(['reciente', 'medio', 'antiguo']);
  });
});

describe('faultOutcome', () => {
  it('sin atender, dice «Sin atender» y deja rayas', () => {
    expect(faultOutcome(open)).toEqual({ done: 'Sin atender', solvedBy: '—', took: '—' });
  });

  it('en reparación, lo dice y deja rayas', () => {
    const repairing: Fault = { ...open, status: 'in_progress', attendedBy: { name: 'Técnico' }, attendedAt: '2026-10-11T09:00:00Z' };
    expect(faultOutcome(repairing)).toEqual({ done: 'En reparación', solvedBy: '—', took: '—' });
  });

  it('solucionado, trae lo que se hizo, quién y cuánto tardó desde el reporte', () => {
    const solved: Fault = {
      ...open,
      status: 'resolved',
      resolution: 'Se cambió el fusible',
      resolvedBy: { name: 'Óscar' },
      resolvedAt: '2026-10-13T14:00:00Z',
    };
    expect(faultOutcome(solved)).toEqual({ done: 'Se cambió el fusible', solvedBy: 'Óscar', took: '3 días' });
  });

  it('solucionado por un miembro que ya no está, lo dice', () => {
    const solved: Fault = { ...open, status: 'resolved', resolution: 'Listo', resolvedBy: null, resolvedAt: '2026-10-10T16:00:00Z' };
    expect(faultOutcome(solved)).toMatchObject({ solvedBy: 'Miembro anterior', took: '2 h' });
  });
});

describe('usableThenText', () => {
  it('responde «Sí» o «No» a «¿Se podía usar?»', () => {
    expect(usableThenText(true)).toBe('Sí');
    expect(usableThenText(false)).toBe('No');
  });
});

describe('limitNote', () => {
  it('avisa si hay más páginas o si se llegó a 1.000', () => {
    expect(limitNote(20, true)).toBe('Se imprimen los 1.000 más recientes.');
    expect(limitNote(1000, false)).toBe('Se imprimen los 1.000 más recientes.');
  });

  it('no dice nada por debajo del límite', () => {
    expect(limitNote(999, false)).toBeNull();
    expect(limitNote(0, false)).toBeNull();
  });
});
