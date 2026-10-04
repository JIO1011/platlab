import { describe, expect, it } from 'vitest';
import { formatDecimal, normalizeDecimalInput, percentOfDecimal, ratioPercent, subtractDecimal } from './decimal';

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

describe('percentOfDecimal y subtractDecimal', () => {
  it('calculan atajos y restos sin errores de coma flotante', () => {
    expect(percentOfDecimal('79.5', 25)).toBe('19.875');
    expect(percentOfDecimal('0.3', 50)).toBe('0.15');
    expect(percentOfDecimal('1', 33)).toBe('0.33');
    expect(percentOfDecimal('2260', 100)).toBe('2260');
    expect(subtractDecimal('0.3', '0.1')).toBe('0.2');
    expect(subtractDecimal('80', '100')).toBe('-20');
    expect(subtractDecimal('79.5', '79.5')).toBe('0');
  });

  it('redondean hacia abajo a 9 decimales y rechazan lo que no es decimal', () => {
    expect(percentOfDecimal('0.000000001', 50)).toBe('0');
    expect(percentOfDecimal('1e3', 50)).toBeNull();
    expect(subtractDecimal('10', 'abc')).toBeNull();
  });
});

describe('ratioPercent', () => {
  it('da el % entero acotado entre 0 y 100', () => {
    expect(ratioPercent('79.5', '100')).toBe(79);
    expect(ratioPercent('2260', '2500')).toBe(90);
    expect(ratioPercent('120', '100')).toBe(100);
    expect(ratioPercent('0', '500')).toBe(0);
    expect(ratioPercent('5', '0')).toBeNull();
  });
});
