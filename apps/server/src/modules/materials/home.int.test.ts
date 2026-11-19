import { beforeAll, describe, expect, it } from 'vitest';
import { homeAgendaResponse, homeCalendarResponse, homeTasksResponse, loan as loanContract } from '@platlab/contracts';
import { addDays, todayIn } from '../../platform/dates.js';
import { admin, call, createMaterialsLab, giveBack, lend, reusableWithStock, type MaterialsLab } from './materials.fixtures.js';

/**
 * El Inicio con Materiales (ADR 0026, IN-01): cada devolución va todo el día en su fecha prevista. Un día pasado solo
 * muestra los préstamos cerrados: los atrasados van en «Por atender».
 */

let lab: MaterialsLab;
const today = todayIn('America/Guayaquil');

const home = (subject: string, path: string) => call(subject, `/workspaces/${lab.workspace.id}/home${path}`);
const agenda = async (subject: string, date: string) => homeAgendaResponse.parse((await home(subject, `/agenda?date=${date}`)).body);
const tasks = async (subject: string) => homeTasksResponse.parse((await home(subject, '/tasks')).body).tasks;

async function lent(dueOn: string) {
  const { positionId } = await reusableWithStock(lab);
  const response = await lend(lab, [{ positionId, quantity: '1' }], { dueOn });
  expect(response.status).toBe(201);
  return loanContract.parse(response.body);
}

beforeAll(async () => {
  lab = await createMaterialsLab();
});

describe('Inicio con Materiales', () => {
  it('devoluciones previstas, recibidas y atrasadas, cada una en su panel', async () => {
    const pending = await lent(addDays(today, 3));
    const returned = await lent(addDays(today, 3));
    expect((await giveBack(lab, returned.id, returned.version, [{ line: 1, good: '1' }])).status).toBe(200);
    const overdue = await lent(addDays(today, 4));
    await admin.query(`update materials.loans set due_on = $2 where id = $1`, [overdue.id, addDays(today, -2)]);

    const day = await agenda(lab.operator.subject, addDays(today, 3));
    expect(day.day.items.map((item) => [item.ref, item.status, item.title, item.startsAt])).toEqual([
      [pending.id, 'upcoming', 'Docente', null],
      [returned.id, 'done', 'Docente', null],
    ]);
    expect(day.day.items[0]).toMatchObject({ moduleCode: 'materials', type: 'return', detail: `P-${String(pending.number).padStart(4, '0')}` });
    expect((await agenda(lab.operator.subject, addDays(today, -2))).day.items).toEqual([]);

    const month = addDays(today, 3).slice(0, 7);
    const calendar = homeCalendarResponse.parse((await home(lab.operator.subject, `/calendar?month=${month}`)).body);
    expect(calendar.days.find((entry) => entry.date === addDays(today, 3))?.counts).toEqual([{ moduleCode: 'materials', type: 'return', count: 2 }]);
    expect(day.day.items[0]?.area).toBeNull();
    expect(await tasks(lab.operator.subject)).toEqual([
      {
        moduleCode: 'materials',
        kind: 'overdueLoans',
        count: 1,
        tone: 'danger',
        cases: [{ ref: overdue.id, title: 'Docente', detail: `P-${String(overdue.number).padStart(4, '0')}`, date: addDays(today, -2) }],
      },
    ]);
  });

  it('quien no presta ni recibe devoluciones no ve Materiales', async () => {
    expect((await agenda(lab.teacher.subject, addDays(today, 3))).day.items).toEqual([]);
    expect(await tasks(lab.teacher.subject)).toEqual([]);
  });
});
