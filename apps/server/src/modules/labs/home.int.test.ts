import { beforeAll, describe, expect, it } from 'vitest';
import { activity, homeAgendaResponse, homeCalendarResponse, homeTasksResponse, scheduledActivity, space, type Activity, type LabsRequest } from '@platlab/contracts';
import { admin, call } from '../../testing/api.js';
import { addLocation, setModuleStatus } from '../../testing/core-fixtures.js';
import { createRequestsLab, inDays, send, submitted, type RequestsLab } from './labs.fixtures.js';

/**
 * El Inicio con Laboratorios (ADR 0026, IN-01): Actividad, Calendario y Por atender. El estado de cada práctica es el
 * de su bloque; quien pide ve lo suyo; un día pasado solo muestra lo cerrado y lo demás va en «Por atender».
 */

const everyDay = Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((day) => [day, [{ opens: '07:00', closes: '19:00' }]]));

let lab: RequestsLab;
let area: string;
/** Las dos prácticas de dentro de 20 días: la del Docente Uno (8 a 10) y la del Docente Dos (11 a 12). */
let own: Activity;
let others: Activity;

const home = (subject: string, path: string) => call(subject, `/workspaces/${lab.workspace.id}/home${path}`);
const agenda = async (subject: string, date?: string) => homeAgendaResponse.parse((await home(subject, `/agenda${date ? `?date=${date}` : ''}`)).body);
const calendar = async (subject: string, month: string) => homeCalendarResponse.parse((await home(subject, `/calendar?month=${month}`)).body);
const tasks = async (subject: string) => homeTasksResponse.parse((await home(subject, '/tasks')).body).tasks;
/** Las filas sin sus casos, para comparar cifras y tonos. */
const rows = async (subject: string) => (await tasks(subject)).map((task) => ({ moduleCode: task.moduleCode, kind: task.kind, count: task.count, tone: task.tone }));

async function placed(request: LabsRequest, date: string, startsAt: string, endsAt: string): Promise<Activity> {
  const response = await send(lab, 'POST', '/activities', { requestId: request.id, date, areaId: area, startsAt, endsAt, responsibleId: lab.operator.principalId, expectedVersion: request.version });
  expect(response.status).toBe(201);
  return scheduledActivity.parse(response.body).activity;
}

/** Lista por el Operador y llevada a `date` (las fechas se piden futuras), en su propia hora. */
async function readyOn(date: string, hour: string): Promise<Activity> {
  const block = await placed(await submitted(lab, [inDays(40)]), inDays(40), '08:00', '10:00');
  const ready = activity.parse((await send(lab, 'POST', `/activities/${block.id}/ready`, { expectedVersion: block.version }, lab.operator.subject)).body);
  await admin.query(`update labs.activities set on_date = $2, starts_at = $3, ends_at = $4 where id = $1`, [block.id, date, `${hour}:00`, `${hour}:50`]);
  return ready;
}

const started = async (block: Activity) => {
  const response = await send(lab, 'POST', `/activities/${block.id}/start`, { expectedVersion: block.version }, lab.operator.subject);
  expect(response.status).toBe(200);
  return activity.parse(response.body);
};

const closed = async (block: Activity) => {
  const response = await send(lab, 'POST', `/activities/${block.id}/close`, { expectedVersion: block.version, usage: [], notes: 'Sin novedades' }, lab.operator.subject);
  expect(response.status).toBe(200);
  return block;
};

beforeAll(async () => {
  lab = await createRequestsLab();
  const areaId = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
  area = space.parse((await send(lab, 'POST', '/spaces', { abbreviation: 'QUI', areaId, capacity: 40, weeklyHours: everyDay })).body).areaId;
  own = await placed(await submitted(lab, [inDays(20)]), inDays(20), '08:00', '10:00');
  others = await placed(await submitted(lab, [inDays(20)], lab.otherTeacher.subject), inDays(20), '11:00', '12:00');
});

describe('Actividad', () => {
  it('el día pedido, por hora y con el ámbito de quien pide; hoy sin nada por iniciar trae lo próximo', async () => {
    const day = await agenda(lab.adminMember.subject, inDays(20));
    expect(day.day.items.map((item) => [item.ref, item.status, item.startsAt, item.endsAt])).toEqual([
      [own.id, 'upcoming', '08:00', '10:00'],
      [others.id, 'upcoming', '11:00', '12:00'],
    ]);
    expect(day.day.items[0]).toMatchObject({ moduleCode: 'labs', type: 'practice', title: 'Titulación ácido-base' });
    expect(day.day.items[0]!.detail).toContain(own.code);
    expect(day.next).toBeNull();
    // Cada bloque va en la fila de su área, y las áreas con horario llegan aunque estén libres (revisión de IN-02).
    expect(day.day.items[0]!.area?.id).toBe(area);
    expect(day.areas.map((entry) => entry.id)).toContain(area);
    expect((await agenda(lab.adminMember.subject, inDays(19))).areas.map((entry) => entry.id)).toContain(area);

    expect((await agenda(lab.teacher.subject, inDays(20))).day.items.map((item) => item.ref)).toEqual([own.id]);
    expect((await agenda(lab.otherTeacher.subject, inDays(20))).day.items.map((item) => item.ref)).toEqual([others.id]);

    const today = await agenda(lab.adminMember.subject);
    expect(today).toMatchObject({ today: inDays(0), day: { date: inDays(0), items: [] }, next: { date: inDays(20) } });
    expect(today.next!.items).toHaveLength(2);
    expect((await agenda(lab.teacher.subject)).next!.items.map((item) => item.ref)).toEqual([own.id]);
  });

  it('en curso y cerrada según su bloque; un día pasado solo muestra lo cerrado', async () => {
    const running = await started(await readyOn(inDays(0), '07'));
    let today = await agenda(lab.adminMember.subject);
    expect(today.day.items.map((item) => [item.ref, item.status])).toEqual([[running.id, 'in_progress']]);
    expect(today.next?.date).toBe(inDays(20));

    await closed(running);
    today = await agenda(lab.adminMember.subject);
    expect(today.day.items.map((item) => [item.ref, item.status])).toEqual([[running.id, 'done']]);

    const finished = await closed(await started(await readyOn(inDays(-1), '08')));
    await readyOn(inDays(-1), '09');
    expect((await agenda(lab.adminMember.subject, inDays(-1))).day.items.map((item) => [item.ref, item.status])).toEqual([[finished.id, 'done']]);
  });

  it('rechaza una fecha o un mes que no lo son', async () => {
    expect((await home(lab.adminMember.subject, '/agenda?date=ayer')).status).toBe(400);
    expect((await home(lab.adminMember.subject, '/calendar?month=2026-13')).status).toBe(400);
  });
});

describe('Calendario', () => {
  it('cada día del mes con su cuenta por tipo, con el ámbito de quien pide', async () => {
    const month = inDays(20).slice(0, 7);
    const days = (await calendar(lab.adminMember.subject, month)).days;
    const [year, number] = month.split('-').map(Number) as [number, number];
    expect(days).toHaveLength(new Date(Date.UTC(year, number, 0)).getUTCDate());
    expect(days.find((day) => day.date === inDays(20))).toEqual({ date: inDays(20), total: 2, counts: [{ moduleCode: 'labs', type: 'practice', count: 2 }] });
    expect((await calendar(lab.teacher.subject, month)).days.find((day) => day.date === inDays(20))?.total).toBe(1);
    // Ayer cuenta lo cerrado; lo que quedó sin cerrar va en «Por atender».
    const yesterday = (await calendar(lab.adminMember.subject, inDays(-1).slice(0, 7))).days.find((day) => day.date === inDays(-1));
    expect(yesterday?.total).toBe(1);
  });
});

describe('Por atender', () => {
  it('lo rojo primero; cada fila según el permiso de quien mira', async () => {
    const waiting = await submitted(lab, [inDays(30)]);
    expect(await rows(lab.adminMember.subject)).toEqual([
      { moduleCode: 'labs', kind: 'toClose', count: 1, tone: 'danger' },
      { moduleCode: 'labs', kind: 'toReview', count: 1, tone: 'warning' },
    ]);
    // Los casos: el bloque de ayer sin cerrar y la solicitud enviada hoy.
    const [toClose, toReview] = await tasks(lab.adminMember.subject);
    expect(toClose?.cases).toEqual([expect.objectContaining({ date: inDays(-1) })]);
    expect(toReview?.cases).toEqual([expect.objectContaining({ ref: waiting.id, date: inDays(0) })]);
    expect(await rows(lab.operator.subject)).toEqual([{ moduleCode: 'labs', kind: 'toClose', count: 1, tone: 'danger' }]);
    expect(await tasks(lab.teacher.subject)).toEqual([]);

    const changes = await send(lab, 'POST', `/requests/${waiting.id}/request-changes`, { expectedVersion: waiting.version, reason: 'Falta el grupo' });
    expect(changes.status).toBe(200);
    expect(await tasks(lab.teacher.subject)).toEqual([
      { moduleCode: 'labs', kind: 'changesRequested', count: 1, tone: 'warning', cases: [expect.objectContaining({ ref: waiting.id })] },
    ]);
    expect(await tasks(lab.otherTeacher.subject)).toEqual([]);
  });

  it('sin el módulo admitido, Laboratorios no aporta', async () => {
    await setModuleStatus(admin, lab.workspace.id, 'labs', 'disabled');
    try {
      expect(await tasks(lab.adminMember.subject)).toEqual([]);
      expect((await agenda(lab.adminMember.subject, inDays(20))).day.items).toEqual([]);
    } finally {
      await setModuleStatus(admin, lab.workspace.id, 'labs', 'enabled');
    }
  });
});
