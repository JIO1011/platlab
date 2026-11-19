import type { AgendaItem } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { allDay, areaColumns, busyUntil, dayContents, heatLevel, hourMarks, placeTimed, statusSummary, timeLabel, timeRange, timed } from './agenda';

const chemistry = { id: '00000000-0000-4000-8000-0000000000a1', name: 'Lab. de Química' };
const physics = { id: '00000000-0000-4000-8000-0000000000a2', name: 'Lab. de Física' };
const storage = { id: '00000000-0000-4000-8000-0000000000a3', name: 'Bodega' };

const item = (overrides: Partial<AgendaItem> = {}): AgendaItem => ({
  moduleCode: 'labs',
  type: 'practice',
  ref: '00000000-0000-4000-8000-000000000001',
  title: 'Titulación',
  detail: 'P1-S12-QUI01',
  startsAt: '08:00',
  endsAt: '10:00',
  status: 'upcoming',
  area: chemistry,
  ...overrides,
});

describe('franja de Actividad', () => {
  it('separa lo que tiene hora de lo de todo el día', () => {
    const items = [item(), item({ startsAt: null, endsAt: null, moduleCode: 'maintenance' })];
    expect(timed(items)).toHaveLength(1);
    expect(allDay(items).map((entry) => entry.moduleCode)).toEqual(['maintenance']);
    expect(timeLabel(items[1]!)).toBe('Todo el día');
    expect(timeLabel(items[0]!)).toBe('08:00–10:00');
  });

  it('va de 07:00 a 19:00 y se amplía a la hora en punto de lo que quede fuera', () => {
    expect(timeRange([])).toEqual({ start: 420, end: 1140 });
    expect(timeRange([item({ startsAt: '06:30', endsAt: '07:30' }), item({ startsAt: '18:00', endsAt: '19:20' })])).toEqual({ start: 360, end: 1200 });
  });

  it('rotula cada hora, o cada dos si pasa de 12 horas', () => {
    expect(hourMarks({ start: 420, end: 540 })).toEqual([420, 480, 540]);
    expect(hourMarks({ start: 360, end: 1200 })).toEqual([360, 480, 600, 720, 840, 960, 1080, 1200]);
  });

  it('pone en otro carril lo que se cruza y reutiliza el que quedó libre', () => {
    const range = { start: 420, end: 1140 };
    const { placed, lanes } = placeTimed(
      [item({ title: 'A', startsAt: '08:00', endsAt: '10:00' }), item({ title: 'B', startsAt: '09:00', endsAt: '11:00' }), item({ title: 'C', startsAt: '10:00', endsAt: '12:00' })],
      range,
    );
    expect(lanes).toBe(2);
    expect(placed.map((entry) => [entry.item.title, entry.lane])).toEqual([
      ['A', 0],
      ['B', 1],
      ['C', 0],
    ]);
    expect(placed[0]!.start).toBeCloseTo((60 / 720) * 100);
    expect(placed[0]!.size).toBeCloseTo((120 / 720) * 100);
  });

  it('resume el día por estado, solo con lo que tiene', () => {
    expect(statusSummary([item({ status: 'in_progress' }), item(), item(), item({ status: 'done' })])).toBe('1 en proceso · 2 por iniciar · 1 finalizada');
    expect(statusSummary([item({ status: 'done' }), item({ status: 'done' })])).toBe('2 finalizadas');
  });
});

describe('laboratorio × hora', () => {
  it('una columna por área, también las libres; lo que no tiene hora no abre columna', () => {
    const items = [
      item({ title: 'Titulación' }),
      item({ title: 'Cultivo', area: storage }),
      item({ moduleCode: 'maintenance', type: 'maintenance', title: 'Balanza', startsAt: null, endsAt: null, area: physics }),
      item({ title: 'Sin lugar', area: null }),
    ];
    const columns = areaColumns([physics, chemistry], items);
    expect(columns.map((column) => column.area?.name ?? null)).toEqual(['Lab. de Física', 'Lab. de Química', 'Bodega', null]);
    expect(columns.map((column) => column.items.map((entry) => entry.title))).toEqual([[], ['Titulación'], ['Cultivo'], ['Sin lugar']]);
    expect(areaColumns([physics], [])).toEqual([{ area: physics, items: [] }]);
  });

  it('dice si un área está en uso ahora y hasta cuándo; lo finalizado la deja libre', () => {
    const [column] = areaColumns([chemistry], [item({ startsAt: '08:00', endsAt: '10:00' }), item({ startsAt: '09:30', endsAt: '11:00' })]);
    expect(busyUntil(column!, 9 * 60 + 45)).toBe(11 * 60);
    expect(busyUntil(column!, 11 * 60)).toBeNull();
    const [closed] = areaColumns([chemistry], [item({ status: 'done' })]);
    expect(busyUntil(closed!, 9 * 60)).toBeNull();
  });
});

describe('Calendario', () => {
  it('usa tramos fijos: 0, 1–2, 3–5, 6–9 y 10 o más', () => {
    expect([0, 1, 2, 3, 5, 6, 9, 10, 40].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('dice en texto lo que tiene cada día, con el nombre de cada módulo', () => {
    const nouns: Record<string, { one: string; many: string }> = {
      practice: { one: 'práctica', many: 'prácticas' },
      maintenance: { one: 'mantenimiento', many: 'mantenimientos' },
      return: { one: 'devolución', many: 'devoluciones' },
    };
    const nounOf = (_module: string, type: string) => nouns[type];
    expect(dayContents([], nounOf)).toBe('Sin actividades');
    expect(dayContents([{ moduleCode: 'labs', type: 'practice', count: 1 }], nounOf)).toBe('1 práctica');
    expect(
      dayContents(
        [
          { moduleCode: 'labs', type: 'practice', count: 3 },
          { moduleCode: 'maintenance', type: 'maintenance', count: 1 },
          { moduleCode: 'materials', type: 'return', count: 2 },
        ],
        nounOf,
      ),
    ).toBe('3 prácticas, 1 mantenimiento y 2 devoluciones');
    expect(dayContents([{ moduleCode: 'x', type: 'otro', count: 2 }], nounOf)).toBe('2 actividades');
  });
});
