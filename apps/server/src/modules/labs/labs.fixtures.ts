import { expect } from 'vitest';
import { labsForm, labsRequest, type LabsRequest, type SaveRequest } from '@platlab/contracts';
import { addDays, todayIn } from '../../platform/dates.js';
import { admin, call } from '../../testing/api.js';
import { addLocation, addMember, seedWorkspace, uniqueSuffix } from '../../testing/core-fixtures.js';

/** Fixtures de Solicitudes y Cronograma (L-01b, L-01c): espacio con período, formato estándar, stock y equipos reales. */

const today = todayIn('America/Guayaquil');
export const inDays = (days: number) => addDays(today, days);

/** Espacio con los tres módulos, un período que cubre los próximos meses, un formato estándar y stock real. */
export async function createRequestsLab(modules = ['labs', 'reagents', 'equipment']) {
  const workspace = await seedWorkspace(admin, { modules });
  const site = await addLocation(admin, workspace.id, { kind: 'site' });
  const storage = await addLocation(admin, workspace.id, { kind: 'storage', parentId: site });
  const lab = {
    workspace,
    base: `/workspaces/${workspace.id}/labs`,
    site,
    storage,
    adminMember: await addMember(admin, workspace.id, { roles: [{ role: 'admin' }], displayName: 'Administradora' }),
    operator: await addMember(admin, workspace.id, { roles: [{ role: 'operator' }], displayName: 'Operador' }),
    teacher: await addMember(admin, workspace.id, { roles: [{ role: 'teacher' }], displayName: 'Docente Uno' }),
    otherTeacher: await addMember(admin, workspace.id, { roles: [{ role: 'teacher' }], displayName: 'Docente Dos' }),
    student: await addMember(admin, workspace.id, { roles: [{ role: 'student' }], displayName: 'Tesista' }),
  };
  const period = await send(lab, 'POST', '/periods', { code: 'P1', startsOn: inDays(-2), endsOn: inDays(150) });
  expect(period.status).toBe(201);
  const form = await send(lab, 'POST', '/forms', { name: 'Práctica académica' });
  expect(form.status).toBe(201);
  return { ...lab, form: labsForm.parse(form.body) };
}
export type RequestsLab = Awaited<ReturnType<typeof createRequestsLab>>;

export const send = (target: { base: string; adminMember: { subject: string } }, method: 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown, subject = target.adminMember.subject) =>
  call(subject, `${target.base}${path}`, { method, ...(body === undefined ? {} : { body }), key: `req-${uniqueSuffix()}` });

/** 100 g de un reactivo recibido por Reactivos. */
export async function stockedReagent(lab: RequestsLab) {
  const reagents = `/workspaces/${lab.workspace.id}/reagents`;
  const product = await call(lab.adminMember.subject, `${reagents}/products`, {
    method: 'POST',
    body: { name: `Cloruro ${uniqueSuffix()}`, baseUnit: 'g', casNumber: '7647-14-5', physicalState: 'solid' },
  });
  expect(product.status).toBe(201);
  const productId = (product.body as { id: string }).id;
  const received = await call(lab.operator.subject, `${reagents}/receipts`, {
    method: 'POST',
    body: { productId, locationId: lab.storage, quantity: '100', unit: 'g', codes: [`F-${uniqueSuffix()}`] },
    key: `rec-${uniqueSuffix()}`,
  });
  expect(received.status).toBe(201);
  return productId;
}

/** Un tipo de equipo con un equipo operativo y otro con falla. */
export async function equipmentType(lab: RequestsLab) {
  const type = await admin.query<{ id: string }>(`insert into equipment.asset_types (workspace_id, name) values ($1, $2) returning id`, [
    lab.workspace.id,
    `Balanza ${uniqueSuffix()}`,
  ]);
  const typeId = type.rows[0]!.id;
  for (const condition of ['operational', 'faulted']) {
    await admin.query(
      `insert into equipment.assets (workspace_id, type_id, code, name, location_id, condition, created_by_principal_id)
       values ($1, $2, $3, 'Balanza', $4, $5, $6)`,
      [lab.workspace.id, typeId, `EQ-${uniqueSuffix()}`, lab.storage, condition, lab.adminMember.principalId],
    );
  }
  return typeId;
}

export async function draft(lab: RequestsLab, subject = lab.teacher.subject): Promise<LabsRequest> {
  const created = await send(lab, 'POST', '/requests', { formId: lab.form.id }, subject);
  expect(created.status).toBe(201);
  return labsRequest.parse(created.body);
}

/** Lo esencial y los datos del sistema de la plantilla estándar, para una fecha. */
export const complete = (request: LabsRequest, dates: string[], extra: Partial<SaveRequest> = {}): SaveRequest => ({
  expectedVersion: request.version,
  title: 'Titulación ácido-base',
  teacherName: request.teacherName,
  activityType: 'practice',
  subject: 'Química General',
  career: 'Bioquímica',
  dates,
  startsAt: '08:00',
  endsAt: '10:00',
  participants: 24,
  groups: 6,
  areaId: null,
  answers: { practica_n: 3 },
  notes: null,
  lines: [],
  ...extra,
});

export async function save(lab: RequestsLab, request: LabsRequest, body: SaveRequest, subject = lab.teacher.subject) {
  const saved = await send(lab, 'PUT', `/requests/${request.id}`, body, subject);
  expect(saved.status).toBe(200);
  return labsRequest.parse(saved.body);
}

export async function submitted(lab: RequestsLab, dates = [inDays(30)], subject = lab.teacher.subject) {
  const request = await draft(lab, subject);
  const saved = await save(lab, request, complete(request, dates), subject);
  const sent = await send(lab, 'POST', `/requests/${request.id}/submit`, { expectedVersion: saved.version }, subject);
  expect(sent.status).toBe(200);
  return labsRequest.parse(sent.body);
}

