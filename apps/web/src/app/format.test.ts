import { describe, expect, it } from 'vitest';
import { formatShortDateTime } from './format';

describe('formatShortDateTime', () => {
  const zone = 'America/Guayaquil';

  it('sin año si es el actual y con año si es otro', () => {
    const now = new Date().toISOString();
    expect(formatShortDateTime(now, zone)).not.toMatch(/\d{4}/);
    expect(formatShortDateTime('2020-03-01T15:00:00Z', zone)).toContain('2020');
  });

  it('con `alwaysYear` lleva el año aunque sea el actual', () => {
    expect(formatShortDateTime(new Date().toISOString(), zone, true)).toContain(String(new Date().getFullYear()));
  });
});
