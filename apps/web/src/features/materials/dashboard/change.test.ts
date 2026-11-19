import { describe, expect, it } from 'vitest';
import { changePercent, weekLabel } from './change';

describe('changePercent', () => {
  it('compara con el periodo anterior', () => {
    expect(changePercent(12, 10)).toBe(20);
    expect(changePercent(5, 10)).toBe(-50);
    expect(changePercent(0, 0)).toBe(0);
  });
  it('sin base anterior no inventa un porcentaje', () => {
    expect(changePercent(3, 0)).toBeNull();
  });
});

describe('weekLabel', () => {
  it('escribe el día y el mes cortos', () => {
    expect(weekLabel('2026-11-03')).toMatch(/3 nov/);
  });
});
