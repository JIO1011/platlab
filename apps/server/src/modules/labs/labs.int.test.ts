import { beforeAll, describe, expect, it } from 'vitest';
import { closure, closureList, labsForm, labsSettings, space, spaceList } from '@platlab/contracts';
import { admin, call, count, errorCode } from '../../testing/api.js';
import { addLocation, addMember, seedWorkspace, uniqueSuffix } from '../../testing/core-fixtures.js';

/**
 * L-01a (ADR 0023): Espacios, cierres, anticipación y Formato por HTTP, con el rol de runtime. El
 * Administrador configura; el Operador y el Docente consultan; el Estudiante no entra.
 */

/** Espacio con Laboratorios, una sede con dos áreas (una con un estante) y sus cuatro roles. */
async function createLabsLab() {
  const workspace = await seedWorkspace(admin, { modules: ['labs'] });
  const site = await addLocation(admin, workspace.id, { kind: 'site' });
  const room = await addLocation(admin, workspace.id, { kind: 'room', parentId: site });
  const shelf = await addLocation(admin, workspace.id, { kind: 'storage', parentId: room });
  const otherRoom = await addLocation(admin, workspace.id, { kind: 'room', parentId: site });
  return {
    workspace,
    base: `/workspaces/${workspace.id}/labs`,
    site,
    room,
    shelf,
    otherRoom,
    adminMember: await addMember(admin, workspace.id, { roles: [{ role: 'admin' }], displayName: 'Administradora' }),
    operator: await addMember(admin, workspace.id, { roles: [{ role: 'operator' }], displayName: 'Operador' }),
    teacher: await addMember(admin, workspace.id, { roles: [{ role: 'teacher' }], displayName: 'Docente' }),
    student: await addMember(admin, workspace.id, { roles: [{ role: 'student' }], displayName: 'Estudiante' }),
  };
}
type LabsLab = Awaited<ReturnType<typeof createLabsLab>>;

let lab: LabsLab;
let other: LabsLab;

beforeAll(async () => {
  lab = await createLabsLab();
  other = await createLabsLab();
});

const key = () => `labs-${uniqueSuffix()}`;
const send = (target: LabsLab, method: 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown, subject = target.adminMember.subject, idempotencyKey = key()) =>
  call(subject, `${target.base}${path}`, { method, ...(body === undefined ? {} : { body }), key: idempotencyKey });

/** Membrete mínimo de un formato: sin código y con los nombres por defecto. */
const header = { documentCode: null, subjectLabel: 'Asignatura', unitLabel: 'Carrera' };
const closed = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [] };
const weekdays = { ...closed, '1': [{ opens: '07:00', closes: '13:00' }, { opens: '14:00', closes: '18:00' }], '5': [{ opens: '08:00', closes: '12:00' }] };

async function enable(target: LabsLab, areaId: string, capacity = 20) {
  const created = await send(target, 'POST', '/spaces', { areaId, capacity, weeklyHours: weekdays });
  expect(created.status).toBe(201);
  return space.parse(created.body);
}

describe('roles', () => {
  it('el Estudiante no entra a Laboratorios', async () => {
    for (const path of ['/settings', '/spaces', '/closures?from=2026-01-01&to=2026-12-31', '/form']) {
      const response = await call(lab.student.subject, `${lab.base}${path}`);
      expect(response.status).toBe(403);
      expect(errorCode(response.body)).toBe('ACCESS_DENIED');
    }
  });

  it('el Operador y el Docente consultan, pero no configuran', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    for (const member of [lab.operator, lab.teacher]) {
      for (const path of ['/settings', '/spaces', '/closures?from=2026-01-01&to=2026-12-31', '/form']) {
        expect((await call(member.subject, `${lab.base}${path}`)).status).toBe(200);
      }
      const denied = [
        await send(lab, 'PUT', '/settings', { leadDays: 3 }, member.subject),
        await send(lab, 'POST', '/spaces', { areaId: area, capacity: 10, weeklyHours: weekdays }, member.subject),
        await send(lab, 'POST', '/closures', { startsOn: '2026-12-25', endsOn: '2026-12-25', reason: 'Navidad' }, member.subject),
        await send(lab, 'POST', '/form', { ...header, title: 'Solicitud', fields: [], expectedVersion: 0 }, member.subject),
      ];
      for (const response of denied) {
        expect(response.status).toBe(403);
        expect(errorCode(response.body)).toBe('ACCESS_DENIED');
      }
    }
  });
});

describe('anticipación', () => {
  it('sin ajustes son 7 días; acepta de 0 a 90 y sube la versión', async () => {
    const target = await createLabsLab();
    expect(labsSettings.parse((await call(target.operator.subject, `${target.base}/settings`)).body)).toEqual({ leadDays: 7, version: 0 });
    for (const leadDays of [0, 90]) {
      expect((await send(target, 'PUT', '/settings', { leadDays })).status).toBe(200);
    }
    expect(labsSettings.parse((await call(target.operator.subject, `${target.base}/settings`)).body)).toEqual({ leadDays: 90, version: 2 });
    for (const leadDays of [-1, 91, 2.5]) {
      const rejected = await send(target, 'PUT', '/settings', { leadDays });
      expect(rejected.status).toBe(400);
    }
  });
});

describe('espacios', () => {
  it('habilita un área con aforo y horario, la edita con su versión y la archiva', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    const created = await enable(lab, area, 24);
    expect(created).toMatchObject({ areaId: area, capacity: 24, version: 1, archivedAt: null, areaArchived: false });
    expect(created.groupName).not.toBeNull();

    const updated = await send(lab, 'PATCH', `/spaces/${area}`, { capacity: 30, expectedVersion: 1 });
    expect(updated.status).toBe(200);
    expect(space.parse(updated.body)).toMatchObject({ capacity: 30, version: 2, weeklyHours: weekdays });

    const stale = await send(lab, 'PATCH', `/spaces/${area}`, { capacity: 12, expectedVersion: 1 });
    expect(stale.status).toBe(409);
    expect(errorCode(stale.body)).toBe('VERSION_CONFLICT');

    const archived = await send(lab, 'POST', `/spaces/${area}/archive`);
    expect(space.parse(archived.body).archivedAt).not.toBeNull();
    const editArchived = await send(lab, 'PATCH', `/spaces/${area}`, { capacity: 12, expectedVersion: 3 });
    expect(errorCode(editArchived.body)).toBe('VALIDATION_FAILED');
  });

  it('una habilitada responde que ya lo está; una archivada se reactiva con los datos nuevos', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    await enable(lab, area);
    const repeated = await send(lab, 'POST', '/spaces', { areaId: area, capacity: 5, weeklyHours: closed });
    expect(errorCode(repeated.body)).toBe('VALIDATION_FAILED');

    await send(lab, 'POST', `/spaces/${area}/archive`);
    const reactivated = await send(lab, 'POST', '/spaces', { areaId: area, capacity: 5, weeklyHours: closed });
    expect(reactivated.status).toBe(201);
    expect(space.parse(reactivated.body)).toMatchObject({ capacity: 5, weeklyHours: closed, archivedAt: null });
  });

  it('solo un área activa del propio espacio: no un estante, una sede, un área archivada ni otro espacio', async () => {
    const archivedArea = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    await admin.query('update core.locations set archived_at = now() where id = $1', [archivedArea]);
    for (const areaId of [lab.shelf, lab.site, archivedArea, other.room]) {
      const rejected = await send(lab, 'POST', '/spaces', { areaId, capacity: 10, weeklyHours: weekdays });
      expect(rejected.status).toBe(400);
      expect(errorCode(rejected.body)).toBe('VALIDATION_FAILED');
    }
    expect(await count('select count(*) as n from labs.spaces where area_id = any($1)', [[lab.shelf, lab.site, archivedArea, other.room]])).toBe(0);
  });

  it('el horario va ordenado, sin solapes, con horas válidas y los siete días', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    const invalid = [
      { ...closed, '1': [{ opens: '10:00', closes: '12:00' }, { opens: '11:00', closes: '13:00' }] },
      { ...closed, '1': [{ opens: '14:00', closes: '16:00' }, { opens: '08:00', closes: '10:00' }] },
      { ...closed, '1': [{ opens: '12:00', closes: '12:00' }] },
      { ...closed, '1': [{ opens: '08:00', closes: '24:00' }] },
      { ...closed, '1': [{ opens: '8:00', closes: '10:00' }] },
      { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] },
    ];
    for (const weeklyHours of invalid) {
      const rejected = await send(lab, 'POST', '/spaces', { areaId: area, capacity: 10, weeklyHours });
      expect(rejected.status).toBe(400);
    }
    // Franjas contiguas: una cierra cuando la siguiente abre.
    const contiguous = { ...closed, '2': [{ opens: '08:00', closes: '12:00' }, { opens: '12:00', closes: '23:59' }] };
    expect((await send(lab, 'POST', '/spaces', { areaId: area, capacity: 10, weeklyHours: contiguous })).status).toBe(201);
  });

  it('repetir la misma clave no habilita dos veces ni duplica la auditoría', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    const idempotencyKey = key();
    const body = { areaId: area, capacity: 10, weeklyHours: weekdays };
    const first = await send(lab, 'POST', '/spaces', body, lab.adminMember.subject, idempotencyKey);
    const second = await send(lab, 'POST', '/spaces', body, lab.adminMember.subject, idempotencyKey);
    expect(first.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(await count("select count(*) as n from core.audit_events where entity_id = $1 and action = 'labs.space.create'", [area])).toBe(1);
  });

  it('no lista los espacios de otro espacio de trabajo', async () => {
    const mine = await enable(other, other.otherRoom);
    const listed = spaceList.parse((await call(lab.operator.subject, `${lab.base}/spaces`)).body);
    expect(listed.items.map((item) => item.areaId)).not.toContain(mine.areaId);
  });
});

describe('cierres', () => {
  it('feriado común sin área y cierre de un espacio; anular lo saca de la lista', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    await enable(lab, area);
    const holiday = closure.parse((await send(lab, 'POST', '/closures', { startsOn: '2027-01-01', endsOn: '2027-01-01', reason: 'Año nuevo' })).body);
    expect(holiday).toMatchObject({ areaId: null, areaName: null });
    const own = closure.parse(
      (await send(lab, 'POST', '/closures', { areaId: area, startsOn: '2027-01-04', endsOn: '2027-01-06', reason: 'Fumigación' })).body,
    );
    expect(own.areaId).toBe(area);

    const range = '/closures?from=2027-01-01&to=2027-01-31';
    const ids = async (path: string) => closureList.parse((await call(lab.teacher.subject, `${lab.base}${path}`)).body).items.map((item) => item.id);
    expect(await ids(range)).toEqual(expect.arrayContaining([holiday.id, own.id]));
    // Un rango que solo toca el último día del cierre también lo trae.
    expect(await ids('/closures?from=2027-01-06&to=2027-01-10')).toContain(own.id);
    expect(await ids('/closures?from=2027-01-07&to=2027-01-10')).not.toContain(own.id);

    const voided = await send(lab, 'POST', `/closures/${own.id}/void`);
    expect(closure.parse(voided.body).voidedAt).not.toBeNull();
    expect(await ids(range)).not.toContain(own.id);
    expect(await ids(`${range}&includeVoided=true`)).toContain(own.id);

    const again = await send(lab, 'POST', `/closures/${own.id}/void`);
    expect(errorCode(again.body)).toBe('VALIDATION_FAILED');
  });

  it('un cierre de espacio exige uno habilitado; las fechas van en orden y el motivo es obligatorio', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    const notEnabled = await send(lab, 'POST', '/closures', { areaId: area, startsOn: '2027-02-01', endsOn: '2027-02-01', reason: 'Pintura' });
    expect(errorCode(notEnabled.body)).toBe('VALIDATION_FAILED');

    await enable(lab, area);
    await send(lab, 'POST', `/spaces/${area}/archive`);
    const archived = await send(lab, 'POST', '/closures', { areaId: area, startsOn: '2027-02-01', endsOn: '2027-02-01', reason: 'Pintura' });
    expect(errorCode(archived.body)).toBe('VALIDATION_FAILED');

    for (const body of [
      { startsOn: '2027-02-03', endsOn: '2027-02-01', reason: 'Al revés' },
      { startsOn: '2027-02-01', endsOn: '2027-02-01', reason: '   ' },
      { startsOn: '2027-02-01', endsOn: '2027-02-01', reason: 'x'.repeat(201) },
    ]) {
      expect((await send(lab, 'POST', '/closures', body)).status).toBe(400);
    }
    expect((await call(lab.operator.subject, `${lab.base}/closures?from=2027-02-03&to=2027-02-01`)).status).toBe(400);
  });

  it('no se anula un cierre de otro espacio de trabajo', async () => {
    const foreign = closure.parse((await send(other, 'POST', '/closures', { startsOn: '2027-03-01', endsOn: '2027-03-01', reason: 'Feriado' })).body);
    const response = await send(lab, 'POST', `/closures/${foreign.id}/void`);
    expect(response.status).toBe(404);
  });
});

describe('formato', () => {
  const fields = [
    { key: 'asignatura', label: 'Asignatura', type: 'text', required: true },
    { key: 'tipo', label: 'Tipo de práctica', type: 'list', required: true, options: ['Docencia', 'Tesis'] },
  ];

  it('sin publicar es la versión 0; cada guardado publica la siguiente y la anterior queda intacta', async () => {
    const target = await createLabsLab();
    expect(labsForm.parse((await call(target.teacher.subject, `${target.base}/form`)).body)).toMatchObject({
      version: 0,
      title: null,
      documentCode: null,
      subjectLabel: 'Asignatura',
      unitLabel: 'Carrera',
      fields: [],
    });

    const first = await send(target, 'POST', '/form', {
      ...header,
      title: 'Solicitud',
      documentCode: 'LAB-FR-01',
      subjectLabel: 'Proyecto',
      unitLabel: 'Cliente',
      fields,
      expectedVersion: 0,
    });
    expect(first.status).toBe(201);
    expect(labsForm.parse(first.body)).toMatchObject({
      version: 1,
      title: 'Solicitud',
      documentCode: 'LAB-FR-01',
      subjectLabel: 'Proyecto',
      unitLabel: 'Cliente',
      fields,
    });

    const second = await send(target, 'POST', '/form', { ...header, title: 'Solicitud de práctica', fields: fields.slice(0, 1), expectedVersion: 1 });
    expect(labsForm.parse(second.body).version).toBe(2);
    expect(labsForm.parse((await call(target.teacher.subject, `${target.base}/form`)).body).version).toBe(2);
    expect(await count('select count(*) as n from labs.form_versions where workspace_id = $1 and version = 1 and jsonb_array_length(fields) = 2', [target.workspace.id])).toBe(1);

    const stale = await send(target, 'POST', '/form', { ...header, title: 'Tarde', fields, expectedVersion: 1 });
    expect(stale.status).toBe(409);
    expect(errorCode(stale.body)).toBe('VERSION_CONFLICT');
  });

  it('dos publicaciones a la vez sobre la misma versión: solo una gana', async () => {
    const target = await createLabsLab();
    const results = await Promise.all([
      send(target, 'POST', '/form', { ...header, title: 'Una', fields, expectedVersion: 0 }),
      send(target, 'POST', '/form', { ...header, title: 'Otra', fields, expectedVersion: 0 }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await count('select count(*) as n from labs.form_versions where workspace_id = $1', [target.workspace.id])).toBe(1);
  });

  it('rechaza listas sin opciones, opciones fuera de una lista, claves repetidas y más de 30 campos', async () => {
    const field = (index: number) => ({ key: `campo_${index}`, label: `Campo ${index}`, type: 'text', required: false });
    const invalid = [
      [{ key: 'tipo', label: 'Tipo', type: 'list', required: true }],
      [{ key: 'tipo', label: 'Tipo', type: 'list', required: true, options: [] }],
      [{ key: 'tipo', label: 'Tipo', type: 'list', required: true, options: ['A', 'A'] }],
      [{ ...field(1), options: ['A'] }],
      [field(1), { ...field(2), key: 'campo_1' }],
      [{ ...field(1), key: 'Campo 1' }],
      [{ ...field(1), type: 'file' }],
      Array.from({ length: 31 }, (_, index) => field(index)),
    ];
    for (const value of invalid) {
      const rejected = await send(lab, 'POST', '/form', { ...header, title: 'Solicitud', fields: value, expectedVersion: 0 });
      expect(rejected.status).toBe(400);
    }
    const blankLabel = await send(lab, 'POST', '/form', { ...header, title: 'Solicitud', subjectLabel: ' ', fields: [], expectedVersion: 0 });
    expect(blankLabel.status).toBe(400);
    const thirty = await send(other, 'POST', '/form', { ...header, title: 'Solicitud', fields: Array.from({ length: 30 }, (_, index) => field(index)), expectedVersion: 0 });
    expect(thirty.status).toBe(201);
  });
});
