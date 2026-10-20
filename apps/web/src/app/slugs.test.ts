import { describe, expect, it } from 'vitest';
import { invertSlugs } from './slugs';

describe('invertSlugs', () => {
  it('lee la palabra de la URL y devuelve el código de la API', () => {
    const slugs = { good: 'bueno', none: 'sin-dato' } as const;
    expect(invertSlugs(slugs)).toEqual({ bueno: 'good', 'sin-dato': 'none' });
  });

  it('una palabra desconocida no tiene código', () => {
    expect(invertSlugs({ pass: 'conforme' })['otra']).toBeUndefined();
  });
});
