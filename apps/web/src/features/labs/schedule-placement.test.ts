import { scheduleCheck, type Activity, type Closure, type Period, type RequestSummary, type Space, type WeeklyHours } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import {
  blockingTexts,
  capacityText,
  chipDateText,
  contextFor,
  defaultDate,
  durationOf,
  endFor,
  isToSchedule,
  pendingDates,
  previewText,
  progressText,
  requestBlockText,
  scheduledMessage,
  slotAt,
  snapTo,
  startAtOffset,
  toScheduleOrder,
} from './schedule-placement';

const day: WeeklyHours['1'] = [{ opens: '07:00', closes: '18:00' }];
const weekly: WeeklyHours = { '1': day, '2': day, '3': day, '4': day, '5': day, '6': [], '7': [] };
const space: Pick<Space, 'areaId' | 'capacity' | 'weeklyHours'> = { areaId: 'area-1', capacity: 24, weeklyHours: weekly };
const range = { start: 420, end: 1080 };

const period = (overrides: Partial<Period> = {}): Period => ({
  id: 'p-1',
  code: 'P1',
  startsOn: '2026-10-01',
  endsOn: '2027-02-28',
  version: 1,
  archivedAt: null,
  ...overrides,
});

const closure = (overrides: Partial<Closure> = {}): Closure => ({
  id: 'c-1',
  areaId: null,
  areaName: null,
  startsOn: '2026-10-29',
  endsOn: '2026-10-29',
  reason: 'Feriado',
  voidedAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'a-1',
  requestId: 'r-1',
  requestCode: 'SOL-0001',
  title: 'Titulación',
  requesterName: 'Ana Pérez',
  subject: null,
  group: null,
  participants: 20,
  date: '2026-10-28',
  areaId: 'area-1',
  startsAt: '08:00',
  endsAt: '10:00',
  responsibleId: 'p-1',
  responsibleName: 'Luis Mora',
  code: 'P1-S5-ANT01',
  version: 1,
  ...overrides,
});

const summary = (overrides: Partial<RequestSummary> = {}): RequestSummary => ({
  id: 'r-1',
  number: 1,
  code: 'SOL-0001',
  status: 'submitted',
  formName: 'P69',
  title: 'Titulación',
  requesterName: 'Ana Pérez',
  firstDate: '2026-10-28',
  dateCount: 2,
  late: false,
  exceptions: 0,
  scheduledCount: 0,
  dates: ['2026-10-28', '2026-10-30'],
  scheduledDates: [],
  startsAt: '08:00',
  endsAt: '10:00',
  participants: 20,
  subject: null,
  group: null,
  submittedAt: '2026-10-20T10:00:00Z',
  version: 1,
  ...overrides,
});

describe('hora desde la posición', () => {
  it('encaja a 15 minutos', () => {
    expect(snapTo(487)).toBe(480);
    expect(snapTo(488)).toBe(495);
    expect(snapTo(0)).toBe(0);
  });

  it('da la hora del punto de la columna, encajada', () => {
    // 660 px de columna para 660 minutos (420 a 1080): un píxel por minuto.
    expect(startAtOffset({ offset: 0, height: 660, range, duration: 60 })).toBe(420);
    expect(startAtOffset({ offset: 66, height: 660, range, duration: 60 })).toBe(480);
    expect(startAtOffset({ offset: 100, height: 660, range, duration: 60 })).toBe(525);
  });

  it('deja el bloque dentro del rango, también por arriba y por abajo', () => {
    expect(startAtOffset({ offset: -40, height: 660, range, duration: 60 })).toBe(420);
    expect(startAtOffset({ offset: 660, height: 660, range, duration: 120 })).toBe(960);
    expect(startAtOffset({ offset: 300, height: 660, range: { start: 420, end: 480 }, duration: 120 })).toBe(420);
  });

  it('termina el bloque a su duración y no pasa de las 23:59', () => {
    expect(endFor(480, 120)).toBe(600);
    expect(endFor(23 * 60, 120)).toBe(23 * 60 + 59);
    expect(slotAt('2026-10-28', 480, 90)).toEqual({ date: '2026-10-28', startsAt: '08:00', endsAt: '09:30' });
  });

  it('toma la duración del horario pedido', () => {
    expect(durationOf({ startsAt: '08:00', endsAt: '10:30' })).toBe(150);
    expect(durationOf({ startsAt: null, endsAt: '10:30' })).toBeNull();
    expect(durationOf({ startsAt: '10:00', endsAt: '09:00' })).toBeNull();
  });
});

describe('contexto de scheduleCheck', () => {
  const base = { today: '2026-10-23', participants: 20, space, periods: [period()], closures: [], activities: [], date: '2026-10-28' };

  it('un lugar libre no bloquea ni avisa', () => {
    const check = scheduleCheck(slotAt('2026-10-28', 480, 120), contextFor(base));
    expect(check).toEqual({ blocking: [], warnings: [] });
  });

  it('solo cuenta los bloques del área y del día, y no el que se mueve', () => {
    const activities = [
      activity(),
      activity({ id: 'a-2', areaId: 'area-2', startsAt: '08:00', endsAt: '10:00' }),
      activity({ id: 'a-3', date: '2026-10-29', startsAt: '08:00', endsAt: '10:00' }),
    ];
    expect(contextFor({ ...base, activities }).others).toHaveLength(1);
    expect(scheduleCheck(slotAt('2026-10-28', 540, 120), contextFor({ ...base, activities })).blocking).toEqual(['overlap']);
    expect(contextFor({ ...base, activities, ignoreId: 'a-1' }).others).toHaveLength(0);
    // Un bloque que empieza cuando otro termina no choca.
    expect(scheduleCheck(slotAt('2026-10-28', 600, 60), contextFor({ ...base, activities })).blocking).toEqual([]);
  });

  it('ignora períodos archivados y cierres anulados o de otra área', () => {
    const archived = period({ archivedAt: '2026-10-02T00:00:00Z' });
    expect(scheduleCheck(slotAt('2026-10-28', 480, 60), contextFor({ ...base, periods: [archived] })).blocking).toEqual(['period']);
    const closures = [
      closure({ startsOn: '2026-10-28', endsOn: '2026-10-28', voidedAt: '2026-10-05T00:00:00Z' }),
      closure({ startsOn: '2026-10-28', endsOn: '2026-10-28', areaId: 'area-2' }),
    ];
    expect(contextFor({ ...base, closures }).closures).toHaveLength(0);
    const own = closure({ startsOn: '2026-10-28', endsOn: '2026-10-28', areaId: 'area-1' });
    expect(scheduleCheck(slotAt('2026-10-28', 480, 60), contextFor({ ...base, closures: [own] })).blocking).toEqual(['closed']);
  });

  it('explica lo que bloquea: pasado, horario del área y fin de semana', () => {
    expect(blockingTexts(scheduleCheck(slotAt('2026-10-23', 480, 60), contextFor({ ...base, date: '2026-10-23' })))).toContain('Solo se programa hacia el futuro');
    expect(blockingTexts(scheduleCheck(slotAt('2026-10-28', 360, 60), contextFor(base)))).toEqual(['Fuera del horario del área']);
    expect(blockingTexts(scheduleCheck(slotAt('2026-10-31', 480, 60), contextFor({ ...base, date: '2026-10-31' })))).toEqual(['Fuera del horario del área']);
  });

  it('avisa el aforo sin bloquear', () => {
    const check = scheduleCheck(slotAt('2026-10-28', 480, 60), contextFor({ ...base, participants: 30 }));
    expect(check.blocking).toEqual([]);
    expect(capacityText(check, 30, 24)).toBe('Supera el aforo (30 / 24)');
    expect(capacityText({ blocking: [], warnings: [] }, 20, 24)).toBeNull();
    expect(previewText(check)).toBe('Libre');
    expect(previewText({ blocking: ['overlap'], warnings: [] })).toBe('Se cruza con otro bloque del área');
  });
});

describe('bandeja Por programar', () => {
  it('las fechas pendientes son las que no tienen bloque', () => {
    expect(pendingDates(summary({ dates: ['2026-10-30', '2026-10-28'], scheduledDates: ['2026-10-28'] }))).toEqual(['2026-10-30']);
    expect(pendingDates(summary({ dates: ['2026-10-28'], scheduledDates: ['2026-10-28'] }))).toEqual([]);
    expect(pendingDates(summary({ dates: ['2026-10-30', '2026-10-28'] }))).toEqual(['2026-10-28', '2026-10-30']);
  });

  it('cada solicitud dice «Materia - Carrera - Docente» como lo dirá su bloque', () => {
    expect(requestBlockText(summary({ subject: 'Histología', group: 'Odontología' }))).toBe('Histología - Odontología - Ana Pérez');
    expect(requestBlockText(summary())).toBe('Titulación - Ana Pérez');
    expect(requestBlockText(summary({ title: null }))).toBe('SOL-0001 - Ana Pérez');
  });

  it('solo cuentan las enviadas con fechas sin bloque', () => {
    expect(isToSchedule(summary())).toBe(true);
    expect(isToSchedule(summary({ scheduledCount: 2 }))).toBe(false);
    expect(isToSchedule(summary({ status: 'scheduled', scheduledCount: 2 }))).toBe(false);
    expect(isToSchedule(summary({ status: 'changes_requested' }))).toBe(false);
  });

  it('pone primero lo fuera de plazo, luego los recursos que faltan y la fecha más próxima', () => {
    const ordered = toScheduleOrder([
      summary({ id: 'tarde-fecha', dates: ['2026-11-10'] }),
      summary({ id: 'temprano', dates: ['2026-10-26'] }),
      summary({ id: 'recursos', dates: ['2026-11-20'], exceptions: 2 }),
      summary({ id: 'plazo', dates: ['2026-12-01'], late: true }),
      summary({ id: 'programada', status: 'scheduled', scheduledCount: 2 }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(['plazo', 'recursos', 'temprano', 'tarde-fecha']);
  });

  it('a igual urgencia manda la primera fecha pendiente, no la primera pedida', () => {
    const ordered = toScheduleOrder([
      summary({ id: 'a', dates: ['2026-10-26', '2026-11-20'], scheduledDates: ['2026-10-26'], scheduledCount: 1 }),
      summary({ id: 'b', dates: ['2026-11-02'] }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('dice cuántas van: 1 de 2 programadas', () => {
    expect(progressText(summary({ scheduledCount: 1, dateCount: 2 }))).toBe('1 de 2 programadas');
    expect(progressText(summary({ scheduledCount: 0, dateCount: 1 }))).toBe('0 de 1 programada');
  });

  it('abre «Programar…» en el día que se ve si está pendiente; si no, en la primera futura', () => {
    expect(defaultDate(['2026-10-22', '2026-10-28', '2026-10-30'], '2026-10-30', '2026-10-23')).toBe('2026-10-30');
    expect(defaultDate(['2026-10-22', '2026-10-28', '2026-10-30'], '2026-10-26', '2026-10-23')).toBe('2026-10-28');
    expect(defaultDate(['2026-10-22'], '2026-10-26', '2026-10-23')).toBe('2026-10-22');
  });

  it('escribe el chip con el día de la semana', () => {
    expect(chipDateText('2026-10-28')).toMatch(/mi/i);
    expect(chipDateText('2026-10-28')).toMatch(/28/);
  });
});

describe('aviso tras programar', () => {
  it('lleva el código y, si supera el aforo, cuántos son', () => {
    expect(scheduledMessage('P1-S12-QUI01', 'programado', [], 20, 24)).toEqual({ title: 'P1-S12-QUI01 programado' });
    expect(scheduledMessage('P1-S12-QUI01', 'programado', ['capacity'], 30, 24)).toEqual({
      title: 'P1-S12-QUI01 programado',
      description: 'Supera el aforo (30 / 24)',
    });
    expect(scheduledMessage('P1-S12-QUI01', 'movido', [], 20, 24).title).toBe('P1-S12-QUI01 movido');
  });
});
