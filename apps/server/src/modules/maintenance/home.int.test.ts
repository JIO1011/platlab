import { beforeAll, describe, expect, it } from 'vitest';
import { homeAgendaResponse, homeCalendarResponse, homeTasksResponse } from '@platlab/contracts';
import { call, createAsset, createMaintenanceLab, createPlan, createType, recordWork, shiftDate, todayIn, type MaintenanceLab } from './maintenance.fixtures.js';

/**
 * El Inicio con Mantenimiento (ADR 0026, IN-01): lo que vence va todo el día en su fecha; lo hecho, el día del registro.
 * Un día pasado solo muestra lo registrado: lo vencido va en «Por atender».
 */

let lab: MaintenanceLab;
let today: string;

const home = (subject: string, path: string) => call(subject, `/workspaces/${lab.workspace.id}/home${path}`);
const agenda = async (subject: string, date?: string) => homeAgendaResponse.parse((await home(subject, `/agenda${date ? `?date=${date}` : ''}`)).body);
const tasks = async (subject: string) => homeTasksResponse.parse((await home(subject, '/tasks')).body).tasks;

beforeAll(async () => {
  lab = await createMaintenanceLab();
  today = await todayIn(lab);
});

describe('Inicio con Mantenimiento', () => {
  it('lo que vence, lo hecho y lo vencido, cada uno en su panel', async () => {
    const soonType = await createType(lab);
    const soon = await createAsset(lab, { typeId: soonType.id });
    const plan = await createPlan(lab, { assetTypeId: soonType.id, startsOn: shiftDate(today, 5) });
    const lateType = await createType(lab);
    const late = await createAsset(lab, { typeId: lateType.id });
    const monthly = await createPlan(lab, { assetTypeId: lateType.id, intervalCount: 30, intervalUnit: 'day', startsOn: '2025-01-01' });
    // Hecho hace 40 días: lo que tocaba hace 10 días está atrasado. La limpieza de hoy está hecha.
    expect((await recordWork(lab, lab.operator.subject, { planId: monthly.id, assetId: late.id, performedOn: shiftDate(today, -40), result: 'pass' })).status).toBe(201);
    expect((await recordWork(lab, lab.operator.subject, { assetId: soon.id, kind: 'cleaning', performedOn: today, result: 'pass' })).status).toBe(201);

    expect((await agenda(lab.operator.subject, shiftDate(today, 5))).day.items).toEqual([
      { moduleCode: 'maintenance', type: 'maintenance', ref: soon.id, title: soon.name, detail: `${soon.code} · ${plan.title}`, startsAt: null, endsAt: null, status: 'upcoming' },
    ]);
    const now = await agenda(lab.operator.subject);
    expect(now.day.items.map((item) => [item.ref, item.status])).toEqual([[soon.id, 'done']]);
    expect(now.next?.date).toBe(shiftDate(today, 5));
    expect((await agenda(lab.operator.subject, shiftDate(today, -10))).day.items).toEqual([]);
    expect((await agenda(lab.operator.subject, shiftDate(today, -40))).day.items.map((item) => [item.ref, item.status])).toEqual([[late.id, 'done']]);

    const month = shiftDate(today, 5).slice(0, 7);
    const calendar = homeCalendarResponse.parse((await home(lab.operator.subject, `/calendar?month=${month}`)).body);
    expect(calendar.days.find((day) => day.date === shiftDate(today, 5))).toEqual({
      date: shiftDate(today, 5),
      total: 1,
      counts: [{ moduleCode: 'maintenance', type: 'maintenance', count: 1 }],
    });
    expect(await tasks(lab.operator.subject)).toEqual([{ moduleCode: 'maintenance', kind: 'overdue', count: 1, tone: 'danger' }]);
  });

  it('sin permiso de Mantenimiento no aporta', async () => {
    expect((await agenda(lab.teacher.subject, shiftDate(today, 5))).day.items).toEqual([]);
    expect(await tasks(lab.teacher.subject)).toEqual([]);
  });
});
