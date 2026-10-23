import { beforeAll, describe, expect, it } from 'vitest';
import { closure, closureList, FORM_STANDARD_LAYOUT, formList, formLogo, labsForm, labsSettings, period, periodList, space, spaceList, type FormLayout } from '@platlab/contracts';
import { admin, call, count, errorCode, png, putBinary } from '../../testing/api.js';
import { addLocation, addMember, seedWorkspace, uniqueSuffix } from '../../testing/core-fixtures.js';

/**
 * L-01a (ADR 0023): Espacios, cierres, anticipación y Formatos por HTTP, con el rol de runtime. El
 * Administrador configura; el Operador, el Docente y el tesista consultan (L-01b: el tesista llena formatos).
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
let siglas = 0;
/** Una sigla nueva en cada habilitación: no se repite en el espacio de trabajo. */
const sigla = () => `S${++siglas}`;
const send = (target: LabsLab, method: 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown, subject = target.adminMember.subject, idempotencyKey = key()) =>
  call(subject, `${target.base}${path}`, { method, ...(body === undefined ? {} : { body }), key: idempotencyKey });

const closed = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [] };
const weekdays = { ...closed, '1': [{ opens: '07:00', closes: '13:00' }, { opens: '14:00', closes: '18:00' }], '5': [{ opens: '08:00', closes: '12:00' }] };

async function enable(target: LabsLab, areaId: string, capacity = 20) {
  const created = await send(target, 'POST', '/spaces', { abbreviation: sigla(), areaId, capacity, weeklyHours: weekdays });
  expect(created.status).toBe(201);
  return space.parse(created.body);
}

describe('roles', () => {
  it('el Operador, el Docente y el tesista consultan, pero no configuran', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    for (const member of [lab.operator, lab.teacher, lab.student]) {
      for (const path of ['/settings', '/spaces', '/periods', '/closures?from=2026-01-01&to=2026-12-31', '/forms']) {
        expect((await call(member.subject, `${lab.base}${path}`)).status).toBe(200);
      }
      const denied = [
        await send(lab, 'PUT', '/settings', { leadDays: 3 }, member.subject),
        await send(lab, 'POST', '/spaces', { abbreviation: sigla(), areaId: area, capacity: 10, weeklyHours: weekdays }, member.subject),
        await send(lab, 'POST', '/closures', { startsOn: '2026-12-25', endsOn: '2026-12-25', reason: 'Navidad' }, member.subject),
        await send(lab, 'POST', '/forms', { name: 'Práctica' }, member.subject),
        await send(lab, 'POST', '/periods', { code: 'P9', startsOn: '2030-01-01', endsOn: '2030-02-01' }, member.subject),
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
    const repeated = await send(lab, 'POST', '/spaces', { abbreviation: sigla(), areaId: area, capacity: 5, weeklyHours: closed });
    expect(errorCode(repeated.body)).toBe('VALIDATION_FAILED');

    await send(lab, 'POST', `/spaces/${area}/archive`);
    const reactivated = await send(lab, 'POST', '/spaces', { abbreviation: sigla(), areaId: area, capacity: 5, weeklyHours: closed });
    expect(reactivated.status).toBe(201);
    expect(space.parse(reactivated.body)).toMatchObject({ capacity: 5, weeklyHours: closed, archivedAt: null });
  });

  it('solo un área activa del propio espacio: no un estante, una sede, un área archivada ni otro espacio', async () => {
    const archivedArea = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    await admin.query('update core.locations set archived_at = now() where id = $1', [archivedArea]);
    for (const areaId of [lab.shelf, lab.site, archivedArea, other.room]) {
      const rejected = await send(lab, 'POST', '/spaces', { abbreviation: sigla(), areaId, capacity: 10, weeklyHours: weekdays });
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
      const rejected = await send(lab, 'POST', '/spaces', { abbreviation: sigla(), areaId: area, capacity: 10, weeklyHours });
      expect(rejected.status).toBe(400);
    }
    // Franjas contiguas: una cierra cuando la siguiente abre.
    const contiguous = { ...closed, '2': [{ opens: '08:00', closes: '12:00' }, { opens: '12:00', closes: '23:59' }] };
    expect((await send(lab, 'POST', '/spaces', { abbreviation: sigla(), areaId: area, capacity: 10, weeklyHours: contiguous })).status).toBe(201);
  });

  it('repetir la misma clave no habilita dos veces ni duplica la auditoría', async () => {
    const area = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: lab.site });
    const idempotencyKey = key();
    const body = { abbreviation: sigla(), areaId: area, capacity: 10, weeklyHours: weekdays };
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

describe('sigla', () => {
  it('se guarda en mayúsculas, se cambia con la versión vista y no se repite (CODE_TAKEN)', async () => {
    const target = await createLabsLab();
    const created = await send(target, 'POST', '/spaces', { abbreviation: ' ant ', areaId: target.room, capacity: 10, weeklyHours: weekdays });
    expect(space.parse(created.body).abbreviation).toBe('ANT');
    const taken = await send(target, 'POST', '/spaces', { abbreviation: 'ANT', areaId: target.otherRoom, capacity: 10, weeklyHours: weekdays });
    expect(taken.status).toBe(409);
    expect(errorCode(taken.body)).toBe('CODE_TAKEN');
    const second = await send(target, 'POST', '/spaces', { abbreviation: 'FIS', areaId: target.otherRoom, capacity: 10, weeklyHours: weekdays });
    expect(second.status).toBe(201);
    const renamed = await send(target, 'PATCH', `/spaces/${target.room}`, { abbreviation: 'ANA', expectedVersion: 1 });
    expect(space.parse(renamed.body)).toMatchObject({ abbreviation: 'ANA', version: 2 });
    expect(errorCode((await send(target, 'PATCH', `/spaces/${target.room}`, { abbreviation: 'FIS', expectedVersion: 2 })).body)).toBe('CODE_TAKEN');
    for (const abbreviation of ['A', 'ABCDEF', '1AB', 'AÑO']) {
      expect((await send(target, 'PATCH', `/spaces/${target.room}`, { abbreviation, expectedVersion: 2 })).status).toBe(400);
    }
  });
});

describe('períodos', () => {
  it('se crean, se editan con la versión vista y se archivan; los activos no se solapan ni repiten código', async () => {
    const target = await createLabsLab();
    const created = await send(target, 'POST', '/periods', { code: 'p1', startsOn: '2027-04-01', endsOn: '2027-08-15' });
    expect(created.status).toBe(201);
    const first = period.parse(created.body);
    expect(first).toMatchObject({ code: 'P1', startsOn: '2027-04-01', endsOn: '2027-08-15', version: 1, archivedAt: null });

    const overlap = await send(target, 'POST', '/periods', { code: 'P2', startsOn: '2027-08-15', endsOn: '2027-12-20' });
    expect(errorCode(overlap.body)).toBe('VALIDATION_FAILED');
    const repeated = await send(target, 'POST', '/periods', { code: 'P1', startsOn: '2028-01-01', endsOn: '2028-03-01' });
    expect(errorCode(repeated.body)).toBe('CODE_TAKEN');
    const second = period.parse((await send(target, 'POST', '/periods', { code: 'P2', startsOn: '2027-09-01', endsOn: '2027-12-20' })).body);

    const moved = await send(target, 'PATCH', `/periods/${first.id}`, { endsOn: '2027-08-20', expectedVersion: 1 });
    expect(period.parse(moved.body)).toMatchObject({ endsOn: '2027-08-20', version: 2 });
    expect(errorCode((await send(target, 'PATCH', `/periods/${first.id}`, { endsOn: '2027-09-10', expectedVersion: 2 })).body)).toBe('VALIDATION_FAILED');
    expect(errorCode((await send(target, 'PATCH', `/periods/${first.id}`, { startsOn: '2027-08-21', expectedVersion: 2 })).body)).toBe('VALIDATION_FAILED');
    expect(errorCode((await send(target, 'PATCH', `/periods/${first.id}`, { code: 'P3', expectedVersion: 1 })).body)).toBe('VERSION_CONFLICT');

    const archived = await send(target, 'POST', `/periods/${second.id}/archive`);
    expect(period.parse(archived.body).archivedAt).not.toBeNull();
    expect((await send(target, 'POST', '/periods', { code: 'P2', startsOn: '2027-09-01', endsOn: '2027-12-20' })).status).toBe(201);
    const list = periodList.parse((await call(target.teacher.subject, `${target.base}/periods`)).body);
    expect(list.items.map((item) => [item.code, item.archivedAt === null])).toEqual([['P1', true], ['P2', true], ['P2', false]]);
  });

  it('rechaza fechas al revés, de más de un año y códigos con tildes o espacios', async () => {
    for (const body of [
      { code: 'P1', startsOn: '2027-05-01', endsOn: '2027-04-01' },
      { code: 'P1', startsOn: '2027-01-01', endsOn: '2028-01-02' },
      { code: 'AÑO', startsOn: '2027-01-01', endsOn: '2027-02-01' },
      { code: 'P 1', startsOn: '2027-01-01', endsOn: '2027-02-01' },
    ]) {
      expect((await send(lab, 'POST', '/periods', body)).status).toBe(400);
    }
  });
});

describe('formatos', () => {
  /** Crea un formato desde la plantilla estándar (o duplicando `from`) y devuelve su respuesta. */
  async function createForm(target: LabsLab, name: string, from?: string) {
    const created = await send(target, 'POST', '/forms', { name, ...(from ? { from } : {}) });
    expect(created.status).toBe(201);
    return labsForm.parse(created.body);
  }
  const publish = (target: LabsLab, formId: string, body: Record<string, unknown>) =>
    send(target, 'POST', `/forms/${formId}/revisions`, { title: 'Solicitud', documentCode: null, layout: FORM_STANDARD_LAYOUT, ...body });
  /** La plantilla con una fila más al final de la Sección I. */
  const withRow = (fields: unknown[]) => ({ ...FORM_STANDARD_LAYOUT, rows: [...FORM_STANDARD_LAYOUT.rows, { kind: 'row', fields }] });

  it('uno nuevo parte de la plantilla estándar; cada guardado publica la revisión siguiente y la anterior queda intacta', async () => {
    const target = await createLabsLab();
    const form = await createForm(target, 'Práctica académica');
    expect(form).toMatchObject({ name: 'Práctica académica', version: 1, archivedAt: null, revision: 1, title: 'Práctica académica', documentCode: null });
    expect(form.layout).toEqual(FORM_STANDARD_LAYOUT);

    const layout: FormLayout = {
      ...FORM_STANDARD_LAYOUT,
      resources: [{ kind: 'equipment', label: 'Equipos' }],
      equipmentCode: false,
      signatures: [{ label: 'Cliente', requester: true }],
    };
    const second = await publish(target, form.id, { title: 'Solicitud de práctica', documentCode: 'LAB-FR-01', layout, expectedRevision: 1 });
    expect(second.status).toBe(201);
    expect(labsForm.parse(second.body)).toMatchObject({ revision: 2, title: 'Solicitud de práctica', documentCode: 'LAB-FR-01', layout });
    expect(labsForm.parse((await call(target.teacher.subject, `${target.base}/forms/${form.id}`)).body).revision).toBe(2);
    expect(await count('select count(*) as n from labs.form_revisions where form_id = $1 and revision = 1 and jsonb_array_length(layout -> \'resources\') = 3', [form.id])).toBe(1);

    const stale = await publish(target, form.id, { expectedRevision: 1 });
    expect(stale.status).toBe(409);
    expect(errorCode(stale.body)).toBe('VERSION_CONFLICT');
  });

  it('el membrete lleva un logo subido para el espacio y hasta tres líneas; uno ajeno no se publica', async () => {
    const target = await createLabsLab();
    const form = await createForm(target, 'Con membrete');
    expect((await putBinary(target.operator.subject, `${target.base}/forms/${form.id}/logo`, png)).status).toBe(403);
    expect((await putBinary(target.adminMember.subject, `${target.base}/forms/${form.id}/logo`, Buffer.from('no es imagen'))).status).toBe(400);
    const uploaded = await putBinary(target.adminMember.subject, `${target.base}/forms/${form.id}/logo`, png);
    expect(uploaded.status).toBe(200);
    const { url } = formLogo.parse(uploaded.body);
    expect(url).toMatch(new RegExp(`/${target.workspace.id}/labs/logos/[0-9a-f-]{36}\\.png$`));
    const header = { logoUrl: url, lines: ['Universidad Demo', 'Facultad de Ciencias'] };
    const published = await publish(target, form.id, { layout: { ...FORM_STANDARD_LAYOUT, header }, expectedRevision: 1 });
    expect(published.status).toBe(201);
    expect(labsForm.parse(published.body).layout.header).toEqual(header);
    // El logo de otro espacio, o de afuera, no entra en la hoja.
    const foreign = url.replace(target.workspace.id, other.workspace.id);
    for (const logoUrl of [foreign, 'https://example.com/logo.png']) {
      const rejected = await publish(target, form.id, { layout: { ...FORM_STANDARD_LAYOUT, header: { logoUrl, lines: [] } }, expectedRevision: 2 });
      expect(rejected.status).toBe(400);
    }
  });

  it('dos publicaciones a la vez sobre la misma revisión: solo una gana', async () => {
    const target = await createLabsLab();
    const form = await createForm(target, 'Práctica');
    const results = await Promise.all([publish(target, form.id, { title: 'Una', expectedRevision: 1 }), publish(target, form.id, { title: 'Otra', expectedRevision: 1 })]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await count('select count(*) as n from labs.form_revisions where form_id = $1', [form.id])).toBe(2);
  });

  it('duplicar copia la última revisión de otro formato del espacio, y no uno de otro espacio', async () => {
    const target = await createLabsLab();
    const source = await createForm(target, 'Práctica académica');
    const layout = withRow([{ key: 'empresa', label: 'Empresa', type: 'text', required: true }]);
    expect((await publish(target, source.id, { title: 'Solicitud de servicio', documentCode: 'LAB-FR-02', layout, expectedRevision: 1 })).status).toBe(201);

    const copy = await createForm(target, 'Servicio externo', source.id);
    expect(copy).toMatchObject({ name: 'Servicio externo', revision: 1, title: 'Solicitud de servicio', documentCode: 'LAB-FR-02', layout });
    expect(copy.id).not.toBe(source.id);

    const foreign = await send(other, 'POST', '/forms', { name: 'Ajeno', from: source.id });
    expect(foreign.status).toBe(404);
    expect((await call(other.adminMember.subject, `${other.base}/forms/${source.id}`)).status).toBe(404);
  });

  it('el nombre activo no se repite; se renombra con la versión vista y archivar lo saca de quien llena', async () => {
    const target = await createLabsLab();
    const form = await createForm(target, 'Práctica académica');
    const repeated = await send(target, 'POST', '/forms', { name: ' práctica ACADEMICA ' });
    expect(repeated.status).toBe(409);
    expect(errorCode(repeated.body)).toBe('NAME_TAKEN');

    const renamed = await send(target, 'PATCH', `/forms/${form.id}`, { name: 'Prácticas', expectedVersion: 1 });
    expect(labsForm.parse(renamed.body)).toMatchObject({ name: 'Prácticas', version: 2, revision: 1 });
    const stale = await send(target, 'PATCH', `/forms/${form.id}`, { name: 'Otra', expectedVersion: 1 });
    expect(errorCode(stale.body)).toBe('VERSION_CONFLICT');
    const second = await createForm(target, 'Servicio externo');
    const taken = await send(target, 'PATCH', `/forms/${second.id}`, { name: 'prácticas', expectedVersion: 1 });
    expect(errorCode(taken.body)).toBe('NAME_TAKEN');

    const archived = await send(target, 'POST', `/forms/${form.id}/archive`);
    expect(labsForm.parse(archived.body).archivedAt).not.toBeNull();
    const teacherList = formList.parse((await call(target.teacher.subject, `${target.base}/forms`)).body);
    expect(teacherList.items.map((item) => item.id)).toEqual([second.id]);
    expect((await call(target.teacher.subject, `${target.base}/forms/${form.id}`)).status).toBe(404);
    const adminList = formList.parse((await call(target.adminMember.subject, `${target.base}/forms`)).body);
    expect(adminList.items.map((item) => item.id)).toEqual([second.id, form.id]);

    for (const response of [
      await publish(target, form.id, { expectedRevision: 1 }),
      await send(target, 'PATCH', `/forms/${form.id}`, { name: 'Otra', expectedVersion: 3 }),
      await send(target, 'POST', `/forms/${form.id}/archive`),
    ]) {
      expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
    }
    expect((await createForm(target, 'Prácticas')).name).toBe('Prácticas');
  });

  it('rechaza una hoja sin esenciales, filas de más de 3 datos, claves del sistema en un dato libre y dos firmas del solicitante', async () => {
    const target = await createLabsLab();
    const form = await createForm(target, 'Práctica');
    const withoutTitle: FormLayout = {
      ...FORM_STANDARD_LAYOUT,
      rows: FORM_STANDARD_LAYOUT.rows.filter((row) => !(row.kind === 'row' && row.fields.some((field) => field.key === 'titulo'))),
    };
    const text = (key: string) => ({ key, label: key, type: 'text', required: false });
    const invalid = [
      withoutTitle,
      withRow([text('a'), text('b'), text('c'), text('d')]),
      withRow([]),
      withRow([{ key: 'grupos', label: 'Grupos', type: 'number', required: false }]),
      withRow([{ key: 'docente', label: 'Otra vez' }]),
      withRow([{ key: 'tipo_practica', label: 'Tipo', type: 'list', required: true }]),
      { ...FORM_STANDARD_LAYOUT, resources: [] },
      { ...FORM_STANDARD_LAYOUT, signatures: [{ label: 'Docente', requester: true }, { label: 'Cliente', requester: true }] },
    ];
    for (const layout of invalid) {
      const rejected = await publish(target, form.id, { layout, expectedRevision: 1 });
      expect(rejected.status).toBe(400);
    }
    expect(await count('select count(*) as n from labs.form_revisions where form_id = $1', [form.id])).toBe(1);
  });
});
