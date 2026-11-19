import { describe, expect, it } from 'vitest';
import { dueText, lentOut, locationLabels, normalizeQuantity, outstandingText } from './text';

describe('lentOut', () => {
  it('resta exacto lo disponible de la existencia', () => {
    expect(lentOut('10', '6')).toBe('4');
    expect(lentOut('0.3', '0.1')).toBe('0.2');
    expect(lentOut('5', '5')).toBe('0');
  });
});

describe('dueText y outstandingText', () => {
  it('dice la fecha prevista, la falta de plazo y el cierre', () => {
    expect(dueText({ dueOn: null, status: 'open', closedAt: null })).toBe('Sin fecha de devolución');
    expect(dueText({ dueOn: '2026-11-20', status: 'open', closedAt: null })).toMatch(/^Vence el /);
    expect(dueText({ dueOn: '2026-11-20', status: 'closed', closedAt: '2026-11-21T10:00:00-05:00' })).toMatch(/^Cerrado el /);
  });

  it('cuenta las líneas por devolver', () => {
    expect(outstandingText({ status: 'open', outstandingLines: 2, lineCount: 3 })).toBe('Falta devolver en 2 de 3 líneas');
    expect(outstandingText({ status: 'open', outstandingLines: 1, lineCount: 1 })).toBe('Falta devolver en 1 de 1 línea');
    expect(outstandingText({ status: 'closed', outstandingLines: 0, lineCount: 2 })).toBe('2 líneas');
  });
});

describe('locationLabels', () => {
  it('arma la ruta bajo la sede y deja la sede fuera', () => {
    const labels = locationLabels([
      { id: 's', name: 'Sede Norte', kind: 'site', parentId: null },
      { id: 'a', name: 'Laboratorio 1', kind: 'room', parentId: 's' },
      { id: 'e', name: 'Estante A', kind: 'storage', parentId: 'a' },
    ]);
    expect(labels.get('e')).toBe('Laboratorio 1 › Estante A');
    expect(labels.get('a')).toBe('Laboratorio 1');
    expect(labels.get('s')).toBe('Sede Norte');
  });
});

describe('normalizeQuantity', () => {
  it('acepta coma decimal y quita espacios', () => {
    expect(normalizeQuantity(' 2,5 ')).toBe('2.5');
    expect(normalizeQuantity('10')).toBe('10');
  });
});
