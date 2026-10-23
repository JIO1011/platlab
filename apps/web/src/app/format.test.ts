import { describe, expect, it } from 'vitest';
import { countText, daysBetween, formatFullDate, formatShortDateTime, formatWeekday, todayInZone } from './format';

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

describe('todayInZone', () => {
  it('toma el día civil de la zona del espacio, no el de UTC', () => {
    // 03:00 UTC del 17 aún es el 16 en Guayaquil (UTC−5) y ya es el 17 en Madrid.
    const now = Date.UTC(2026, 9, 17, 3, 0);
    expect(todayInZone('America/Guayaquil', now)).toBe('2026-10-16');
    expect(todayInZone('Europe/Madrid', now)).toBe('2026-10-17');
  });

  it('cambia de día justo a la medianoche local', () => {
    expect(todayInZone('America/Guayaquil', Date.UTC(2026, 9, 17, 4, 59))).toBe('2026-10-16');
    expect(todayInZone('America/Guayaquil', Date.UTC(2026, 9, 17, 5, 0))).toBe('2026-10-17');
  });

  it('sin `now` usa el instante actual', () => {
    expect(todayInZone('America/Guayaquil')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('daysBetween', () => {
  it('cuenta días civiles a través del fin de mes y de año', () => {
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1);
  });

  it('es negativo si `to` es anterior y cero el mismo día', () => {
    expect(daysBetween('2026-11-01', '2026-10-31')).toBe(-1);
    expect(daysBetween('2026-10-17', '2026-10-17')).toBe(0);
  });
});

describe('countText', () => {
  it('usa el singular solo con uno', () => {
    expect(countText(1, 'equipo', 'equipos')).toBe('1 equipo');
    expect(countText(0, 'equipo', 'equipos')).toBe('0 equipos');
    expect(countText(3, 'equipo', 'equipos')).toBe('3 equipos');
  });
});

describe('formatFullDate y formatWeekday', () => {
  it('ponen el día de la semana de la fecha civil, sin correrse por la zona', () => {
    expect(formatFullDate('2026-10-23')).toBe('viernes, 23 de octubre de 2026');
    expect(formatWeekday('2026-10-23', 'long')).toBe('viernes');
    expect(formatWeekday('2026-10-26', 'short')).toMatch(/^lun/);
  });
});
