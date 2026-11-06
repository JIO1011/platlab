import { beforeAll, describe, expect, it } from 'vitest';
import { activity, assetBookings, incidentPractice, labsRequest, scheduledActivity, space, type Activity } from '@platlab/contracts';
import { admin, call, count } from '../../testing/api.js';
import { addLocation } from '../../testing/core-fixtures.js';
import { complete, createRequestsLab, draft, equipmentType, inDays, save, send, stockedReagent, type RequestsLab } from './labs.fixtures.js';

/**
 * Preparación y cierre (ADR 0023, «Cierre de Laboratorios», L-01e): programada → lista → en curso → cerrada por quien
 * tenga `labs.schedule.lead`. Al cerrar, lo utilizado sale del inventario y lo devuelto vuelve a estar disponible; con
 * todos sus bloques cerrados, la solicitud queda «finalizada».
 */

const everyDay = Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((day) => [day, [{ opens: '07:00', closes: '19:00' }]]));

let lab: RequestsLab;
let area: string;
let typeId: string;
let days = 40;
/** Cada bloque llevado a hoy ocupa su propia hora, para no chocar con los demás en el área. */
let hour = 6;

beforeAll(async () => {
  lab = await createRequestsLab();
  const areaId = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
  area = space.parse((await send(lab, 'POST', '/spaces', { abbreviation: 'QUI', areaId, capacity: 40, weeklyHours: everyDay })).body).areaId;
  typeId = await equipmentType(lab);
});

/** Un bloque programado con 30 g de un reactivo propio (100 g en un frasco) y un equipo, cada uno en su fecha. */
async function placedBlock(): Promise<{ block: Activity; requestId: string; productId: string }> {
  const productId = await stockedReagent(lab);
  days += 1;
  const date = inDays(days);
  const request = await draft(lab);
  const lines = [
    { kind: 'reagent' as const, itemId: productId, description: null, quantity: '30', unit: 'g' },
    { kind: 'equipment' as const, assetTypeId: typeId, description: null, quantity: 1, perGroup: null },
  ];
  const saved = await save(lab, request, complete(request, [date], { groups: 1, lines }));
  const sent = labsRequest.parse((await send(lab, 'POST', `/requests/${request.id}/submit`, { expectedVersion: saved.version }, lab.teacher.subject)).body);
  const placed = await send(lab, 'POST', '/activities', { requestId: sent.id, date, areaId: area, startsAt: '08:00', endsAt: '10:00', responsibleId: lab.operator.principalId, expectedVersion: sent.version });
  expect(placed.status).toBe(201);
  return { block: scheduledActivity.parse(placed.body).activity, requestId: sent.id, productId };
}

/** Lleva el bloque al día de hoy, como si ya hubiera llegado la práctica (las fechas se piden futuras). */
function toToday(block: Activity) {
  hour += 1;
  const at = String(hour).padStart(2, '0');
  return admin.query(`update labs.activities set on_date = $2, starts_at = $3, ends_at = $4 where id = $1`, [block.id, inDays(0), `${at}:00`, `${at}:50`]);
}

const step = (block: Activity, path: 'ready' | 'start', subject = lab.operator.subject) => send(lab, 'POST', `/activities/${block.id}/${path}`, { expectedVersion: block.version }, subject);
const close = (block: Activity, usage: Array<{ line: number; used: string }>, subject = lab.operator.subject) =>
  send(lab, 'POST', `/activities/${block.id}/close`, { expectedVersion: block.version, usage, notes: 'Sin novedades' }, subject);

/** Lista e iniciada hoy, por el Operador. */
async function runningBlock() {
  const placed = await placedBlock();
  const ready = activity.parse((await step(placed.block, 'ready')).body);
  await toToday(ready);
  const started = await step(ready, 'start');
  expect(started.status).toBe(200);
  return { ...placed, block: activity.parse(started.body) };
}

const stockOf = (productId: string) =>
  count(`select coalesce(sum(balance), 0) as n from inventory.positions where workspace_id = $1 and item_id = $2`, [lab.workspace.id, productId]);
const reservedOf = (productId: string) =>
  count(`select coalesce(sum(reserved), 0) as n from inventory.positions where workspace_id = $1 and item_id = $2`, [lab.workspace.id, productId]);
const bookedAsset = async (block: Activity) =>
  (await admin.query<{ asset_id: string }>(`select asset_id from labs.activity_assets where activity_id = $1 and released_at is null`, [block.id])).rows[0]!.asset_id;

describe('preparar e iniciar', () => {
  it('lista de chequeo, «Lista» e «Iniciar» desde el día de la práctica, de a un paso', async () => {
    const { block } = await placedBlock();
    const checked = await send(lab, 'PUT', `/activities/${block.id}/checklist`, { expectedVersion: block.version, lines: [2, 1] }, lab.operator.subject);
    expect(checked.status).toBe(200);
    const prepared = activity.parse(checked.body);
    expect((await send(lab, 'PUT', `/activities/${block.id}/checklist`, { expectedVersion: prepared.version, lines: [3] }, lab.operator.subject)).status).toBe(400);
    expect((await step(prepared, 'start')).status).toBe(400);
    const ready = activity.parse((await step(prepared, 'ready')).body);
    expect(ready.stage).toBe('ready');
    expect((await step(ready, 'start')).status).toBe(400);
    await toToday(ready);
    const started = activity.parse((await step(ready, 'start')).body);
    expect(started.stage).toBe('running');
    expect((await step(started, 'ready')).status).toBe(400);
  });

  it('el Docente no lleva la práctica y una versión vieja no avanza', async () => {
    const { block } = await placedBlock();
    expect((await step(block, 'ready', lab.teacher.subject)).status).toBe(403);
    expect((await send(lab, 'POST', `/activities/${block.id}/ready`, { expectedVersion: block.version + 3 }, lab.operator.subject)).status).toBe(409);
  });

  it('una práctica que empezó no se mueve, no cambia frascos ni se libera', async () => {
    const { block, requestId } = await runningBlock();
    const moved = await send(lab, 'PATCH', `/activities/${block.id}`, { expectedVersion: block.version, areaId: area, startsAt: '09:00', endsAt: '11:00', responsibleId: lab.operator.principalId });
    expect(moved.status).toBe(400);
    expect((await send(lab, 'PUT', `/activities/${block.id}/lines/1/reagents`, { expectedVersion: block.version, picks: [] })).status).toBe(400);
    const request = labsRequest.parse((await call(lab.adminMember.subject, `${lab.base}/requests/${requestId}`)).body);
    expect((await send(lab, 'POST', `/requests/${requestId}/lab-cancel`, { expectedVersion: request.version, reason: 'Se suspende' })).status).toBe(400);
  });
});

describe('cerrar', () => {
  it('lo utilizado sale del inventario, lo devuelto vuelve a estar disponible y la solicitud queda «finalizada»', async () => {
    const { block, requestId, productId } = await runningBlock();
    expect(await reservedOf(productId)).toBe(30);
    const closed = await close(block, [{ line: 1, used: '12.5' }]);
    expect(closed.status).toBe(200);
    expect(activity.parse(closed.body)).toMatchObject({ stage: 'closed', complete: true });
    expect(await stockOf(productId)).toBe(87.5);
    expect(await reservedOf(productId)).toBe(0);
    const issued = await count(`select count(*) as n from inventory.operations where workspace_id = $1 and type = 'issue' and reason = $2`, [lab.workspace.id, `Práctica ${block.code}`]);
    expect(issued).toBe(1);
    const request = labsRequest.parse((await call(lab.adminMember.subject, `${lab.base}/requests/${requestId}`)).body);
    expect(request.status).toBe('completed');
    expect(request.events.at(-1)?.action).toBe('completed');
    expect(request.blocks[0]).toMatchObject({ stage: 'closed', closingNotes: 'Sin novedades', usage: [{ line: 1, held: '30', used: '12.5', returned: '17.5' }] });
    expect(request.blocks[0]!.holds.every((hold) => hold.complete)).toBe(true);
    expect((await close(activity.parse(closed.body), [{ line: 1, used: '1' }])).status).toBe(400);
  });

  it('rechaza lo que supera lo apartado, líneas que no apartan y una versión vieja, sin mover el inventario', async () => {
    const { block, productId } = await runningBlock();
    const before = await stockOf(productId);
    expect((await close(block, [{ line: 1, used: '31' }])).status).toBe(400);
    expect((await close(block, [])).status).toBe(400);
    expect((await close(block, [{ line: 1, used: '1' }, { line: 2, used: '1' }])).status).toBe(400);
    expect((await send(lab, 'POST', `/activities/${block.id}/close`, { expectedVersion: block.version + 1, usage: [{ line: 1, used: '1' }], notes: null }, lab.operator.subject)).status).toBe(409);
    expect(await stockOf(productId)).toBe(before);
    expect(await reservedOf(productId)).toBe(30);
  });

  it('dos cierres a la vez: gana uno y lo utilizado sale una sola vez', async () => {
    const { block, productId } = await runningBlock();
    const results = await Promise.all([close(block, [{ line: 1, used: '10' }]), close(block, [{ line: 1, used: '10' }])]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await stockOf(productId)).toBe(90);
    expect(await reservedOf(productId)).toBe(0);
  });

  it('iniciar y cancelar la solicitud a la vez: queda una de las dos, nunca una práctica iniciada y liberada', async () => {
    const { block, requestId } = await placedBlock();
    const ready = activity.parse((await step(block, 'ready')).body);
    await toToday(ready);
    const request = labsRequest.parse((await call(lab.adminMember.subject, `${lab.base}/requests/${requestId}`)).body);
    const [started, cancelled] = await Promise.all([
      step(ready, 'start'),
      send(lab, 'POST', `/requests/${requestId}/lab-cancel`, { expectedVersion: request.version, reason: 'Se suspende' }),
    ]);
    expect([started.status, cancelled.status].filter((status) => status === 200)).toHaveLength(1);
    const broken = await count(`select count(*) as n from labs.activities where id = $1 and started_at is not null and cancelled_at is not null`, [block.id]);
    expect(broken).toBe(0);
  });
});

describe('incidentes y «Reservado»', () => {
  it('el incidente de un equipo apartado nace en Equipos con el vínculo a la práctica', async () => {
    const { block } = await placedBlock();
    const assetId = await bookedAsset(block);
    const fault = { assetId, faultType: 'mechanical', description: 'No enciende', usable: true };
    expect((await send(lab, 'POST', `/activities/${block.id}/incidents`, fault, lab.operator.subject)).status).toBe(400);
    const ready = activity.parse((await step(block, 'ready')).body);
    await toToday(ready);
    const started = activity.parse((await step(ready, 'start')).body);
    expect((await send(lab, 'POST', `/activities/${started.id}/incidents`, { ...fault, assetId: crypto.randomUUID() }, lab.operator.subject)).status).toBe(400);
    const reported = await send(lab, 'POST', `/activities/${started.id}/incidents`, fault, lab.operator.subject);
    expect(reported.status).toBe(201);
    const faultId = (reported.body as { id: string }).id;
    expect(await count(`select count(*) as n from incidents.cases where id = $1 and asset_id = $2`, [faultId, assetId])).toBe(1);
    const linked = incidentPractice.parse((await call(lab.adminMember.subject, `${lab.base}/incidents/${faultId}/practice`)).body);
    expect(linked.practice).toMatchObject({ activityId: started.id, code: started.code, requesterName: 'Docente Uno', startsAt: started.startsAt });
  });

  it('la ficha del equipo muestra sus próximas reservas; una cerrada ya no', async () => {
    const { block } = await runningBlock();
    const assetId = await bookedAsset(block);
    const before = assetBookings.parse((await call(lab.adminMember.subject, `${lab.base}/assets/${assetId}/bookings`)).body);
    expect(before.items.map((item) => item.activityId)).toContain(block.id);
    await close(block, [{ line: 1, used: '0' }]);
    const after = assetBookings.parse((await call(lab.adminMember.subject, `${lab.base}/assets/${assetId}/bookings`)).body);
    expect(after.items.map((item) => item.activityId)).not.toContain(block.id);
    expect((await call(lab.teacher.subject, `${lab.base}/assets/${assetId}/bookings`)).status).toBe(403);
  });
});
