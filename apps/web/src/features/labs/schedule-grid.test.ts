import type { Activity, Closure, Period, Space, WeeklyHours } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import {
  activitiesOfArea,
  activityDetails,
  activityLabel,
  blockLines,
  blockSpan,
  blockText,
  boardColumns,
  boardRange,
  capacityWarning,
  closedAllDay,
  closedSpans,
  dayClosedText,
  holidayOn,
  loadByDay,
  monthWeeks,
  openSlots,
  overCapacity,
  parseDay,
  periodOn,
  placement,
  rowStarts,
  shiftMonth,
  showsTime,
  timeText,
  toMinutes,
  weekDates,
} from './schedule-grid';

const closedDay: WeeklyHours['1'] = [];
const hours = (day: WeeklyHours['1']): WeeklyHours => ({ '1': day, '2': day, '3': day, '4': day, '5': day, '6': closedDay, '7': closedDay });
const wholeDay = hours([{ opens: '07:00', closes: '13:00' }, { opens: '14:00', closes: '18:00' }]);

const space = (overrides: Partial<Space> = {}): Space => ({
  areaId: 'area-1',
  areaName: 'Química analítica',
  groupName: null,
  areaArchived: false,
  abbreviation: 'ANT',
  capacity: 24,
  weeklyHours: wholeDay,
  version: 1,
  archivedAt: null,
  ...overrides,
});

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'a-1',
  requestId: 'r-1',
  requestCode: 'SOL-0001',
  title: 'Titulación ácido-base',
  requesterName: 'Ana Pérez',
  subject: null,
  group: 'Química',
  participants: 20,
  date: '2026-10-26',
  areaId: 'area-1',
  startsAt: '08:00',
  endsAt: '10:00',
  responsibleId: 'p-1',
  responsibleName: 'Luis Mora',
  code: 'P1-S12-ANT01',
  version: 1,
  ...overrides,
});

const closure = (overrides: Partial<Closure> = {}): Closure => ({
  id: 'c-1',
  areaId: null,
  areaName: null,
  startsOn: '2026-10-26',
  endsOn: '2026-10-26',
  reason: 'Feriado local',
  voidedAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('horas', () => {
  it('pasa «HH:MM» a minutos y de vuelta', () => {
    expect(toMinutes('08:30')).toBe(510);
    expect(timeText(510)).toBe('08:30');
    expect(timeText(0)).toBe('00:00');
  });
});

describe('fechas', () => {
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

  it('halla el período activo y cuenta su semana desde el inicio', () => {
    const period = (code: string, archivedAt: string | null): Period => ({ id: code, code, startsOn: '2026-08-03', endsOn: '2027-01-15', version: 1, archivedAt });
    expect(periodOn([period('P1', null)], '2026-08-03')).toEqual({ code: 'P1', week: 1 });
    expect(periodOn([period('P1', null)], '2026-10-26')).toEqual({ code: 'P1', week: 13 });
    expect(periodOn([period('P1', null)], '2027-02-01')).toBeNull();
    expect(periodOn([period('P0', '2026-01-01T00:00:00Z')], '2026-10-26')).toBeNull();
  });
});

describe('carga y áreas del día', () => {
  it('cuenta los bloques de cada fecha y deja en cero las libres', () => {
    const items = [activity(), activity({ id: 'a-2' }), activity({ id: 'a-3', date: '2026-10-28' }), activity({ id: 'a-4', date: '2026-11-30' })];
    expect(loadByDay(items, ['2026-10-26', '2026-10-27', '2026-10-28'])).toEqual({ '2026-10-26': 2, '2026-10-27': 0, '2026-10-28': 1 });
  });

  it('muestra las áreas habilitadas y las archivadas que aún tienen un bloque ese día', () => {
    const active = space();
    const archived = space({ areaId: 'area-2', archivedAt: '2026-09-01T00:00:00Z' });
    const unlinked = space({ areaId: 'area-3', areaArchived: true });
    const spaces = [active, archived, unlinked];
    expect(boardColumns(null, spaces, []).map((column) => column.space)).toEqual([active]);
    expect(boardColumns(null, spaces, [activity({ areaId: 'area-2' })]).map((column) => column.space)).toEqual([active, archived]);
  });

  it('suma al final las áreas del Núcleo sin horario, por edificio y nombre', () => {
    const chemistry = space({ areaId: 'area-1', areaName: 'Química', groupName: 'Bloque B' });
    const core = [
      { id: 'area-9', name: 'Zoología', group: null },
      { id: 'area-1', name: 'Química', group: { name: 'Bloque B' } },
      { id: 'area-5', name: 'Anatomía', group: { name: 'Bloque A' } },
      { id: 'area-6', name: 'Botánica', group: null },
    ];
    const columns = boardColumns(core, [chemistry], []);
    expect(columns.map((column) => [column.areaId, column.space !== null])).toEqual([
      ['area-1', true],
      ['area-6', false],
      ['area-9', false],
      ['area-5', false],
    ]);
  });

  it('conserva la columna de un área archivada con bloque aunque el Núcleo ya no la liste', () => {
    const archived = space({ areaId: 'area-2', areaArchived: true });
    const columns = boardColumns([], [archived], [activity({ areaId: 'area-2' })]);
    expect(columns).toEqual([{ areaId: 'area-2', areaName: 'Química analítica', groupName: null, space: archived }]);
  });

  it('ordena los bloques de un área por hora', () => {
    const late = activity({ id: 'late', startsAt: '15:00', endsAt: '16:00' });
    const early = activity({ id: 'early' });
    const other = activity({ id: 'other', areaId: 'area-2' });
    expect(activitiesOfArea([late, other, early], 'area-1').map((item) => item.id)).toEqual(['early', 'late']);
  });
});

describe('tamaño de un bloque', () => {
  it('da más líneas de texto a un bloque más largo', () => {
    expect([30, 45, 60, 75, 90, 180].map(blockLines)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('muestra la hora solo desde una hora de alto', () => {
    expect([30, 45, 60, 120].map(showsTime)).toEqual([false, false, true, true]);
  });
});

describe('rango del día', () => {
  it('es fijo, de 07:00 a 19:00, aunque no haya bloques', () => {
    expect(boardRange([])).toEqual({ start: 420, end: 1140 });
    expect(boardRange([activity()])).toEqual({ start: 420, end: 1140 });
  });

  it('se amplía a la media hora de un bloque que quedó fuera', () => {
    expect(boardRange([activity({ startsAt: '05:45', endsAt: '06:30' })])).toEqual({ start: 330, end: 1140 });
    expect(boardRange([activity({ startsAt: '18:00', endsAt: '19:20' })])).toEqual({ start: 420, end: 1170 });
  });

  it('tiene una fila por cada media hora', () => {
    expect(rowStarts({ start: 420, end: 540 })).toEqual([420, 450, 480, 510]);
    expect(rowStarts(boardRange([]))).toHaveLength(24);
  });
});

describe('lo cerrado', () => {
  const range = { start: 420, end: 1080 };

  it('deja fuera del horario lo que el área no abre, también al inicio y al final', () => {
    const partial = space({ weeklyHours: hours([{ opens: '08:00', closes: '12:00' }, { opens: '14:00', closes: '17:00' }]) });
    expect(closedSpans(partial, '2026-10-26', range, [])).toEqual([
      { from: 420, to: 480, reason: 'Fuera del horario del área' },
      { from: 720, to: 840, reason: 'Fuera del horario del área' },
      { from: 1020, to: 1080, reason: 'Fuera del horario del área' },
    ]);
  });

  it('no marca nada si el área abre todo el rango', () => {
    const full = space({ weeklyHours: hours([{ opens: '07:00', closes: '18:00' }]) });
    expect(closedSpans(full, '2026-10-26', range, [])).toEqual([]);
  });

  it('cierra todo el rango con el motivo del cierre o feriado, sea del área o común', () => {
    expect(closedSpans(space(), '2026-10-26', range, [closure()])).toEqual([{ from: 420, to: 1080, reason: 'Feriado local' }]);
    expect(closedAllDay(space(), '2026-10-26', [closure({ areaId: 'area-1', reason: 'Mantenimiento' })])).toBe('Mantenimiento');
    expect(closedAllDay(space(), '2026-10-26', [closure({ areaId: 'area-2' })])).toBeNull();
  });

  it('ignora el cierre anulado o de otras fechas', () => {
    expect(closedAllDay(space(), '2026-10-26', [closure({ voidedAt: '2026-10-02T00:00:00Z' })])).toBeNull();
    expect(closedAllDay(space(), '2026-10-27', [closure()])).toBeNull();
  });

  it('dice que el área está cerrada el día que su horario no abre', () => {
    expect(closedAllDay(space(), '2026-10-31', [])).toBe(dayClosedText);
    expect(openSlots(space(), '2026-10-31')).toEqual([]);
  });

  it('halla el feriado común y no el de un área', () => {
    expect(holidayOn([closure()], '2026-10-26')?.reason).toBe('Feriado local');
    expect(holidayOn([closure({ areaId: 'area-1' })], '2026-10-26')).toBeNull();
  });
});

describe('posiciones', () => {
  const range = { start: 420, end: 1080 };

  it('pone un bloque por su hora, en porcentaje del rango', () => {
    // 11 horas: 08:00–10:00 arranca a 1/11 y dura 2/11.
    const { top, height } = placement(blockSpan(activity()), range);
    expect(top).toBeCloseTo(100 / 11, 6);
    expect(height).toBeCloseTo(200 / 11, 6);
  });

  it('recorta lo que sale del rango', () => {
    expect(placement({ from: 360, to: 480 }, range)).toEqual({ top: 0, height: (60 / 660) * 100 });
    expect(placement({ from: 1020, to: 1200 }, range).top + placement({ from: 1020, to: 1200 }, range).height).toBeCloseTo(100, 6);
  });
});

describe('texto del bloque', () => {
  it('dice «Materia - Carrera - Docente»', () => {
    expect(blockText(activity({ subject: 'Bioquímica General' }))).toBe('Bioquímica General - Química - Ana Pérez');
  });

  it('sin materia dice el título y sin carrera omite la carrera', () => {
    expect(blockText(activity())).toBe('Titulación ácido-base - Química - Ana Pérez');
    expect(blockText(activity({ subject: '', group: null }))).toBe('Titulación ácido-base - Ana Pérez');
    expect(blockText(activity({ subject: 'Histología', group: null }))).toBe('Histología - Ana Pérez');
  });

  it('deja la hora, el código y el responsable para los detalles', () => {
    expect(activityDetails(activity(), space())).toEqual(['08:00–10:00 · P1-S12-ANT01', 'Responsable: Luis Mora']);
  });

  it('suma el aforo a los detalles solo cuando se supera', () => {
    expect(activityDetails(activity({ participants: 30 }), space())).toEqual(['08:00–10:00 · P1-S12-ANT01', 'Responsable: Luis Mora', 'Supera el aforo (30 / 24)']);
  });

  it('suma hora, código y responsable para el lector de pantalla', () => {
    expect(activityLabel(activity({ subject: 'Bioquímica General' }), space())).toBe('Bioquímica General - Química - Ana Pérez, 08:00–10:00 · P1-S12-ANT01, Responsable: Luis Mora');
  });

  it('avisa del aforo solo cuando se supera', () => {
    expect(overCapacity(activity({ participants: 24 }), space())).toBe(false);
    expect(overCapacity(activity({ participants: 30 }), space())).toBe(true);
    expect(capacityWarning(30, 24)).toBe('Supera el aforo (30 / 24)');
  });
});
