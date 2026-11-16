import { beforeAll, describe, expect, it } from 'vitest';
import { labsRequest, requestCheck, requestList, requestOptions, requestReview, space, type LabsRequest, type SaveRequest } from '@platlab/contracts';
import { admin, call } from '../../testing/api.js';
import { addLocation, setModuleStatus, uniqueSuffix } from '../../testing/core-fixtures.js';
import { complete, createRequestsLab, draft, equipmentType, inDays, save, send, stockedReagent, type RequestsLab } from './labs.fixtures.js';

/**
 * Revisión antes de enviar (ADR 0023, «Flujo de la Propuesta»): contra todo el espacio y sin apartar nada. Por fecha,
 * el laboratorio pedido y los equipos libres en la franja; por reactivo, lo pedido en todas las fechas frente a lo
 * apartable, con dónde está. Lo que no alcanza trae alternativas. La marca de cada línea, el buscador, Recibidas y la
 * consulta sin guardar usan la misma regla (ADR 0023, «Disponibilidad y recursos»).
 */

const everyDay = Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((day) => [day, [{ opens: '07:00', closes: '19:00' }]]));

let lab: RequestsLab;
let area: string;
let reagent: string;
let balanza: string;

beforeAll(async () => {
  lab = await createRequestsLab();
  const areaId = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
  area = space.parse((await send(lab, 'POST', '/spaces', { abbreviation: 'QUI', areaId, capacity: 40, weeklyHours: everyDay })).body).areaId;
  reagent = await stockedReagent(lab);
  balanza = await equipmentType(lab);
});

/** Un borrador del docente en el área, de 08:00 a 10:00, con un reactivo y una balanza por fecha. */
async function draftWith(dates: string[], grams: string, item = reagent, type = balanza): Promise<LabsRequest> {
  const request = await draft(lab);
  return save(
    lab,
    request,
    complete(request, dates, {
      lines: [
        { kind: 'reagent', itemId: item, description: null, quantity: grams, unit: 'g' },
        { kind: 'equipment', assetTypeId: type, description: null, perGroup: null, quantity: 1 },
      ],
    }),
  );
}

/** Programa en el Cronograma cada fecha de una solicitud enviada, en el área de 08:00 a 10:00: apartan lo suyo. */
async function placeAll(request: LabsRequest): Promise<LabsRequest> {
  let current = request;
  for (const date of current.dates) {
    const placed = await send(lab, 'POST', '/activities', { requestId: current.id, date, areaId: area, startsAt: '08:00', endsAt: '10:00', responsibleId: lab.operator.principalId, expectedVersion: current.version });
    expect(placed.status).toBe(201);
    current = labsRequest.parse((await call(lab.teacher.subject, `${lab.base}/requests/${current.id}`)).body);
  }
  return current;
}

/** Una solicitud enviada y programada en el área, de 08:00 a 10:00: sus fechas apartan lo suyo. */
async function scheduledWith(dates: string[], lines: SaveRequest['lines']): Promise<LabsRequest> {
  const request = await draft(lab);
  const saved = await save(lab, request, complete(request, dates, { lines }));
  const sent = await send(lab, 'POST', `/requests/${saved.id}/submit`, { expectedVersion: saved.version }, lab.teacher.subject);
  expect(sent.status).toBe(200);
  return placeAll(labsRequest.parse(sent.body));
}

const marks = (request: LabsRequest) => request.lines.map((line) => [line.check, 'available' in line ? line.available : undefined]);

const review = (request: LabsRequest, subject = lab.teacher.subject) => call(subject, `${lab.base}/requests/${request.id}/review`);
const reserved = async () =>
  Number((await admin.query<{ n: string }>(`select coalesce(sum(reserved), 0) as n from inventory.positions where workspace_id = $1`, [lab.workspace.id])).rows[0]!.n);

describe('revisar antes de enviar', () => {
  it('todo alcanza: lo pedido en todas las fechas, dónde está y nada apartado', async () => {
    const before = await reserved();
    const request = await draftWith([inDays(20), inDays(27)], '30');
    const result = await review(request);
    expect(result.status).toBe(200);
    const body = requestReview.parse(result.body);
    expect(body.reagents).toEqual([{ line: 0, name: expect.any(String), unit: 'g', needed: '60', available: '100', areas: [{ name: expect.any(String), available: '100' }] }]);
    expect(body.dates.map((date) => [date.date, date.equipment.map((item) => [item.line, item.wanted, item.free, item.alternatives])])).toEqual([
      [inDays(20), [[1, 1, 1, []]]],
      [inDays(27), [[1, 1, 1, []]]],
    ]);
    expect(await reserved()).toBe(before);
  });

  it('lo que no alcanza trae alternativas: el equipo en otras horas y el reactivo que hay', async () => {
    // Otra solicitud programada ocupa la única balanza operativa de 08:00 a 10:00.
    const taken = await draftWith([inDays(21)], '10');
    const sent = await send(lab, 'POST', `/requests/${taken.id}/submit`, { expectedVersion: taken.version }, lab.teacher.subject);
    expect(sent.status).toBe(200);
    await placeAll(labsRequest.parse(sent.body));

    const request = await draftWith([inDays(21)], '500');
    const body = requestReview.parse((await review(request)).body);
    const [date] = body.dates;
    expect(date!.equipment[0]).toMatchObject({ wanted: 1, free: 0 });
    expect(date!.equipment[0]!.alternatives).toEqual([
      { startsAt: '10:00', endsAt: '12:00' },
      { startsAt: '10:30', endsAt: '12:30' },
      { startsAt: '11:00', endsAt: '13:00' },
    ]);
    const [line] = body.reagents;
    expect(line).toMatchObject({ needed: '500', available: '90' });
  });

  it('sin Reactivos admitido, sus líneas no se revisan', async () => {
    const request = await draftWith([inDays(23)], '5');
    await setModuleStatus(admin, lab.workspace.id, 'reagents', 'disabled');
    try {
      const body = requestReview.parse((await review(request)).body);
      expect(body.reagents).toEqual([]);
      expect(body.dates[0]!.equipment).toHaveLength(1);
    } finally {
      await setModuleStatus(admin, lab.workspace.id, 'reagents', 'enabled');
    }
  });

  it('un borrador ajeno no se revisa', async () => {
    const request = await draftWith([inDays(24)], '5');
    expect((await review(request, lab.otherTeacher.subject)).status).toBe(404);
    expect((await review(request, lab.adminMember.subject)).status).toBe(404);
  });
});

describe('una sola regla de disponibilidad (ADR 0023, «Disponibilidad y recursos»)', () => {
  it('reactivo: la marca de la línea, la revisión y el buscador cuentan lo mismo (todas las fechas y sin lo reservado)', async () => {
    const item = await stockedReagent(lab);
    // 60 g por fecha en dos fechas son 120 g: con 100 g, no alcanza aunque una fecha sí.
    const twice = await draftWith([inDays(40), inDays(47)], '60', item);
    expect(marks(twice)[0]).toEqual(['short', '100']);
    expect(requestReview.parse((await review(twice)).body).reagents[0]).toMatchObject({ needed: '120', available: '100' });
    // Lo reservado por otra práctica ya no está libre: ni para la línea, ni para la revisión, ni para el buscador.
    await scheduledWith([inDays(41)], [{ kind: 'reagent', itemId: item, description: null, quantity: '30', unit: 'g' }]);
    const after = await draftWith([inDays(48)], '80', item);
    expect(marks(after)[0]).toEqual(['short', '70']);
    expect(requestReview.parse((await review(after)).body).reagents[0]).toMatchObject({ needed: '80', available: '70' });
    const options = requestOptions.parse((await call(lab.teacher.subject, `${lab.base}/request-options`)).body);
    expect(options.reagents.find((option) => option.id === item)?.available).toBe('70');
  });

  it('equipo: cuenta los libres en la franja el peor día pendiente; sin fecha, los operativos', async () => {
    const type = await equipmentType(lab);
    await scheduledWith([inDays(50)], [{ kind: 'equipment', assetTypeId: type, description: null, perGroup: null, quantity: 1 }]);
    // La única operativa está apartada el día 50 de 08:00 a 10:00: con ese día entre los pendientes, no alcanza.
    const busy = await draftWith([inDays(49), inDays(50)], '1', reagent, type);
    expect(marks(busy)[1]).toEqual(['short', 0]);
    expect(requestReview.parse((await review(busy)).body).dates.map((date) => date.equipment[0]?.free)).toEqual([1, 0]);
    const free = await draftWith([inDays(49)], '1', reagent, type);
    expect(marks(free)[1]).toEqual(['ok', 1]);
    const undated = await draftWith([], '1', reagent, type);
    expect(marks(undated)[1]).toEqual(['ok', 1]);
  });

  it('con todas sus fechas programadas, la marca sale de lo apartado, también en Recibidas', async () => {
    const item = await stockedReagent(lab);
    const enough = await scheduledWith([inDays(55)], [{ kind: 'reagent', itemId: item, description: null, quantity: '40', unit: 'g' }]);
    expect(enough.status).toBe('scheduled');
    expect(marks(enough)).toEqual([['ok', null]]);
    // Pide más de lo que hay: se aparta lo que había (60 g) y la línea queda sin alcanzar.
    const short = await scheduledWith([inDays(56)], [{ kind: 'reagent', itemId: item, description: null, quantity: '200', unit: 'g' }]);
    expect(marks(short)).toEqual([['short', null]]);
    const inbox = requestList.parse((await call(lab.adminMember.subject, `${lab.base}/requests?scope=inbox`)).body);
    expect(inbox.items.filter((summary) => [enough.id, short.id].includes(summary.id)).map((summary) => [summary.id, summary.exceptions])).toEqual(
      expect.arrayContaining([
        [enough.id, { reagent: 0, equipment: 0, material: 0 }],
        [short.id, { reagent: 1, equipment: 0, material: 0 }],
      ]),
    );
  });

  it('lo libre del catálogo dice el saldo vigente esas fechas y lo apartado; lo vencido no cuenta', async () => {
    const item = await stockedReagent(lab);
    // 25 g más de un lote que vence antes de la fecha consultada.
    const received = await call(lab.operator.subject, `/workspaces/${lab.workspace.id}/reagents/receipts`, {
      method: 'POST',
      body: { productId: item, locationId: lab.storage, expiresOn: inDays(30), quantity: '25', unit: 'g', codes: [`F-${uniqueSuffix()}`] },
      key: `rec-${uniqueSuffix()}`,
    });
    expect(received.status).toBe(201);
    // Otra práctica aparta 30 g del lote vigente.
    await scheduledWith([inDays(40)], [{ kind: 'reagent', itemId: item, description: null, quantity: '30', unit: 'g' }]);
    const request = await draft(lab);
    const body = { dates: [inDays(60)], startsAt: '08:00', endsAt: '10:00', participants: 10, groups: 1, lines: [] };
    const checked = requestCheck.parse((await send(lab, 'POST', `/requests/${request.id}/check`, body, lab.teacher.subject)).body);
    expect(checked.catalog.reagents.find((reagent) => reagent.id === item)).toEqual({ id: item, available: '70', stock: '100', held: '30' });
    // Sin fechas cuenta hoy: el lote de 25 g sigue vigente.
    const today = requestCheck.parse((await send(lab, 'POST', `/requests/${request.id}/check`, { ...body, dates: [] }, lab.teacher.subject)).body);
    expect(today.catalog.reagents.find((reagent) => reagent.id === item)).toEqual({ id: item, available: '95', stock: '125', held: '30' });
  });

  it('la consulta sin guardar marca lo que se está llenando con la misma regla y no cambia nada', async () => {
    const item = await stockedReagent(lab);
    const type = await equipmentType(lab);
    const request = await draft(lab);
    const before = await reserved();
    const body = {
      dates: [inDays(60), inDays(61)],
      startsAt: '08:00',
      endsAt: '10:00',
      participants: 24,
      groups: 6,
      lines: [
        { kind: 'reagent', itemId: item, description: null, quantity: '40', unit: 'g' },
        { kind: 'reagent', itemId: item, description: null, quantity: '60', unit: 'g' },
        { kind: 'reagent', itemId: null, description: 'Fenolftaleína 1 %', quantity: '20', unit: 'mL' },
        { kind: 'equipment', assetTypeId: type, description: null, perGroup: 1, quantity: 1 },
        { kind: 'material', description: 'Pipeta de 10 mL', perGroup: '2', quantity: '1' },
      ],
    };
    const response = await send(lab, 'POST', `/requests/${request.id}/check`, body, lab.teacher.subject);
    expect(response.status).toBe(200);
    const checked = requestCheck.parse(response.body);
    expect(checked.lines.map((line) => [line.kind, line.check, line.quantity])).toEqual([
      ['reagent', 'ok', '40'],
      ['reagent', 'short', '60'],
      ['reagent', 'unverified', '20'],
      // Por grupo × 6 grupos, como al guardar.
      ['equipment', 'short', 6],
      ['material', 'unverified', '12'],
    ]);
    expect(checked.review.reagents.map((line) => [line.line, line.needed, line.available])).toEqual([
      [0, '80', '100'],
      [1, '120', '100'],
    ]);
    expect(checked.review.dates.map((date) => date.date)).toEqual([inDays(60), inDays(61)]);
    // El buscador: lo libre de cada reactivo y tipo de equipo del catálogo para esas fechas y esa franja.
    expect(checked.catalog.reagents.find((reagent) => reagent.id === item)).toMatchObject({ available: '100', stock: '100', held: '0' });
    // Un equipo operativo y otro con falla: uno libre de uno operativo.
    expect(checked.catalog.equipmentTypes.find((equipment) => equipment.id === type)).toMatchObject({ available: 1, total: 1 });
    // No guardó ni apartó nada.
    const stored = labsRequest.parse((await call(lab.teacher.subject, `${lab.base}/requests/${request.id}`)).body);
    expect(stored).toMatchObject({ version: request.version, lines: [], dates: [] });
    expect(await reserved()).toBe(before);
    // Solo quien pide, sobre la suya.
    expect((await send(lab, 'POST', `/requests/${request.id}/check`, body, lab.otherTeacher.subject)).status).toBe(404);
    expect((await send(lab, 'POST', `/requests/${request.id}/check`, body)).status).toBe(403);
    const invalid = await send(lab, 'POST', `/requests/${request.id}/check`, { ...body, startsAt: '11:00' }, lab.teacher.subject);
    expect(invalid.status).toBe(400);
  });
});
