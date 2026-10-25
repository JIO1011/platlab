import { describe, expect, it } from 'vitest';
import { activityCode, isoWeekday, periodWeek, scheduleCheck, type ScheduleContext } from './schedule.js';

const closed = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [] };
// 2027-03-01 es lunes.
const context: ScheduleContext = {
  today: '2027-02-20',
  participants: 20,
  space: { capacity: 24, weeklyHours: { ...closed, '1': [{ opens: '07:00', closes: '13:00' }, { opens: '14:00', closes: '18:00' }] } },
  periods: [{ startsOn: '2027-01-04', endsOn: '2027-06-30' }],
  closures: [],
  others: [{ startsAt: '08:00', endsAt: '10:00' }],
};
const slot = { date: '2027-03-01', startsAt: '10:00', endsAt: '12:00' };

describe('scheduleCheck', () => {
  it('admite un lugar libre, en horario, en período y en el futuro; un bloque empieza cuando otro termina', () => {
    expect(scheduleCheck(slot, context)).toEqual({ blocking: [], warnings: [] });
  });

  it('bloquea el pasado, fuera de período, cerrado, fuera de horario y el choque', () => {
    expect(scheduleCheck({ ...slot, date: '2027-02-20' }, context).blocking).toContain('past');
    expect(scheduleCheck({ ...slot, date: '2027-07-05' }, context).blocking).toContain('period');
    expect(scheduleCheck(slot, { ...context, closures: [{ startsOn: '2027-03-01', endsOn: '2027-03-01' }] }).blocking).toEqual(['closed']);
    // Cruza el almuerzo y el martes está cerrado.
    expect(scheduleCheck({ ...slot, startsAt: '12:00', endsAt: '15:00' }, context).blocking).toEqual(['hours']);
    expect(scheduleCheck({ ...slot, date: '2027-03-02' }, context).blocking).toEqual(['hours']);
    expect(scheduleCheck({ ...slot, startsAt: '09:00', endsAt: '11:00' }, context).blocking).toEqual(['overlap']);
  });

  it('superar el aforo solo avisa', () => {
    expect(scheduleCheck(slot, { ...context, participants: 30 })).toEqual({ blocking: [], warnings: ['capacity'] });
  });
});

describe('código del bloque', () => {
  it('cuenta la semana desde el inicio del período y forma P1-S12-ANT03', () => {
    expect(periodWeek('2027-01-04', '2027-01-04')).toBe(1);
    expect(periodWeek('2027-01-04', '2027-01-10')).toBe(1);
    expect(periodWeek('2027-01-04', '2027-03-22')).toBe(12);
    expect(activityCode('P1', 12, 'ANT', 3)).toBe('P1-S12-ANT03');
  });

  it('el día ISO no depende de la zona', () => {
    expect(isoWeekday('2027-03-01')).toBe(1);
    expect(isoWeekday('2027-03-07')).toBe(7);
  });
});
