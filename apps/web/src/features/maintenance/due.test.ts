import { describe, expect, it } from 'vitest';
import { formatDate } from '../../app/format';
import { doneText, dueGroup, dueText, dueTone, firstDue, groupDue, workStatus } from './due';

const today = '2026-10-17';
const pending = (dueOn: string) => ({ dueOn, lastResult: null });

describe('dueGroup', () => {
  it('pone hoy en Próximos 30 días y ayer en Atrasados', () => {
    expect(dueGroup(pending(today), today)).toBe('upcoming');
    expect(dueGroup(pending('2026-10-16'), today)).toBe('overdue');
  });

  it('incluye el día 30 y deja fuera el 31', () => {
    expect(dueGroup(pending('2026-11-16'), today)).toBe('upcoming');
    expect(dueGroup(pending('2026-11-17'), today)).toBeNull();
  });

  it('cuenta los días a través del fin de mes', () => {
    expect(dueGroup(pending('2026-11-30'), '2026-10-31')).toBe('upcoming');
    expect(dueGroup(pending('2026-12-01'), '2026-10-31')).toBeNull();
  });

  it('un no conforme va a Atrasados aunque su fecha esté lejos', () => {
    expect(dueGroup({ dueOn: '2027-10-17', lastResult: 'fail' }, today)).toBe('overdue');
    expect(dueGroup({ dueOn: '2026-10-01', lastResult: 'fail' }, today)).toBe('overdue');
  });

  it('con observaciones cuenta como hecho: sigue su fecha', () => {
    expect(dueGroup({ dueOn: '2026-12-17', lastResult: 'pass_with_observations' }, today)).toBeNull();
  });
});

describe('groupDue', () => {
  it('ordena los grupos, omite los vacíos y conserva el orden de cada uno', () => {
    const items = [
      { id: 'a', ...pending('2026-10-10') },
      { id: 'b', ...pending('2026-10-20') },
      { id: 'c', dueOn: '2026-12-01', lastResult: 'fail' as const },
      { id: 'd', ...pending('2026-10-12') },
      { id: 'e', ...pending('2027-01-01') },
    ];
    expect(groupDue(items, today).map((entry) => [entry.label, entry.items.map((item) => item.id)])).toEqual([
      ['Atrasados', ['a', 'c', 'd']],
      ['Próximos 30 días', ['b']],
    ]);
  });

  it('sin atrasados, solo muestra los próximos', () => {
    expect(groupDue([{ id: 'a', ...pending('2026-10-20') }], today).map((entry) => entry.group)).toEqual(['upcoming']);
  });
});

describe('dueText', () => {
  it('dice «Vence hoy», «hace N días» y «en N días», con singular', () => {
    expect(dueText(today, today)).toBe('Vence hoy');
    expect(dueText('2026-10-16', today)).toBe('hace 1 día');
    expect(dueText('2026-10-10', today)).toBe('hace 7 días');
    expect(dueText('2026-10-18', today)).toBe('en 1 día');
    expect(dueText('2026-11-16', today)).toBe('en 30 días');
  });
});

describe('dueTone', () => {
  it('neutro sin plan', () => {
    expect(dueTone(null, today)).toBe('neutral');
  });

  it('rojo vencido o no conforme', () => {
    expect(dueTone(pending('2026-10-16'), today)).toBe('danger');
    expect(dueTone({ dueOn: '2027-04-17', lastResult: 'fail' }, today)).toBe('danger');
  });

  it('ámbar de hoy a 30 días y verde después', () => {
    expect(dueTone(pending(today), today)).toBe('warning');
    expect(dueTone(pending('2026-11-16'), today)).toBe('warning');
    expect(dueTone(pending('2026-11-17'), today)).toBe('success');
  });
});

describe('workStatus', () => {
  const today = '2026-10-18';

  it('un no conforme se cuenta desde su registro, no desde la próxima fecha que ya avanzó', () => {
    expect(workStatus({ dueOn: '2027-04-15', lastResult: 'fail', lastPerformedOn: '2026-10-15' }, today)).toEqual({
      date: '2026-10-15',
      text: 'Repetir · no conforme hace 3 días',
    });
    expect(workStatus({ dueOn: '2027-04-18', lastResult: 'fail', lastPerformedOn: today }, today).text).toBe('Repetir · no conforme hoy');
    expect(workStatus({ dueOn: '2027-04-17', lastResult: 'fail', lastPerformedOn: '2026-10-17' }, today).text).toBe('Repetir · no conforme hace 1 día');
  });

  it('sin la fecha del registro, el no conforme va sin plazo', () => {
    expect(workStatus({ dueOn: '2027-04-15', lastResult: 'fail', lastPerformedOn: null }, today)).toEqual({ date: '2027-04-15', text: 'Repetir · no conforme' });
  });

  it('lo demás, por su próxima fecha: atrasado, hoy o por venir', () => {
    expect(workStatus({ dueOn: '2026-10-08', lastResult: 'pass', lastPerformedOn: '2025-10-08' }, today)).toEqual({
      date: '2026-10-08',
      text: 'Atrasado · hace 10 días',
    });
    expect(workStatus({ dueOn: today, lastResult: null, lastPerformedOn: null }, today).text).toBe('Vence hoy');
    expect(workStatus({ dueOn: '2026-10-30', lastResult: 'pass_with_observations', lastPerformedOn: '2026-07-30' }, today).text).toBe('en 12 días');
  });
});

describe('doneText', () => {
  const due = '2026-11-12';
  const said = (text: string) => `Tocaba el ${formatDate(due)} · ${text}`;

  it('en su fecha o antes es a tiempo', () => {
    expect(doneText(due, due)).toBe(said('hecho a tiempo'));
    expect(doneText(due, '2026-11-02')).toBe(said('hecho a tiempo'));
  });

  it('después, cuenta los días de retraso', () => {
    expect(doneText(due, '2026-11-13')).toBe(said('hecho 1 día después'));
    expect(doneText(due, '2026-12-01')).toBe(said('hecho 19 días después'));
  });
});

describe('firstDue', () => {
  const entry = (id: string, dueOn: string, lastResult: 'fail' | null = null) => ({ id, dueOn, lastResult });

  it('pone los atrasados antes que los próximos, aunque lleguen después', () => {
    const items = [entry('a', '2026-10-20'), entry('b', '2026-10-10'), entry('c', '2026-11-01', 'fail')];
    expect(firstDue(items, today, 5).map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('se queda con los primeros N y conserva el orden recibido dentro de cada grupo', () => {
    const items = [entry('a', '2026-10-18'), entry('b', '2026-10-19'), entry('c', '2026-10-01'), entry('d', '2026-10-02')];
    expect(firstDue(items, today, 3).map((item) => item.id)).toEqual(['c', 'd', 'a']);
  });

  it('deja fuera lo que toca después de 30 días y no falla sin trabajos', () => {
    expect(firstDue([entry('a', '2027-01-01')], today, 5)).toEqual([]);
    expect(firstDue([], today, 5)).toEqual([]);
  });
});
