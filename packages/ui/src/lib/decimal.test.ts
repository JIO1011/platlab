import { describe, expect, it } from 'vitest';
import { formatDecimal, normalizeDecimalInput } from './decimal';

describe('formatDecimal', () => {
  it('usa coma decimal, punto de miles y el signo menos tipográfico', () => {
    expect(formatDecimal('79.5')).toBe('79,5');
    expect(formatDecimal('1234567.125')).toBe('1.234.567,125');
    expect(formatDecimal('-0.5')).toBe('−0,5');
    expect(formatDecimal('100')).toBe('100');
  });

  it('no pierde precisión en cantidades largas', () => {
    expect(formatDecimal('123456789012345.123456789')).toBe('123.456.789.012.345,123456789');
  });
});

describe('normalizeDecimalInput', () => {
  it('convierte la coma decimal y los miles a la cadena de la API', () => {
    expect(normalizeDecimalInput(' 79,5 ')).toBe('79.5');
    expect(normalizeDecimalInput('1.234,5')).toBe('1234.5');
    expect(normalizeDecimalInput('−0,5')).toBe('-0.5');
  });

  it('respeta el punto decimal cuando no hay coma', () => {
    expect(normalizeDecimalInput('20.25')).toBe('20.25');
  });
});
