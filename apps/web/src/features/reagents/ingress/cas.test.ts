import { describe, expect, it } from 'vitest';
import { checkCas } from './cas';

describe('checkCas', () => {
  it('acepta CAS reales con su dígito de control', () => {
    for (const cas of ['64-17-5', '7647-14-5', '7647-01-0', '7664-93-9', '67-64-1', '1310-73-2']) {
      expect(checkCas(cas)).toBe('valid');
    }
  });

  it('rechaza un dígito de control equivocado o un formato imposible', () => {
    expect(checkCas('64-17-6')).toBe('invalid');
    expect(checkCas('abc')).toBe('invalid');
    expect(checkCas('64-17-55')).toBe('invalid');
  });

  it('no marca error mientras se escribe', () => {
    expect(checkCas('')).toBe('empty');
    expect(checkCas('64-1')).toBe('partial');
    expect(checkCas('64-')).toBe('partial');
  });
});
