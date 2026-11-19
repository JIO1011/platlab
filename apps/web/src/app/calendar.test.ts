import { describe, expect, it } from 'vitest';
import { monthWeeks, nowMinutes, parseDay, shiftMonth, weekDates } from './calendar';

describe('calendario del espacio', () => {
  it('acepta solo fechas reales AAAA-MM-DD', () => {
    expect(parseDay('2026-10-26')).toBe('2026-10-26');
    expect(parseDay('2026-02-30')).toBeNull();
    expect(parseDay('26/10/2026')).toBeNull();
    expect(parseDay(null)).toBeNull();
  });

  it('da la semana de lunes a domingo, también si el día es domingo o cruza de mes', () => {
    expect(weekDates('2026-10-28')[0]).toBe('2026-10-26');
    expect(weekDates('2026-11-01')[0]).toBe('2026-10-26');
    expect(weekDates('2026-10-26')).toHaveLength(7);
    expect(weekDates('2026-10-29').at(-1)).toBe('2026-11-01');
  });

  it('cubre un mes con las semanas que necesita, de lunes a domingo', () => {
    // Febrero de 2027 empieza en lunes y termina en domingo: cuatro semanas justas.
    expect(monthWeeks('2027-02')).toHaveLength(4);
    const october = monthWeeks('2026-10');
    expect(october[0]?.[0]).toBe('2026-09-28');
    expect(october.at(-1)?.[6]).toBe('2026-11-01');
  });

  it('mueve de mes cruzando el año', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('dice la hora del día en la zona del espacio de trabajo', () => {
    // 15:30 UTC es 10:30 en Guayaquil (UTC−5) y 16:30 en Madrid en invierno.
    const instant = Date.UTC(2026, 10, 2, 15, 30);
    expect(nowMinutes(instant, 'America/Guayaquil')).toBe(630);
    expect(nowMinutes(instant, 'Europe/Madrid')).toBe(990);
    expect(nowMinutes(Date.UTC(2026, 10, 2, 5, 5), 'America/Guayaquil')).toBe(0 * 60 + 5);
  });
});
