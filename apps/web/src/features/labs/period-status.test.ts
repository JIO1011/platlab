import { describe, expect, it } from 'vitest';
import { periodState } from './period-status';

const period = { startsOn: '2026-09-07', endsOn: '2027-01-05' };

describe('periodState', () => {
  it('antes de su primer día está programado', () => {
    expect(periodState(period, '2026-09-06')).toBe('scheduled');
    expect(periodState(period, '2026-01-01')).toBe('scheduled');
  });

  it('el primer día ya es vigente', () => {
    expect(periodState(period, '2026-09-07')).toBe('current');
  });

  it('entre sus fechas es vigente', () => {
    expect(periodState(period, '2026-11-14')).toBe('current');
  });

  it('el último día sigue siendo vigente', () => {
    expect(periodState(period, '2027-01-05')).toBe('current');
  });

  it('después de su último día terminó', () => {
    expect(periodState(period, '2027-01-06')).toBe('ended');
    expect(periodState(period, '2028-01-01')).toBe('ended');
  });

  it('un período de un solo día es vigente solo ese día', () => {
    const oneDay = { startsOn: '2026-11-14', endsOn: '2026-11-14' };
    expect(periodState(oneDay, '2026-11-13')).toBe('scheduled');
    expect(periodState(oneDay, '2026-11-14')).toBe('current');
    expect(periodState(oneDay, '2026-11-15')).toBe('ended');
  });
});
