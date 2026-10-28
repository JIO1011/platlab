import { beforeAll, describe, expect, it } from 'vitest';
import { labsRequest, requestReview, space, type LabsRequest } from '@platlab/contracts';
import { admin, call } from '../../testing/api.js';
import { addLocation, setModuleStatus } from '../../testing/core-fixtures.js';
import { complete, createRequestsLab, draft, equipmentType, inDays, save, send, stockedReagent, type RequestsLab } from './labs.fixtures.js';

/**
 * Revisión antes de enviar (ADR 0023, «Flujo de la Propuesta»): contra todo el espacio y sin apartar nada. Por fecha,
 * el laboratorio pedido y los equipos libres en la franja; por reactivo, lo pedido en todas las fechas frente a lo
 * apartable, con dónde está. Lo que no alcanza trae alternativas.
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
async function draftWith(dates: string[], grams: string): Promise<LabsRequest> {
  const request = await draft(lab);
  return save(
    lab,
    request,
    complete(request, dates, {
      areaId: area,
      lines: [
        { kind: 'reagent', itemId: reagent, description: null, quantity: grams, unit: 'g' },
        { kind: 'equipment', assetTypeId: balanza, description: null, perGroup: null, quantity: 1 },
      ],
    }),
  );
}

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
    expect(body.dates.map((date) => [date.date, date.area?.problems, date.equipment.map((item) => [item.line, item.wanted, item.free, item.alternatives])])).toEqual([
      [inDays(20), [], [[1, 1, 1, []]]],
      [inDays(27), [], [[1, 1, 1, []]]],
    ]);
    expect(await reserved()).toBe(before);
  });

  it('lo que no alcanza trae alternativas: el área ocupada, el equipo en otras horas y el reactivo que hay', async () => {
    // Otra solicitud ocupa el área y la única balanza operativa de 08:00 a 10:00.
    const taken = await draftWith([inDays(21)], '10');
    const sent = await send(lab, 'POST', `/requests/${taken.id}/submit`, { expectedVersion: taken.version }, lab.teacher.subject);
    expect(sent.status).toBe(200);
    const approved = await send(lab, 'POST', `/requests/${taken.id}/approve`, { expectedVersion: labsRequest.parse(sent.body).version });
    expect(approved.status).toBe(200);

    const request = await draftWith([inDays(21)], '500');
    const body = requestReview.parse((await review(request)).body);
    const [date] = body.dates;
    expect(date!.area?.problems).toEqual(['overlap']);
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
