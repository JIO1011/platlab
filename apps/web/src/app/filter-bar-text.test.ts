import { describe, expect, it } from 'vitest';
import { rangeText, triggerText } from './filter-bar-text';

describe('triggerText', () => {
  it('dice solo el nombre sin nada elegido', () => {
    expect(triggerText('Tipo', [])).toBe('Tipo');
  });
  it('nombra la única opción elegida', () => {
    expect(triggerText('Tipo', ['Calibración'])).toBe('Tipo: Calibración');
  });
  it('cuenta cuando hay varias', () => {
    expect(triggerText('Tipo', ['Calibración', 'Limpieza'])).toBe('Tipo: 2');
  });
});

describe('rangeText', () => {
  it('dice los dos extremos', () => {
    expect(rangeText('2026-10-01', '2026-10-19')).toBe('01/10/2026 – 19/10/2026');
  });
  it('dice el extremo que hay', () => {
    expect(rangeText('2026-10-01', null)).toBe('Desde 01/10/2026');
    expect(rangeText(null, '2026-10-19')).toBe('Hasta 19/10/2026');
  });
  it('no dice nada sin extremos', () => {
    expect(rangeText(null, null)).toBeNull();
  });
});
