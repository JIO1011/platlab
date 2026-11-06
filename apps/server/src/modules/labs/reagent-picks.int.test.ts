import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { activity, labsRequest, reagentPickOptions, scheduledActivity, space, type Activity } from '@platlab/contracts';
import { admin, call, count } from '../../testing/api.js';
import { addLocation, setModuleStatus, uniqueSuffix } from '../../testing/core-fixtures.js';
import { complete, createRequestsLab, draft, inDays, save, send, type RequestsLab } from './labs.fixtures.js';

/**
 * Cambiar los frascos apartados (ADR 0023, «Cierre de Laboratorios»): el Administrador elige de qué frascos sale lo
 * apartado de un reactivo en un bloque, hasta lo pedido; lo anterior se libera en la misma transacción y lo que no
 * cubre queda «Falta».
 */

const everyDay = Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((day) => [day, [{ opens: '07:00', closes: '19:00' }]]));

let lab: RequestsLab;
let area: string;
let productId: string;
/** Frasco que vence antes (el que elige la reserva automática) y frasco que vence después. */
let sooner: string;
let later: string;

async function receive(expiresOn: string): Promise<string> {
  const code = `F-${uniqueSuffix()}`;
  const received = await call(lab.operator.subject, `/workspaces/${lab.workspace.id}/reagents/receipts`, {
    method: 'POST',
    body: { productId, locationId: lab.storage, quantity: '100', unit: 'g', expiresOn, codes: [code] },
    key: `rec-${uniqueSuffix()}`,
  });
  expect(received.status).toBe(201);
  return code;
}

beforeAll(async () => {
  lab = await createRequestsLab();
  const areaId = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
  area = space.parse((await send(lab, 'POST', '/spaces', { abbreviation: 'BIO', areaId, capacity: 40, weeklyHours: everyDay })).body).areaId;
});

// Stock propio en cada caso: un reactivo con dos frascos de 100 g.
beforeEach(async () => {
  const product = await call(lab.adminMember.subject, `/workspaces/${lab.workspace.id}/reagents/products`, {
    method: 'POST',
    body: { name: `Sulfato ${uniqueSuffix()}`, baseUnit: 'g', casNumber: '7758-98-7', physicalState: 'solid' },
  });
  expect(product.status).toBe(201);
  productId = (product.body as { id: string }).id;
  later = await receive(inDays(400));
  sooner = await receive(inDays(200));
});

/** Lo apartado de cada frasco, por su código. */
const reservedOf = (code: string) =>
  count(
    `select coalesce(sum(p.reserved), 0) as n from inventory.positions p join inventory.containers c on c.workspace_id = p.workspace_id and c.id = p.container_id where p.workspace_id = $1 and c.code = $2`,
    [lab.workspace.id, code],
  );

/** Un bloque programado que pide `grams` del reactivo, en la línea 1. */
async function placedBlock(grams: string, days: number, startsAt = '08:00', endsAt = '09:00'): Promise<Activity> {
  const request = await draft(lab);
  const saved = await save(lab, request, complete(request, [inDays(days)], { groups: 1, lines: [{ kind: 'reagent', itemId: productId, description: null, quantity: grams, unit: 'g' }] }));
  const sent = labsRequest.parse((await send(lab, 'POST', `/requests/${request.id}/submit`, { expectedVersion: saved.version }, lab.teacher.subject)).body);
  const placed = await send(lab, 'POST', '/activities', { requestId: sent.id, date: inDays(days), areaId: area, startsAt, endsAt, responsibleId: lab.operator.principalId, expectedVersion: sent.version });
  expect(placed.status).toBe(201);
  return scheduledActivity.parse(placed.body).activity;
}

const options = (block: Activity, subject = lab.adminMember.subject) => call(subject, `${lab.base}/activities/${block.id}/lines/1/reagent-options`);
const pick = (block: Activity, picks: Array<{ positionId: string; quantity: string }>, expectedVersion = block.version, subject = lab.adminMember.subject) =>
  send(lab, 'PUT', `/activities/${block.id}/lines/1/reagents`, { expectedVersion, picks }, subject);

describe('cambiar los frascos apartados', () => {
  it('lista los frascos vigentes ese día, los que vencen antes primero, con lo que el bloque ya apartó', async () => {
    const block = await placedBlock('30', 31);
    const listed = reagentPickOptions.parse((await options(block)).body);
    expect(listed.needed).toBe('30');
    expect(listed.unit).toBe('g');
    expect(listed.items.map((item) => [item.containerCode, item.available, item.held])).toEqual([
      [sooner, '100', '30'],
      [later, '100', '0'],
    ]);
  });

  it('aparta de lo elegido y libera lo anterior en una transacción; lo que no cubre queda «Falta»', async () => {
    const block = await placedBlock('30', 32);
    const [first, second] = reagentPickOptions.parse((await options(block)).body).items;
    const beforeSooner = await reservedOf(sooner);
    const beforeLater = await reservedOf(later);
    const changed = await pick(block, [{ positionId: second!.positionId, quantity: '20' }]);
    expect(changed.status).toBe(200);
    const updated = activity.parse(changed.body);
    expect(updated.complete).toBe(false);
    expect(updated.version).toBe(block.version + 1);
    expect(await reservedOf(sooner)).toBe(beforeSooner - 30);
    expect(await reservedOf(later)).toBe(beforeLater + 20);
    expect(await count(`select count(*) as n from inventory.allocations a join labs.activity_allocations aa on aa.allocation_id = a.id where aa.activity_id = $1 and a.status = 'released' and a.decision_reason = 'Cambio de frascos'`, [block.id])).toBe(1);
    // De dos frascos que suman lo pedido: completo otra vez.
    const both = await pick(updated, [
      { positionId: first!.positionId, quantity: '10' },
      { positionId: second!.positionId, quantity: '20' },
    ]);
    expect(activity.parse(both.body).complete).toBe(true);
  });

  it('rechaza lo que supera lo pedido, lo que el frasco no tiene y una versión vieja, sin cambiar nada', async () => {
    const block = await placedBlock('5', 33);
    const [first, second] = reagentPickOptions.parse((await options(block)).body).items;
    // 95 g del frasco que vence antes y 5 g del otro.
    const greedy = await placedBlock('100', 34);
    const total = async () => (await reservedOf(sooner)) + (await reservedOf(later));
    const before = await total();
    expect((await pick(block, [{ positionId: first!.positionId, quantity: '6' }])).status).toBe(400);
    expect((await pick(block, [{ positionId: second!.positionId, quantity: '5' }, { positionId: first!.positionId, quantity: '1' }])).status).toBe(400);
    expect((await pick(greedy, [{ positionId: first!.positionId, quantity: '100' }])).status).toBe(400);
    expect((await pick(block, [{ positionId: first!.positionId, quantity: '5' }], block.version + 7)).status).toBe(409);
    expect(await total()).toBe(before);
  });

  it('solo el Administrador cambia frascos', async () => {
    const block = await placedBlock('1', 35);
    expect((await options(block, lab.operator.subject)).status).toBe(403);
    expect((await pick(block, [], block.version, lab.operator.subject)).status).toBe(403);
  });

  it('sin Reactivos no se cambian frascos, y un bloque de otro espacio no existe', async () => {
    const block = await placedBlock('1', 37);
    const [first] = reagentPickOptions.parse((await options(block)).body).items;
    await setModuleStatus(admin, lab.workspace.id, 'reagents', 'disabled');
    try {
      expect((await options(block)).status).toBe(400);
      expect((await pick(block, [{ positionId: first!.positionId, quantity: '1' }])).status).toBe(400);
    } finally {
      await setModuleStatus(admin, lab.workspace.id, 'reagents', 'enabled');
    }
    const other = await createRequestsLab();
    const foreign = await call(other.adminMember.subject, `${other.base}/activities/${block.id}/lines/1/reagents`, {
      method: 'PUT',
      body: { expectedVersion: block.version, picks: [] },
      key: `req-${uniqueSuffix()}`,
    });
    expect(foreign.status).toBe(404);
  });

  it('dos cambios a la vez sobre el mismo bloque: gana uno y el saldo apartado cuadra', async () => {
    const block = await placedBlock('10', 36);
    const [first, second] = reagentPickOptions.parse((await options(block)).body).items;
    const before = (await reservedOf(sooner)) + (await reservedOf(later));
    const results = await Promise.all([pick(block, [{ positionId: first!.positionId, quantity: '10' }]), pick(block, [{ positionId: second!.positionId, quantity: '10' }])]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect((await reservedOf(sooner)) + (await reservedOf(later))).toBe(before);
  });
});
