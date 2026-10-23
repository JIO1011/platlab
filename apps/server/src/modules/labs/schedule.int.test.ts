import { beforeAll, describe, expect, it } from 'vitest';
import { labsRequest, responsibleOptions, scheduledActivity, scheduleList, space, type LabsRequest } from '@platlab/contracts';
import { admin, call, count, errorCode } from '../../testing/api.js';
import { addLocation } from '../../testing/core-fixtures.js';
import { complete, createRequestsLab, draft, inDays, save, send, submitted, type RequestsLab } from './labs.fixtures.js';

/**
 * L-01c (ADR 0023, «Reglas y diseño de L-01c»): el Cronograma por HTTP. El Administrador programa cada fecha en un área,
 * a una hora y con un responsable; choque, horario, cierres y período bloquean, el aforo solo avisa. Todos los que
 * consultan Laboratorios ven la tabla.
 */

const everyDay = Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((day) => [day, [{ opens: '07:00', closes: '19:00' }]]));

async function enableArea(lab: RequestsLab, abbreviation: string, capacity = 30) {
  const areaId = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
  const created = await send(lab, 'POST', '/spaces', { abbreviation, areaId, capacity, weeklyHours: everyDay });
  expect(created.status).toBe(201);
  return space.parse(created.body).areaId;
}

let lab: RequestsLab;
let area: string;
let otherArea: string;

beforeAll(async () => {
  lab = await createRequestsLab(['labs']);
  area = await enableArea(lab, 'QUI');
  otherArea = await enableArea(lab, 'FIS', 10);
});

/** Programa una fecha como la Administradora; devuelve la respuesta cruda. */
const place = (request: LabsRequest, date: string, extra: Record<string, unknown> = {}, subject = lab.adminMember.subject) =>
  send(lab, 'POST', '/activities', { requestId: request.id, date, areaId: area, startsAt: '08:00', endsAt: '10:00', responsibleId: lab.operator.principalId, expectedVersion: request.version, ...extra }, subject);

const reload = async (request: LabsRequest, subject = lab.teacher.subject) => labsRequest.parse((await call(subject, `${lab.base}/requests/${request.id}`)).body);
const message = (body: unknown) => (body as { error: { message: string } }).error.message;

describe('programar', () => {
  it('cada fecha es un bloque con su código; con todas, la solicitud queda programada', async () => {
    const request = await submitted(lab, [inDays(20), inDays(27)]);
    const first = await place(request, inDays(20));
    expect(first.status).toBe(201);
    const { activity, warnings } = scheduledActivity.parse(first.body);
    expect(activity).toMatchObject({ requestCode: request.code, date: inDays(20), areaId: area, responsibleName: 'Operador', title: 'Titulación ácido-base', group: 'Bioquímica' });
    expect(activity.code).toMatch(/^P1-S\d{1,2}-QUI01$/);
    expect(warnings).toEqual([]);
    const partial = await reload(request);
    expect(partial).toMatchObject({ status: 'submitted', scheduledCount: 1 });
    const second = await place(partial, inDays(27), { startsAt: '10:00', endsAt: '12:00' });
    expect(second.status).toBe(201);
    const done = await reload(request);
    expect(done).toMatchObject({ status: 'scheduled', scheduledCount: 2 });
    expect(done.blocks.map((block) => block.date)).toEqual([inDays(20), inDays(27)]);
    expect(done.events.map((event) => event.action)).toEqual(['submitted', 'scheduled']);
  });

  it('el Docente y el Operador ven la tabla, pero no programan', async () => {
    const request = await submitted(lab, [inDays(21)]);
    for (const subject of [lab.teacher.subject, lab.operator.subject]) {
      expect((await place(request, inDays(21), {}, subject)).status).toBe(403);
      const table = scheduleList.parse((await call(subject, `${lab.base}/schedule?from=${inDays(0)}&to=${inDays(40)}`)).body);
      expect(table.items.length).toBeGreaterThan(0);
    }
    expect((await call(lab.teacher.subject, `${lab.base}/schedule/responsibles`)).status).toBe(403);
    const leads = responsibleOptions.parse((await call(lab.adminMember.subject, `${lab.base}/schedule/responsibles`)).body);
    expect(leads.items.map((item) => item.name)).toEqual(expect.arrayContaining(['Administradora', 'Operador']));
    expect(leads.items.map((item) => item.name)).not.toContain('Docente Uno');
  });

  it('bloquean el choque, el horario, el cierre, otro responsable y la versión vieja; el aforo solo avisa', async () => {
    const taken = await submitted(lab, [inDays(22)]);
    expect((await place(taken, inDays(22))).status).toBe(201);
    const request = await submitted(lab, [inDays(22)]);
    const cases: Array<[Record<string, unknown>, RegExp]> = [
      [{ startsAt: '09:00', endsAt: '11:00' }, /Se cruza/],
      [{ startsAt: '18:00', endsAt: '20:00' }, /horario/],
      [{ responsibleId: lab.teacher.principalId }, /responsable/],
    ];
    for (const [extra, text] of cases) {
      const response = await place(request, inDays(22), extra);
      expect(response.status).toBe(400);
      expect(message(response.body)).toMatch(text);
    }
    const closure = await send(lab, 'POST', '/closures', { areaId: otherArea, startsOn: inDays(22), endsOn: inDays(22), reason: 'Fumigación' });
    expect(closure.status).toBe(201);
    const closed = await place(request, inDays(22), { areaId: otherArea });
    expect(message(closed.body)).toMatch(/cerrada/);
    expect((await place({ ...request, version: request.version - 1 }, inDays(22), { startsAt: '10:00', endsAt: '12:00' })).status).toBe(409);
    // 24 participantes en un área de 10: avisa y programa.
    const crowded = await submitted(lab, [inDays(23)]);
    const warned = await place(crowded, inDays(23), { areaId: otherArea });
    expect(warned.status).toBe(201);
    expect(scheduledActivity.parse(warned.body).warnings).toEqual(['capacity']);
  });
});

describe('mover', () => {
  it('el mismo día cambia hora y responsable con su código; en otra área toma un número nuevo y guarda el anterior', async () => {
    const request = await submitted(lab, [inDays(24)]);
    const placed = scheduledActivity.parse((await place(request, inDays(24))).body).activity;
    const moved = await send(lab, 'PATCH', `/activities/${placed.id}`, { areaId: area, startsAt: '11:00', endsAt: '12:30', responsibleId: lab.adminMember.principalId, expectedVersion: placed.version });
    expect(moved.status).toBe(200);
    const sameArea = scheduledActivity.parse(moved.body).activity;
    expect(sameArea).toMatchObject({ code: placed.code, startsAt: '11:00', responsibleName: 'Administradora' });
    const elsewhere = scheduledActivity.parse(
      (await send(lab, 'PATCH', `/activities/${placed.id}`, { areaId: otherArea, startsAt: '11:00', endsAt: '12:30', responsibleId: lab.operator.principalId, expectedVersion: sameArea.version })).body,
    ).activity;
    expect(elsewhere.code).toMatch(/-FIS\d{2}$/);
    expect(await count('select count(*) as n from labs.activity_codes where activity_id = $1', [placed.id])).toBe(2);
  });
});

describe('cancelar y resolver', () => {
  it('quien pide cancela una programada antes del día; el laboratorio, con motivo; los bloques se liberan', async () => {
    const request = await submitted(lab, [inDays(25)]);
    await place(request, inDays(25));
    const scheduled = await reload(request);
    const cancelled = labsRequest.parse((await send(lab, 'POST', `/requests/${request.id}/cancel`, { expectedVersion: scheduled.version }, lab.teacher.subject)).body);
    expect(cancelled).toMatchObject({ status: 'cancelled', scheduledCount: 0, blocks: [] });
    // El lugar queda libre.
    const next = await submitted(lab, [inDays(25)]);
    expect((await place(next, inDays(25))).status).toBe(201);
    const byLab = await reload(next);
    expect((await send(lab, 'POST', `/requests/${next.id}/lab-cancel`, { expectedVersion: byLab.version, reason: 'x' }, lab.teacher.subject)).status).toBe(403);
    const labCancelled = labsRequest.parse((await send(lab, 'POST', `/requests/${next.id}/lab-cancel`, { expectedVersion: byLab.version, reason: 'Área en mantenimiento' })).body);
    expect(labCancelled.events.at(-1)).toMatchObject({ action: 'cancelled', reason: 'Área en mantenimiento', by: 'Administradora' });
  });

  it('pedir cambios libera las fechas ya programadas', async () => {
    const request = await submitted(lab, [inDays(26), inDays(33)]);
    await place(request, inDays(26));
    const partial = await reload(request);
    const changes = await send(lab, 'POST', `/requests/${request.id}/request-changes`, { expectedVersion: partial.version, reason: 'Cambia la segunda fecha' });
    expect(labsRequest.parse(changes.body)).toMatchObject({ status: 'changes_requested', scheduledCount: 0 });
    // Corrige y reenvía: vuelve a «Por programar».
    const fixed = await save(lab, labsRequest.parse(changes.body), complete(labsRequest.parse(changes.body), [inDays(26), inDays(34)]));
    expect((await send(lab, 'POST', `/requests/${request.id}/submit`, { expectedVersion: fixed.version }, lab.teacher.subject)).status).toBe(200);
  });

  it('un borrador no se programa', async () => {
    const request = await draft(lab);
    const response = await place(request, inDays(30));
    expect(response.status).toBe(404);
    expect(errorCode(response.body)).toBe('NOT_FOUND');
  });
});
