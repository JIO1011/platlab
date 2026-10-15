import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  issueRequestList,
  issueResponse,
  movementResponse,
  positionList,
  reagentsSummary,
  entryList,
} from '@platlab/contracts';
import { addMember, setModuleStatus, uniqueSuffix } from '../../testing/core-fixtures.js';
import {
  admin,
  call,
  errorCode,
  type Lab,
  createLab,
  createProduct,
  receive,
  listEntry,
  receivedPosition,
  count,
} from './reagents.fixtures.js';

describe('R-01A · motivos y destinos (ADR 0012)', () => {
  it('el Administrador los administra, el Operador los consulta, y archivar los quita sin borrarlos', async () => {
    const lab = await createLab();
    const created = await call(lab.adminMember.subject, `${lab.base}/reasons`, {
      method: 'POST',
      body: { kind: 'issue', name: 'Práctica de Química General' },
    });
    expect(created.status).toBe(201);
    const reason = listEntry.parse(created.body);
    // Repetir el nombre (sin distinguir mayúsculas) no duplica la lista.
    const again = await call(lab.adminMember.subject, `${lab.base}/reasons`, {
      method: 'POST',
      body: { kind: 'issue', name: 'práctica de química general' },
    });
    expect(listEntry.parse(again.body).id).toBe(reason.id);
    // Los motivos de ajuste son otra lista.
    await call(lab.adminMember.subject, `${lab.base}/reasons`, { method: 'POST', body: { kind: 'adjustment', name: 'Conteo' } });

    const operatorList = entryList.parse((await call(lab.operator.subject, `${lab.base}/reasons?kind=issue`)).body);
    expect(operatorList.items.map((item) => item.name)).toEqual(['Práctica de Química General']);
    const denied = await call(lab.operator.subject, `${lab.base}/reasons`, {
      method: 'POST',
      body: { kind: 'issue', name: 'Otro' },
    });
    expect(denied.status).toBe(403);

    const destination = listEntry.parse(
      (await call(lab.adminMember.subject, `${lab.base}/destinations`, { method: 'POST', body: { name: 'Laboratorio 1' } })).body,
    );
    expect(entryList.parse((await call(lab.operator.subject, `${lab.base}/destinations`)).body).items).toEqual([destination]);

    expect((await call(lab.adminMember.subject, `${lab.base}/reasons/${reason.id}/archive`, { method: 'POST' })).status).toBe(200);
    expect(entryList.parse((await call(lab.operator.subject, `${lab.base}/reasons?kind=issue`)).body).items).toEqual([]);
    // El registro sigue en la base: archivado, no borrado.
    expect(await count('select count(*) as n from inventory.reasons where id = $1 and archived_at is not null', [reason.id])).toBe(1);
    // Archivar dos veces, o desde otro espacio, no encuentra nada.
    expect((await call(lab.adminMember.subject, `${lab.base}/reasons/${reason.id}/archive`, { method: 'POST' })).status).toBe(404);
    const other = await createLab();
    expect((await call(other.adminMember.subject, `${other.base}/destinations/${destination.id}/archive`, { method: 'POST' })).status).toBe(404);
  });
});

describe('R-01A · salidas con aprobación y reserva (ADR 0012)', () => {
  const requestBody = (positionId: string, quantity: string) => ({
    positionId,
    quantity,
    unit: 'g',
    reason: 'Práctica',
    destination: 'Laboratorio 1',
  });

  async function requestIssue(lab: Lab, positionId: string, quantity: string, subject = lab.operator.subject) {
    return call(subject, `${lab.base}/issues`, { method: 'POST', body: requestBody(positionId, quantity) });
  }

  const requestIdOf = (response: { body: unknown }) => {
    const parsed = issueResponse.parse(response.body);
    if (parsed.status !== 'pending') throw new Error('se esperaba una solicitud pendiente');
    return parsed.requestId;
  };

  const positionOf = async (lab: Lab, positionId: string) =>
    positionList.parse((await call(lab.adminMember.subject, `${lab.base}/positions`)).body).items.find(
      (position) => position.id === positionId,
    )!;

  async function stockedLab(quantity = '100') {
    const lab = await createLab();
    const product = await createProduct(lab);
    const positionId = receivedPosition(await receive(lab, product.id, quantity, lab.storage, lab.operator.subject, { codes: ['NAC-001'] }));
    return { lab, positionId };
  }

  it('el Operador pide y aparta; quien aprueba registra al instante; lo apartado no se puede sacar ni ajustar', async () => {
    const { lab, positionId } = await stockedLab();
    const request = await requestIssue(lab, positionId, '30');
    expect(request.status).toBe(201);
    expect(issueResponse.parse(request.body)).toMatchObject({ status: 'pending', quantity: '30', available: '70' });
    expect(await positionOf(lab, positionId)).toMatchObject({ balance: '100', reserved: '30' });
    expect(await count('select count(*) as n from inventory.operations where workspace_id = $1 and type = $2', [lab.workspace.id, 'issue'])).toBe(0);

    // La salida del Administrador es directa, pero no toca lo apartado.
    const tooMuch = await requestIssue(lab, positionId, '80', lab.adminMember.subject);
    expect(tooMuch.status).toBe(409);
    expect(errorCode(tooMuch.body)).toBe('INSUFFICIENT_STOCK');
    const adjustment = await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId, quantity: '-80', unit: 'g', reason: 'Conteo' },
    });
    expect(adjustment.status).toBe(409);
    const direct = await requestIssue(lab, positionId, '70', lab.adminMember.subject);
    expect(direct.status).toBe(201);
    expect(issueResponse.parse(direct.body)).toMatchObject({ status: 'done', balance: '30' });
    // Lo apartado tampoco admite otra solicitud.
    expect((await requestIssue(lab, positionId, '1')).status).toBe(409);

    // Bandeja del Administrador y «mis solicitudes» del Operador; el contador del Resumen coincide.
    const inbox = issueRequestList.parse((await call(lab.adminMember.subject, `${lab.base}/issue-requests`)).body);
    expect(inbox.canApprove).toBe(true);
    expect(inbox.items).toEqual([
      expect.objectContaining({
        id: requestIdOf(request),
        status: 'pending',
        quantity: '30',
        reason: 'Práctica',
        destination: 'Laboratorio 1',
        container: { code: 'NAC-001' },
        requester: expect.objectContaining({ displayName: 'Operador' }),
        mine: false,
        decider: null,
      }),
    ]);
    const mine = issueRequestList.parse((await call(lab.operator.subject, `${lab.base}/issue-requests`)).body);
    expect(mine.canApprove).toBe(false);
    expect(mine.items.map((item) => ({ id: item.id, mine: item.mine }))).toEqual([{ id: requestIdOf(request), mine: true }]);
    for (const subject of [lab.adminMember.subject, lab.operator.subject]) {
      const summary = reagentsSummary.parse((await call(subject, `${lab.base}/summary`)).body);
      expect(summary.summary.pendingRequests).toBe(1);
    }

    const approved = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${requestIdOf(request)}/approve`, {
      method: 'POST',
    });
    expect(approved.status).toBe(201);
    expect(movementResponse.parse(approved.body)).toMatchObject({ appliedQuantity: '-30', balance: '0' });
    expect(await positionOf(lab, positionId)).toMatchObject({ balance: '0', reserved: '0' });
    const decided = issueRequestList.parse(
      (await call(lab.operator.subject, `${lab.base}/issue-requests?estado=todas`)).body,
    );
    expect(decided.items).toEqual([
      expect.objectContaining({ status: 'approved', decider: { displayName: 'Administradora' } }),
    ]);
    const again = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${requestIdOf(request)}/approve`, {
      method: 'POST',
    });
    expect(again.status).toBe(409);
    expect(errorCode(again.body)).toBe('REQUEST_RESOLVED');
  });

  it('rechazar exige motivo y libera; cancelar es solo de quien pidió; el Operador no aprueba', async () => {
    const { lab, positionId } = await stockedLab();
    const first = requestIdOf(await requestIssue(lab, positionId, '10'));
    const second = requestIdOf(await requestIssue(lab, positionId, '15'));
    expect(await positionOf(lab, positionId)).toMatchObject({ reserved: '25' });

    const operatorApproves = await call(lab.operator.subject, `${lab.base}/issue-requests/${first}/approve`, { method: 'POST' });
    expect(operatorApproves.status).toBe(403);
    const operatorRejects = await call(lab.operator.subject, `${lab.base}/issue-requests/${first}/reject`, {
      method: 'POST',
      body: { reason: 'No' },
    });
    expect(operatorRejects.status).toBe(403);

    const noReason = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${first}/reject`, {
      method: 'POST',
      body: { reason: '  ' },
    });
    expect(noReason.status).toBe(400);
    const rejected = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${first}/reject`, {
      method: 'POST',
      body: { reason: 'La práctica se reprogramó' },
    });
    expect(rejected.status).toBe(200);
    expect(await positionOf(lab, positionId)).toMatchObject({ balance: '100', reserved: '15' });

    const otherOperator = await addMember(admin, lab.workspace.id, { roles: [{ role: 'operator' }] });
    const foreignCancel = await call(otherOperator.subject, `${lab.base}/issue-requests/${second}/cancel`, { method: 'POST' });
    expect(foreignCancel.status).toBe(403);
    // Quien aprueba tampoco cancela por otro: rechaza, con motivo.
    const adminCancel = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${second}/cancel`, { method: 'POST' });
    expect(adminCancel.status).toBe(403);
    const cancelled = await call(lab.operator.subject, `${lab.base}/issue-requests/${second}/cancel`, { method: 'POST' });
    expect(cancelled.status).toBe(200);
    expect(await positionOf(lab, positionId)).toMatchObject({ balance: '100', reserved: '0' });

    const history = issueRequestList.parse((await call(lab.operator.subject, `${lab.base}/issue-requests?estado=todas`)).body);
    expect(
      Object.fromEntries(history.items.map(({ id, status, decisionReason }) => [id, { status, decisionReason }])),
    ).toEqual({
      [first]: { status: 'rejected', decisionReason: 'La práctica se reprogramó' },
      [second]: { status: 'cancelled', decisionReason: null },
    });
    expect(await count('select count(*) as n from inventory.operations where workspace_id = $1 and type = $2', [lab.workspace.id, 'issue'])).toBe(0);
  });

  it('nadie aprueba su propia solicitud, aunque después reciba el rol de Administrador', async () => {
    const { lab, positionId } = await stockedLab();
    const requestId = requestIdOf(await requestIssue(lab, positionId, '10'));
    await admin.query(
      `insert into core.role_assignments (workspace_id, principal_id, role_code) values ($1, $2, 'admin')`,
      [lab.workspace.id, lab.operator.principalId],
    );
    const self = await call(lab.operator.subject, `${lab.base}/issue-requests/${requestId}/approve`, { method: 'POST' });
    expect(self.status).toBe(403);
    expect(await positionOf(lab, positionId)).toMatchObject({ reserved: '10' });
  });

  it('dos solicitudes de 60 g sobre 100 g: una aparta, la otra recibe stock insuficiente', async () => {
    const { lab, positionId } = await stockedLab();
    const results = await Promise.all([requestIssue(lab, positionId, '60'), requestIssue(lab, positionId, '60')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await positionOf(lab, positionId)).toMatchObject({ balance: '100', reserved: '60' });
    expect(await count('select count(*) as n from inventory.allocations where workspace_id = $1', [lab.workspace.id])).toBe(1);
  });

  it('aprobar y cancelar a la vez: gana uno solo y el saldo cuadra con el resultado', async () => {
    const { lab, positionId } = await stockedLab();
    const requestId = requestIdOf(await requestIssue(lab, positionId, '40'));
    const [approve, cancel] = await Promise.all([
      call(lab.adminMember.subject, `${lab.base}/issue-requests/${requestId}/approve`, { method: 'POST' }),
      call(lab.operator.subject, `${lab.base}/issue-requests/${requestId}/cancel`, { method: 'POST' }),
    ]);
    expect(approve.status === 201 ? cancel.status : approve.status).toBe(409);
    expect([approve.status, cancel.status].filter((status) => status !== 409)).toHaveLength(1);
    const loser = approve.status === 409 ? approve : cancel;
    expect(errorCode(loser.body)).toBe('REQUEST_RESOLVED');
    const position = await positionOf(lab, positionId);
    expect(position).toMatchObject(approve.status === 201 ? { balance: '60', reserved: '0' } : { balance: '100', reserved: '0' });
  });

  it('con el módulo en cierre no se piden salidas nuevas, pero las pendientes se resuelven (ADR 0009)', async () => {
    const { lab, positionId } = await stockedLab();
    const requestId = requestIdOf(await requestIssue(lab, positionId, '10'));
    await setModuleStatus(admin, lab.workspace.id, 'reagents', 'draining');
    const fresh = await requestIssue(lab, positionId, '5');
    expect(fresh.status).toBe(403);
    const approved = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${requestId}/approve`, { method: 'POST' });
    expect(approved.status).toBe(201);
    expect(issueRequestList.parse((await call(lab.operator.subject, `${lab.base}/issue-requests?estado=todas`)).body).items).toEqual([
      expect.objectContaining({ status: 'approved' }),
    ]);
  });

  it('una solicitud de B no se ve ni se resuelve desde A, aunque se pertenezca a ambos', async () => {
    const { lab: a } = await stockedLab();
    const { lab: b, positionId: bPosition } = await stockedLab();
    const bRequest = requestIdOf(await requestIssue(b, bPosition, '10'));
    const shared = `sub-shared-${uniqueSuffix()}`;
    await addMember(admin, a.workspace.id, { subject: shared, roles: [{ role: 'admin' }] });
    await addMember(admin, b.workspace.id, { subject: shared, roles: [{ role: 'operator' }] });
    const fromA = await call(shared, `${a.base}/issue-requests/${bRequest}/approve`, { method: 'POST' });
    expect(fromA.status).toBe(404);
    expect(issueRequestList.parse((await call(shared, `${a.base}/issue-requests`)).body).items).toEqual([]);
    expect(await positionOf(b, bPosition)).toMatchObject({ balance: '100', reserved: '10' });
  });

  it('aprobar con la misma clave de idempotencia devuelve el mismo resultado y un solo movimiento', async () => {
    const { lab, positionId } = await stockedLab();
    const requestId = requestIdOf(await requestIssue(lab, positionId, '10'));
    const key = randomUUID();
    const url = `${lab.base}/issue-requests/${requestId}/approve`;
    const first = await call(lab.adminMember.subject, url, { method: 'POST', key });
    const replay = await call(lab.adminMember.subject, url, { method: 'POST', key });
    expect(first.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(await count('select count(*) as n from inventory.operations where workspace_id = $1 and type = $2', [lab.workspace.id, 'issue'])).toBe(1);
  });
});
