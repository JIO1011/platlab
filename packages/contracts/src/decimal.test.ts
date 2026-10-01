import { describe, expect, it } from 'vitest';
import { decimalString } from './decimal.js';

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
