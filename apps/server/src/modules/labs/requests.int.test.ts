import { beforeAll, describe, expect, it } from 'vitest';
import { labsRequest, requestList, requestOptions, type SaveRequest } from '@platlab/contracts';
import { call, count, errorCode } from '../../testing/api.js';
import { complete, createRequestsLab, draft, equipmentType, inDays, save, send, stockedReagent, submitted, type RequestsLab } from './labs.fixtures.js';

/**
 * L-01b (ADR 0023, «Diseño de L-01b»): Solicitudes por HTTP, con el rol de runtime. El Docente y el tesista piden; el
 * Operador consulta las recibidas; el Administrador pide cambios o rechaza. Los recursos se validan con el stock y
 * los equipos reales de Reactivos y Equipos, sin reservar nada.
 */

let lab: RequestsLab;

beforeAll(async () => {
  lab = await createRequestsLab();
});

describe('borrador', () => {
  it('el Docente y el tesista piden con número fijo; el Administrador y el Operador no piden', async () => {
    const mine = await draft(lab);
    expect(mine).toMatchObject({ status: 'draft', teacherName: 'Docente Uno', formName: 'Práctica académica', mine: true, lines: [] });
    expect(mine.code).toBe(`SOL-${String(mine.number).padStart(4, '0')}`);
    const thesis = await draft(lab, lab.student.subject);
    expect(thesis.number).toBe(mine.number + 1);
    for (const subject of [lab.operator.subject, lab.adminMember.subject, lab.workspace.owner.subject]) {
      const denied = await send(lab, 'POST', '/requests', { formId: lab.form.id }, subject);
      expect(denied.status).toBe(403);
      expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    }
  });

  it('dos borradores a la vez toman números distintos y seguidos', async () => {
    const fresh = await createRequestsLab(['labs']);
    const created = await Promise.all(Array.from({ length: 5 }, () => draft(fresh)));
    const numbers = created.map((request) => request.number).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5]);
  });

  it('guarda a medias; asignatura y carrera nuevas entran a su lista, sin repetirse', async () => {
    const request = await draft(lab);
    const saved = await save(lab, request, { ...complete(request, []), title: null, subject: 'química general' });
    expect(saved).toMatchObject({ status: 'draft', title: null, subject: 'química general', career: 'Bioquímica', version: request.version + 1 });
    const again = await draft(lab, lab.otherTeacher.subject);
    expect((await save(lab, again, complete(again, []), lab.otherTeacher.subject)).subject).toBe('química general');
    const options = requestOptions.parse((await call(lab.teacher.subject, `${lab.base}/request-options`)).body);
    expect(options.subjects.filter((name) => name.toLowerCase() === 'química general')).toHaveLength(1);
    expect(options).toMatchObject({ reagentsEnabled: true, equipmentEnabled: true });
  });

  it('un dato libre que el formato no tiene, o con otro tipo, no se guarda', async () => {
    const request = await draft(lab);
    for (const answers of [{ inventado: 'x' }, { practica_n: 'tres' }]) {
      const response = await send(lab, 'PUT', `/requests/${request.id}`, { ...complete(request, []), answers }, lab.teacher.subject);
      expect(response.status).toBe(400);
      expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
    }
  });

  it('con una versión vieja, VERSION_CONFLICT', async () => {
    const request = await draft(lab);
    await save(lab, request, complete(request, []));
    const stale = await send(lab, 'PUT', `/requests/${request.id}`, complete(request, []), lab.teacher.subject);
    expect(stale.status).toBe(409);
    expect(errorCode(stale.body)).toBe('VERSION_CONFLICT');
  });
});

describe('recursos', () => {
  it('✔ si alcanza, ⚠ si no, ✖ sin catálogo; el total por grupo lo calcula el servidor', async () => {
    const reagent = await stockedReagent(lab);
    const type = await equipmentType(lab);
    const request = await draft(lab);
    const operations = () => count('select count(*) as n from inventory.operations where workspace_id = $1', [lab.workspace.id]);
    const before = await operations();
    const saved = await save(
      lab,
      request,
      complete(request, [], {
        lines: [
          { kind: 'reagent', itemId: reagent, description: null, quantity: '50.5', unit: 'g' },
          { kind: 'reagent', itemId: reagent, description: null, quantity: '150', unit: 'g' },
          { kind: 'reagent', itemId: null, description: 'Fenolftaleína 1 %', quantity: '20', unit: 'mL' },
          { kind: 'equipment', assetTypeId: type, description: null, perGroup: 1, quantity: 1 },
          { kind: 'equipment', assetTypeId: type, description: null, perGroup: null, quantity: 1 },
          { kind: 'material', description: 'Pipeta de 10 mL', perGroup: '2', quantity: '1' },
        ],
      }),
    );
    expect(saved.lines.map((line) => [line.kind, line.check, line.quantity])).toEqual([
      ['reagent', 'ok', '50.5'],
      ['reagent', 'short', '150'],
      ['reagent', 'unverified', '20'],
      // 1 por grupo × 6 grupos = 6; hay un solo equipo operativo (el de la falla no cuenta).
      ['equipment', 'short', 6],
      ['equipment', 'ok', 1],
      ['material', 'unverified', '12'],
    ]);
    expect(saved.lines[0]).toMatchObject({ unit: 'g', available: '100' });
    expect(saved.exceptions).toBe(4);
    // Validar no reserva: no hay operaciones de inventario nuevas.
    expect(await operations()).toBe(before);
    // Un reactivo del catálogo va en su unidad base.
    const otherUnit = await send(lab, 'PUT', `/requests/${request.id}`, complete(saved, [], { lines: [{ kind: 'reagent', itemId: reagent, description: null, quantity: '1', unit: 'kg' }] }), lab.teacher.subject);
    expect(otherUnit.status).toBe(400);
  });

  it('un reactivo de otro espacio no se pide', async () => {
    const other = await createRequestsLab();
    const foreign = await stockedReagent(other);
    const request = await draft(lab);
    const response = await send(lab, 'PUT', `/requests/${request.id}`, complete(request, [], { lines: [{ kind: 'reagent', itemId: foreign, description: null, quantity: '1', unit: 'g' }] }), lab.teacher.subject);
    expect(response.status).toBe(400);
    expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
  });

  it('sin Reactivos ni Equipos, lo que se pide va «no catalogado»', async () => {
    const plain = await createRequestsLab(['labs']);
    const options = requestOptions.parse((await call(plain.teacher.subject, `${plain.base}/request-options`)).body);
    expect(options).toMatchObject({ reagentsEnabled: false, equipmentEnabled: false, reagents: [], equipmentTypes: [] });
    // Y del catálogo de otro espacio con Reactivos, tampoco.
    const request = await draft(plain);
    const foreign = await stockedReagent(lab);
    const response = await send(plain, 'PUT', `/requests/${request.id}`, complete(request, [], { lines: [{ kind: 'reagent', itemId: foreign, description: null, quantity: '1', unit: 'g' }] }), plain.teacher.subject);
    expect(response.status).toBe(400);
  });
});

describe('envío', () => {
  it('exige lo esencial, fechas futuras y dentro de un período', async () => {
    const request = await draft(lab);
    const cases: Array<[SaveRequest, RegExp]> = [
      [{ ...complete(request, [inDays(30)]), title: null, subject: null }, /título.*asignatura/],
      [complete(request, [inDays(-1)]), /futuras/],
      [complete(request, [inDays(200)]), /períodos/],
    ];
    let version = request.version;
    for (const [body, message] of cases) {
      const saved = await save(lab, request, { ...body, expectedVersion: version });
      version = saved.version;
      const response = await send(lab, 'POST', `/requests/${request.id}/submit`, { expectedVersion: version }, lab.teacher.subject);
      expect(response.status).toBe(400);
      expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
      expect((response.body as { error: { message: string } }).error.message).toMatch(message);
    }
  });

  it('antes de la anticipación entra «fuera de plazo», sin bloquearse', async () => {
    expect((await submitted(lab, [inDays(30)])).late).toBe(false);
    const late = await submitted(lab, [inDays(3), inDays(40)]);
    expect(late).toMatchObject({ status: 'submitted', late: true, firstDate: inDays(3), dateCount: 2 });
    expect(late.events.map((event) => event.action)).toEqual(['submitted']);
  });
});

describe('quién ve qué', () => {
  it('nadie ve un borrador ajeno; el Operador consulta las enviadas, pero no las resuelve', async () => {
    const hidden = await draft(lab);
    const sent = await submitted(lab);
    for (const subject of [lab.otherTeacher.subject, lab.operator.subject]) {
      expect((await call(subject, `${lab.base}/requests/${hidden.id}`)).status).toBe(404);
    }
    expect((await call(lab.otherTeacher.subject, `${lab.base}/requests/${sent.id}`)).status).toBe(404);
    const inbox = requestList.parse((await call(lab.operator.subject, `${lab.base}/requests?scope=inbox`)).body);
    expect(inbox.items.map((item) => item.id)).toContain(sent.id);
    expect(inbox.items.map((item) => item.id)).not.toContain(hidden.id);
    expect(inbox.items.every((item) => item.status !== 'draft')).toBe(true);
    const mine = requestList.parse((await call(lab.otherTeacher.subject, `${lab.base}/requests?scope=mine`)).body);
    expect(mine.items.map((item) => item.id)).not.toContain(sent.id);
    expect((await call(lab.teacher.subject, `${lab.base}/requests?scope=inbox`)).status).toBe(403);
    const denied = await send(lab, 'POST', `/requests/${sent.id}/reject`, { expectedVersion: sent.version, reason: 'No' }, lab.operator.subject);
    expect(denied.status).toBe(403);
    // Otro espacio no la encuentra.
    const other = await createRequestsLab(['labs']);
    expect((await call(other.adminMember.subject, `/workspaces/${other.workspace.id}/labs/requests/${sent.id}`)).status).toBe(404);
  });

  it('la bandeja pone primero lo fuera de plazo o con recursos que faltan', async () => {
    const fresh = await createRequestsLab();
    const calm = await submitted(fresh, [inDays(20)]);
    const urgent = await submitted(fresh, [inDays(2)]);
    const inbox = requestList.parse((await call(fresh.adminMember.subject, `${fresh.base}/requests?scope=inbox`)).body);
    expect(inbox.items.map((item) => item.id)).toEqual([urgent.id, calm.id]);
  });
});

describe('resolver', () => {
  it('cambios con motivo, corrección y reenvío; rechazo final, una sola vez', async () => {
    const sent = await submitted(lab);
    const noReason = await send(lab, 'POST', `/requests/${sent.id}/request-changes`, { expectedVersion: sent.version, reason: '' });
    expect(noReason.status).toBe(400);
    const changes = labsRequest.parse((await send(lab, 'POST', `/requests/${sent.id}/request-changes`, { expectedVersion: sent.version, reason: 'Falta el área' })).body);
    expect(changes).toMatchObject({ status: 'changes_requested' });
    const fixed = await save(lab, changes, complete(changes, [inDays(31)]));
    const resent = labsRequest.parse((await send(lab, 'POST', `/requests/${sent.id}/submit`, { expectedVersion: fixed.version }, lab.teacher.subject)).body);
    expect(resent.events.map((event) => [event.action, event.reason, event.by])).toEqual([
      ['submitted', null, 'Docente Uno'],
      ['changes_requested', 'Falta el área', 'Administradora'],
      ['resubmitted', null, 'Docente Uno'],
    ]);
    const rejected = labsRequest.parse((await send(lab, 'POST', `/requests/${sent.id}/reject`, { expectedVersion: resent.version, reason: 'Sin cupo' })).body);
    expect(rejected.status).toBe('rejected');
    const twice = await send(lab, 'POST', `/requests/${sent.id}/reject`, { expectedVersion: rejected.version, reason: 'Otra vez' });
    expect(twice.status).toBe(409);
    expect(errorCode(twice.body)).toBe('REQUEST_RESOLVED');
    const cancel = await send(lab, 'POST', `/requests/${sent.id}/cancel`, { expectedVersion: rejected.version }, lab.teacher.subject);
    expect(cancel.status).toBe(400);
    expect(await count(`select count(*) as n from core.audit_events where entity_id = $1 and action like 'labs.request.%'`, [sent.id])).toBeGreaterThanOrEqual(6);
  });

  it('quien pide cancela lo suyo; otra persona no', async () => {
    const sent = await submitted(lab);
    expect((await send(lab, 'POST', `/requests/${sent.id}/cancel`, { expectedVersion: sent.version }, lab.otherTeacher.subject)).status).toBe(404);
    const cancelled = labsRequest.parse((await send(lab, 'POST', `/requests/${sent.id}/cancel`, { expectedVersion: sent.version }, lab.teacher.subject)).body);
    expect(cancelled).toMatchObject({ status: 'cancelled' });
    const edit = await send(lab, 'PUT', `/requests/${sent.id}`, complete(cancelled, []), lab.teacher.subject);
    expect(edit.status).toBe(400);
  });

  it('duplicar copia datos y recursos con número nuevo, sin las fechas', async () => {
    const type = await equipmentType(lab);
    const source = await draft(lab);
    await save(lab, source, complete(source, [inDays(30)], { lines: [{ kind: 'equipment', assetTypeId: type, description: null, perGroup: 2, quantity: 1 }] }));
    const copy = labsRequest.parse((await send(lab, 'POST', '/requests', { from: source.id }, lab.teacher.subject)).body);
    // La lista guarda la grafía con que entró la asignatura por primera vez.
    expect(copy).toMatchObject({ status: 'draft', title: 'Titulación ácido-base', subject: expect.stringMatching(/^química general$/i), dates: [], groups: 6, answers: { practica_n: 3 } });
    expect(copy.number).toBeGreaterThan(source.number);
    expect(copy.lines).toMatchObject([{ kind: 'equipment', perGroup: 2, quantity: 12 }]);
    // De otra persona, no.
    expect((await send(lab, 'POST', '/requests', { from: source.id }, lab.otherTeacher.subject)).status).toBe(404);
  });
});
