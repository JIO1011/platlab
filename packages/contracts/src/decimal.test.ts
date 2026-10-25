import { describe, expect, it } from 'vitest';
import { compareDecimals, decimalString, sumDecimals } from './decimal.js';

describe('decimalString', () => {
  it('acepta decimales exactos', () => {
    for (const value of ['100', '-0.5', '79.500000000']) {
      expect(decimalString.safeParse(value).success).toBe(true);
    }
  });

  it('rechaza notación científica, números y texto', () => {
    for (const value of ['1e3', '1,5', '', 'abc', 100]) {
      expect(decimalString.safeParse(value).success).toBe(false);
    }
  });
});

describe('compareDecimals', () => {
  it('compara exacto, con distinta escala y signo', () => {
    expect(compareDecimals('0.1', '0.10')).toBe(0);
    expect(compareDecimals('2.5', '10')).toBe(-1);
    expect(compareDecimals('100.000000001', '100')).toBe(1);
    expect(compareDecimals('-1.5', '0.2')).toBe(-1);
    expect(compareDecimals('-0.5', '-0.25')).toBe(-1);
  });
});

describe('sumDecimals', () => {
  it('suma exacto con distinta escala y sin ceros de más', () => {
    expect(sumDecimals([])).toBe('0');
    expect(sumDecimals(['1.50', '0.5'])).toBe('2');
    expect(sumDecimals(['100', '0.001'])).toBe('100.001');
    expect(sumDecimals(['0.1', '0.2'])).toBe('0.3');
    expect(sumDecimals(['50', '50'])).toBe('100');
  });
});
