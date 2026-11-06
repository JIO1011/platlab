import { beforeAll, describe, expect, it } from 'vitest';
import { labsRequest, scheduledActivity, space, type LabsRequest } from '@platlab/contracts';
import { admin, call, count } from '../../testing/api.js';
import { addLocation, setModuleStatus } from '../../testing/core-fixtures.js';
import { complete, createRequestsLab, draft, equipmentType, inDays, save, send, stockedReagent, type RequestsLab } from './labs.fixtures.js';

/**
 * L-01d (ADR 0023, «Reglas de L-01d, reserva real»): al programar, cada bloque aparta lo de su fecha. Reactivos de
 * los frascos que vencen antes, por la capacidad inventario y sin entrar en la bandeja de salidas; equipos concretos
 * libres en la franja. Lo que no alcanza queda «Falta»; cancelar o pedir cambios libera todo.
 */

const everyDay = Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((day) => [day, [{ opens: '07:00', closes: '19:00' }]]));

let lab: RequestsLab;
let area: string;
let otherArea: string;
let reagent: string;
let balanza: string;

beforeAll(async () => {
  lab = await createRequestsLab();
  const areaId = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
  const enabled = await send(lab, 'POST', '/spaces', { abbreviation: 'QUI', areaId, capacity: 40, weeklyHours: everyDay });
  area = space.parse(enabled.body).areaId;
  const secondId = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
  otherArea = space.parse((await send(lab, 'POST', '/spaces', { abbreviation: 'FIS', areaId: secondId, capacity: 40, weeklyHours: everyDay })).body).areaId;
  reagent = await stockedReagent(lab);
  balanza = await equipmentType(lab);
});

const reserved = () =>
  count(`select coalesce(sum(reserved), 0) as n from inventory.positions where workspace_id = $1`, [lab.workspace.id]);
const activeAssets = () => count(`select count(*) as n from labs.activity_assets where workspace_id = $1 and released_at is null`, [lab.workspace.id]);

/** Una solicitud enviada con un reactivo y una balanza por fecha. */
async function sentWith(dates: string[], grams: string, scales = 1): Promise<LabsRequest> {
  const request = await draft(lab);
  const saved = await save(
    lab,
    request,
    complete(request, dates, {
      groups: 1,
      lines: [
        { kind: 'reagent', itemId: reagent, description: null, quantity: grams, unit: 'g' },
        { kind: 'equipment', assetTypeId: balanza, description: null, perGroup: null, quantity: scales },
      ],
    }),
  );
  const sent = await send(lab, 'POST', `/requests/${request.id}/submit`, { expectedVersion: saved.version }, lab.teacher.subject);
  expect(sent.status).toBe(200);
  return labsRequest.parse(sent.body);
}

const place = (request: LabsRequest, date: string, startsAt = '08:00', endsAt = '10:00', areaId = area) =>
  send(lab, 'POST', '/activities', { requestId: request.id, date, areaId, startsAt, endsAt, responsibleId: lab.operator.principalId, expectedVersion: request.version });
const reload = async (request: LabsRequest) => labsRequest.parse((await call(lab.adminMember.subject, `${lab.base}/requests/${request.id}`)).body);

describe('apartar al programar', () => {
  it('cada fecha aparta lo suyo; no es una salida pendiente de Reactivos', async () => {
    const before = await reserved();
    const request = await sentWith([inDays(20), inDays(27)], '30');
    const first = scheduledActivity.parse((await place(request, inDays(20))).body);
    expect(first.activity.complete).toBe(true);
    await place(await reload(request), inDays(27));
    const done = await reload(request);
    expect(done.blocks.map((block) => block.holds.map((hold) => [hold.held, hold.complete, hold.assets.length]))).toEqual([
      [['30', true, 0], ['1', true, 1]],
      [['30', true, 0], ['1', true, 1]],
    ]);
    expect(await reserved()).toBe(before + 60);
    expect(await count(`select count(*) as n from inventory.allocations where workspace_id = $1 and purpose = 'issue'`, [lab.workspace.id])).toBe(0);
  });

  it('lo que no alcanza queda «Falta»: el stock que queda y ningún equipo libre en la franja', async () => {
    const taken = await sentWith([inDays(21)], '10');
    await place(taken, inDays(21));
    const short = await sentWith([inDays(21)], '500');
    // A la misma hora, en otra área: no hay otra balanza libre.
    const placed = scheduledActivity.parse((await place(short, inDays(21), '09:00', '11:00', otherArea)).body);
    expect(placed.activity.complete).toBe(false);
    const [block] = (await reload(short)).blocks;
    // 100 g recibidos menos los apartados antes; la única balanza operativa está en el otro bloque.
    expect(block!.holds.map((hold) => [hold.complete, hold.assets.length])).toEqual([
      [false, 0],
      [false, 0],
    ]);
    expect(Number(block!.holds[0]!.held)).toBeGreaterThan(0);
  });
});

describe('liberar', () => {
  // Stock propio: lo de arriba agotó el primer reactivo.
  beforeAll(async () => {
    reagent = await stockedReagent(lab);
  });

  it('pedir cambios y cancelar devuelven lo apartado', async () => {
    const before = await reserved();
    const assets = await activeAssets();
    // Dos fechas y una programada: la solicitud sigue enviada y admite «Pedir cambios».
    const request = await sentWith([inDays(22), inDays(29)], '5');
    await place(request, inDays(22), '13:00', '14:00');
    expect(await reserved()).toBe(before + 5);
    expect(await activeAssets()).toBe(assets + 1);
    const partial = await reload(request);
    const changed = await send(lab, 'POST', `/requests/${request.id}/request-changes`, { expectedVersion: partial.version, reason: 'Otra hora' });
    expect(changed.status).toBe(200);
    expect(await reserved()).toBe(before);
    expect(await activeAssets()).toBe(assets);
    expect(await count(`select count(*) as n from inventory.allocations where workspace_id = $1 and purpose = 'activity' and status = 'released'`, [lab.workspace.id])).toBeGreaterThan(0);
    // Programada entera, el laboratorio la cancela con motivo y también libera.
    const scheduled = await sentWith([inDays(25)], '5');
    await place(scheduled, inDays(25), '13:00', '14:00');
    const full = await reload(scheduled);
    expect(full.status).toBe('scheduled');
    expect(await reserved()).toBe(before + 5);
    expect((await send(lab, 'POST', `/requests/${scheduled.id}/lab-cancel`, { expectedVersion: full.version, reason: 'Área en mantenimiento' })).status).toBe(200);
    expect(await reserved()).toBe(before);
  });

  it('mover la hora vuelve a apartar el equipo en la nueva franja', async () => {
    const request = await sentWith([inDays(23)], '1');
    const placed = scheduledActivity.parse((await place(request, inDays(23), '15:00', '16:00')).body).activity;
    const moved = await send(lab, 'PATCH', `/activities/${placed.id}`, { areaId: area, startsAt: '16:00', endsAt: '17:00', responsibleId: lab.operator.principalId, expectedVersion: placed.version });
    expect(scheduledActivity.parse(moved.body).activity.complete).toBe(true);
    expect(await count(`select count(*) as n from labs.activity_assets where activity_id = $1 and released_at is null and lower(during)::time = '16:00'`, [placed.id])).toBe(1);
  });
});

describe('sin Reactivos', () => {
  it('se programa igual y el reactivo queda «Falta», sin apartar nada', async () => {
    const request = await sentWith([inDays(24)], '1');
    await setModuleStatus(admin, lab.workspace.id, 'reagents', 'disabled');
    try {
      const before = await reserved();
      const placed = scheduledActivity.parse((await place(request, inDays(24), '17:00', '18:00')).body);
      expect(placed.activity.complete).toBe(false);
      expect(await reserved()).toBe(before);
    } finally {
      await setModuleStatus(admin, lab.workspace.id, 'reagents', 'enabled');
    }
  });
});
