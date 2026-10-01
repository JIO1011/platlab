import { describe, expect, it } from 'vitest';
import { requestHash } from './idempotency.js';

describe('requestHash', () => {
  it('no depende del orden de las claves, tampoco en objetos anidados', () => {
    expect(requestHash({ quantity: '20', unit: 'g', detail: { b: 1, a: [1, 2] } })).toBe(
      requestHash({ detail: { a: [1, 2], b: 1 }, unit: 'g', quantity: '20' }),
    );
  });

  it('distingue contenidos distintos, el orden de los arreglos y el tipo de cada valor', () => {
    const base = requestHash({ quantity: '20' });
    expect(requestHash({ quantity: '20.0' })).not.toBe(base);
    expect(requestHash({ quantity: 20 })).not.toBe(base);
    expect(requestHash({ lines: [1, 2] })).not.toBe(requestHash({ lines: [2, 1] }));
  });

  it('ignora propiedades sin valor y rechaza lo que no es JSON', () => {
    expect(requestHash({ quantity: '20', note: undefined })).toBe(requestHash({ quantity: '20' }));
    expect(() => requestHash({ quantity: Number.NaN })).toThrow(TypeError);
    expect(() => requestHash({ at: () => 0 })).toThrow(TypeError);
  });

  it('produce un SHA-256 hexadecimal', () => {
    expect(requestHash({})).toMatch(/^[0-9a-f]{64}$/);
  });
});
