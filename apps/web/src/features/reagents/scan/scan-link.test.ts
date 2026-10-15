import { describe, expect, it } from 'vitest';
import { frascoCode } from '../frasco-link';
import { readLabelLink } from './scan-link';

const code = frascoCode('3f0c9a52-8d2e-4b7a-9c41-6e5d1a2b3c4d', '0b1c2d3e-4f50-4617-8899-aabbccddeeff');

describe('readLabelLink', () => {
  it('lleva a la ruta del frasco desde el enlace completo de la etiqueta', () => {
    expect(readLabelLink(`https://platlab.example/q/${code}`)).toBe(`/q/${code}`);
    expect(readLabelLink(`  http://localhost:5173/q/${code}/ \n`)).toBe(`/q/${code}`);
  });

  it('acepta la ruta sola', () => {
    expect(readLabelLink(`/q/${code}`)).toBe(`/q/${code}`);
  });

  it('rechaza cualquier otro contenido', () => {
    expect(readLabelLink('')).toBeNull();
    expect(readLabelLink('https://example.com')).toBeNull();
    expect(readLabelLink('7647-14-5')).toBeNull();
    expect(readLabelLink(`https://platlab.example/otra/${code}`)).toBeNull();
    expect(readLabelLink(`https://platlab.example/q/${code.slice(1)}`)).toBeNull();
    expect(readLabelLink(`https://platlab.example/q/${'a'.repeat(42)}!`)).toBeNull();
  });
});
