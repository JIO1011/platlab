import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  archivedLocations,
  areasOverview,
  asset as assetContract,
  assetType,
  department,
  departmentList,
  location,
  product as productContract,
  receiptResponse,
} from '@platlab/contracts';
import { admin, call, count, errorCode } from '../../testing/api.js';
import { addLocation, addMember, seedWorkspace, setModuleStatus, uniqueSuffix } from '../../testing/core-fixtures.js';

/**
 * C-01a (ADR 0024): áreas y departamentos del Núcleo por HTTP, con el rol de runtime. Sin permisos propios:
 * los admite el módulo que los declara; archivar exige que nada quede dentro, también con un ingreso en curso.
 */

/** Espacio con sus módulos, una sede con un área (sala) y un estante, y Administrador, Operador y Docente. */
async function createOrgLab(modules = ['reagents', 'equipment']) {
  const workspace = await seedWorkspace(admin, { modules });
  const site = await addLocation(admin, workspace.id, { kind: 'site' });
  const room = await addLocation(admin, workspace.id, { kind: 'room', parentId: site });
  const shelf = await addLocation(admin, workspace.id, { kind: 'storage', parentId: room });
  return {
    workspace,
    base: `/workspaces/${workspace.id}`,
    site,
    room,
    shelf,
    adminMember: await addMember(admin, workspace.id, { roles: [{ role: 'admin' }], displayName: 'Administradora' }),
    operator: await addMember(admin, workspace.id, { roles: [{ role: 'operator' }], displayName: 'Operador' }),
    teacher: await addMember(admin, workspace.id, { roles: [{ role: 'teacher' }], displayName: 'Docente' }),
  };
}
type OrgLab = Awaited<ReturnType<typeof createOrgLab>>;

const post = (lab: OrgLab, path: string, body?: unknown, subject = lab.adminMember.subject, key?: string) =>
  call(subject, `${lab.base}${path}`, { method: 'POST', ...(body === undefined ? {} : { body }), ...(key ? { key } : {}) });

async function createDepartment(lab: OrgLab, name: string) {
  const created = await post(lab, '/departments', { name });
  expect(created.status).toBe(201);
  return department.parse(created.body);
}

async function createLocation(lab: OrgLab, name: string, parentId: string | null) {
  const created = await post(lab, '/locations', { name, parentId });
  expect(created.status).toBe(201);
  return location.parse(created.body).id;
}

async function createProduct(lab: OrgLab) {
  const created = await post(lab, '/reagents/products', {
    name: `Reactivo ${uniqueSuffix()}`,
    baseUnit: 'g',
    casNumber: '7647-14-5',
    physicalState: 'solid',
  });
  expect(created.status).toBe(201);
  return productContract.parse(created.body).id;
}

const receive = (lab: OrgLab, productId: string, locationId: string, extra: Record<string, unknown> = {}) =>
  post(lab, '/reagents/receipts', { productId, locationId, quantity: '5', unit: 'g', codes: [`F-${uniqueSuffix()}`], ...extra });

async function createAsset(lab: OrgLab, locationId: string, extra: Record<string, unknown> = {}) {
  const type = await post(lab, '/equipment/asset-types', { name: `Centrífuga ${uniqueSuffix()}` });
  expect(type.status).toBe(201);
  return post(lab, '/equipment/assets', { name: 'Centrífuga', typeId: assetType.parse(type.body).id, locationId, ...extra });
}

const overview = async (lab: OrgLab, subject = lab.operator.subject) => {
  const response = await call(subject, `${lab.base}/areas`);
  expect(response.status).toBe(200);
  return areasOverview.parse(response.body);
};

/** Existencias en ubicaciones archivadas del espacio: siempre cero (ADR 0024). */
const stockInArchived = (workspaceId: string) =>
  count(
    `select count(*) as n from inventory.positions as p
       join core.locations as l on l.workspace_id = p.workspace_id and l.id = p.location_id
      where p.workspace_id = $1 and p.balance > 0 and l.archived_at is not null`,
    [workspaceId],
  );

async function waitForRuntimeLock(waiting: number): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const { rows } = await admin.query<{ n: string }>(
      `select count(*) as n from pg_stat_activity where wait_event_type = 'Lock' and usename = 'platlab_api'`,
    );
    if (Number(rows[0]!.n) >= waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('El runtime no quedó esperando el bloqueo');
}

describe('C-01a · permisos y admisión (ADR 0024)', () => {
  it('el Administrador edita, el Operador consulta y el Docente recibe la denegación', async () => {
    const lab = await createOrgLab();
    const chemistry = await createDepartment(lab, 'Química');
    const renamed = await call(lab.adminMember.subject, `${lab.base}/departments/${chemistry.id}`, { method: 'PATCH', body: { name: 'Química general' } });
    expect(department.parse(renamed.body)).toEqual({ id: chemistry.id, name: 'Química general' });
    const shelf = await createLocation(lab, 'Estante B', lab.room);
    expect((await call(lab.adminMember.subject, `${lab.base}/locations/${shelf}`, { method: 'PATCH', body: { name: 'Estante C' } })).status).toBe(200);
    expect(
      await count(
        `select count(*) as n from core.audit_events where workspace_id = $1
            and action in ('core.department.create', 'core.department.rename', 'core.location.create', 'core.location.rename')`,
        [lab.workspace.id],
      ),
    ).toBe(4);
    expect((await overview(lab, lab.adminMember.subject)).canManage).toBe(true);

    const seen = await overview(lab);
    expect(seen.canManage).toBe(false);
    expect(seen.departments.map((item) => item.name)).toEqual(['Química general']);
    expect(seen.areas.find((area) => area.id === lab.room)?.shelves.map((item) => item.name)).toContain('Estante C');
    expect(departmentList.parse((await call(lab.operator.subject, `${lab.base}/departments`)).body).items).toEqual([
      { id: chemistry.id, name: 'Química general' },
    ]);
    for (const denied of [
      await post(lab, '/departments', { name: 'Física' }, lab.operator.subject),
      await post(lab, '/locations', { name: 'Del Operador', parentId: lab.room }, lab.operator.subject),
      await post(lab, `/locations/${shelf}/archive`, undefined, lab.operator.subject),
      await call(lab.operator.subject, `${lab.base}/areas/${lab.room}/manager`, { method: 'PUT', body: { managerId: null } }),
      await call(lab.teacher.subject, `${lab.base}/areas`),
      await call(lab.teacher.subject, `${lab.base}/departments`),
    ]) {
      expect(denied.status).toBe(403);
      expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    }
  });

  it('un módulo suspendido no otorga: sin otro módulo se deniega; con otro en solo lectura, solo se consulta', async () => {
    const only = await createOrgLab(['reagents']);
    await setModuleStatus(admin, only.workspace.id, 'reagents', 'disabled');
    for (const denied of [await call(only.adminMember.subject, `${only.base}/departments`), await post(only, '/departments', { name: 'Física' })]) {
      expect(denied.status).toBe(403);
      expect(errorCode(denied.body)).toBe('MODULE_UNAVAILABLE');
    }

    const both = await createOrgLab();
    await setModuleStatus(admin, both.workspace.id, 'reagents', 'disabled');
    await setModuleStatus(admin, both.workspace.id, 'equipment', 'read_only');
    expect((await call(both.operator.subject, `${both.base}/departments`)).status).toBe(200);
    const view = await overview(both, both.adminMember.subject);
    // Solo cuenta lo de los módulos que admiten la consulta, y nadie puede cambiar nada.
    expect(view.canManage).toBe(false);
    expect(Object.keys(view.areas.find((area) => area.id === both.room)?.counts ?? {})).toEqual(['equipment']);
    const write = await post(both, '/departments', { name: 'Física' });
    expect(write.status).toBe(403);
    expect(errorCode(write.body)).toBe('MODULE_READ_ONLY');
  });
});

describe('C-01a · nombres y aislamiento', () => {
  it('un nombre activo no se repite; archivado, se libera', async () => {
    const lab = await createOrgLab();
    const chemistry = await createDepartment(lab, 'Química');
    const physics = await createDepartment(lab, 'Física');
    for (const repeated of [
      await post(lab, '/departments', { name: 'química' }),
      await call(lab.adminMember.subject, `${lab.base}/departments/${physics.id}`, { method: 'PATCH', body: { name: 'QUÍMICA' } }),
    ]) {
      expect(repeated.status).toBe(409);
      expect(errorCode(repeated.body)).toBe('NAME_TAKEN');
    }
    expect((await post(lab, `/departments/${chemistry.id}/archive`)).status).toBe(200);
    expect((await post(lab, `/departments/${chemistry.id}/archive`)).status).toBe(404);
    expect((await post(lab, '/departments', { name: 'Química' })).status).toBe(201);

    // Dos estantes del mismo nivel no se llaman igual, sin tildes ni mayúsculas.
    const left = await createLocation(lab, 'Mesón izquierdo', lab.room);
    await createLocation(lab, 'Mesón derecho', lab.room);
    const clash = await call(lab.adminMember.subject, `${lab.base}/locations/${left}`, { method: 'PATCH', body: { name: 'meson DERECHO' } });
    expect(clash.status).toBe(409);
    expect(errorCode(clash.body)).toBe('NAME_TAKEN');
  });

  it('el espacio B no ve ni toca los departamentos, las ubicaciones ni las áreas de A', async () => {
    const a = await createOrgLab();
    const b = await createOrgLab();
    const ofA = await createDepartment(a, 'Química');
    await createDepartment(b, 'Química');
    expect(departmentList.parse((await call(b.operator.subject, `${b.base}/departments`)).body).items.map((item) => item.id)).not.toContain(ofA.id);
    expect((await overview(b)).areas.map((area) => area.id)).not.toContain(a.room);

    const crossed = [
      await call(b.adminMember.subject, `${b.base}/departments/${ofA.id}`, { method: 'PATCH', body: { name: 'Tomado' } }),
      await post(b, `/departments/${ofA.id}/archive`),
      await call(b.adminMember.subject, `${b.base}/locations/${a.shelf}`, { method: 'PATCH', body: { name: 'Tomado' } }),
      await post(b, `/locations/${a.room}/archive`),
      await post(b, '/locations', { name: 'Colgada', parentId: a.room }),
      await call(b.adminMember.subject, `${b.base}/areas/${a.room}/manager`, { method: 'PUT', body: { managerId: null } }),
    ];
    expect(crossed.map((response) => response.status)).toEqual([404, 404, 404, 404, 404, 404]);
    // Un equipo de B no se enlaza a un departamento de A.
    const asset = await createAsset(b, b.room, { departmentId: ofA.id });
    expect(asset.status).toBe(400);
    expect(errorCode(asset.body)).toBe('VALIDATION_FAILED');
    expect(await count('select count(*) as n from core.departments where id = $1 and name = $2', [ofA.id, 'Química'])).toBe(1);
  });
});

describe('C-01a · archivar un área o un estante', () => {
  it('con existencias o con un equipo activo se rechaza; sin nada, archiva también sus estantes', async () => {
    const lab = await createOrgLab();
    const product = await createProduct(lab);
    expect((await receive(lab, product, lab.shelf)).status).toBe(201);
    for (const id of [lab.room, lab.shelf]) {
      const stocked = await post(lab, `/locations/${id}/archive`);
      expect(stocked.status).toBe(400);
      expect(errorCode(stocked.body)).toBe('VALIDATION_FAILED');
    }

    const equipped = await createLocation(lab, 'Sala de equipos', lab.site);
    const placed = await createAsset(lab, equipped);
    expect(placed.status).toBe(201);
    const busy = await post(lab, `/locations/${equipped}/archive`);
    expect(busy.status).toBe(400);
    expect(errorCode(busy.body)).toBe('VALIDATION_FAILED');
    // Un equipo dado de baja ya no ocupa el área.
    const retire = await post(lab, `/equipment/assets/${assetContract.parse(placed.body).id}/condition`, { condition: 'retired', reason: 'Obsoleto' });
    expect(retire.status).toBe(201);
    expect((await post(lab, `/locations/${equipped}/archive`)).status).toBe(200);

    const empty = await createLocation(lab, 'Bodega vacía', lab.site);
    const shelf = await createLocation(lab, 'Estante 1', empty);
    const level = await createLocation(lab, 'Nivel 1', shelf);
    const archived = await post(lab, `/locations/${empty}/archive`);
    expect(archived.status).toBe(200);
    expect(archivedLocations.parse(archived.body).ids.sort()).toEqual([empty, shelf, level].sort());
    expect(
      await count('select count(*) as n from core.locations where id = any ($1::uuid[]) and archived_at is not null', [[empty, shelf, level]]),
    ).toBe(3);
    expect((await overview(lab)).areas.map((area) => area.id)).not.toContain(empty);
    // Ya archivada no se encuentra; lo archivado no recibe nada nuevo; una sede no se archiva desde Áreas.
    expect((await post(lab, `/locations/${empty}/archive`)).status).toBe(404);
    expect((await post(lab, '/locations', { name: 'Dentro', parentId: shelf })).status).toBe(404);
    expect((await receive(lab, product, level)).status).toBeGreaterThanOrEqual(400);
    expect((await post(lab, `/locations/${lab.site}/archive`)).status).toBe(400);
    expect(await stockInArchived(lab.workspace.id)).toBe(0);
  });

  it('un frasco vacío que quedó en un área archivada no recibe existencias por ajuste', async () => {
    const lab = await createOrgLab();
    const product = await createProduct(lab);
    const received = await receive(lab, product, lab.shelf);
    expect(received.status).toBe(201);
    const [container] = receiptResponse.parse(received.body).containers;
    const adjust = (quantity: string) =>
      post(lab, '/reagents/adjustments', { positionId: container!.positionId, quantity, unit: 'g', reason: 'Conteo mensual' });
    expect((await adjust('-5')).status).toBe(201);
    expect((await post(lab, `/locations/${lab.room}/archive`)).status).toBe(200);

    const refilled = await adjust('2');
    expect(refilled.status).toBe(400);
    expect(errorCode(refilled.body)).toBe('VALIDATION_FAILED');
    expect(await stockInArchived(lab.workspace.id)).toBe(0);
  });

  it('archivar el área mientras un ingreso entra a su estante: gana uno y no queda nada en un área archivada', async () => {
    for (const first of ['archive', 'receipt'] as const) {
      const lab = await createOrgLab(['reagents']);
      const product = await createProduct(lab);
      const archive = () => post(lab, `/locations/${lab.room}/archive`);
      const ingress = () => receive(lab, product, lab.shelf);
      // Otra conexión retiene el estante: el archivo y el ingreso, cada uno en su conexión, quedan esperándolo.
      const blocker = await admin.connect();
      try {
        await blocker.query('BEGIN');
        await blocker.query('select id from core.locations where id = $1 for update', [lab.shelf]);
        const archiving = first === 'archive' ? archive() : null;
        const receiving = first === 'receipt' ? ingress() : null;
        await waitForRuntimeLock(1);
        const second = first === 'archive' ? ingress() : archive();
        await waitForRuntimeLock(2);
        await blocker.query('COMMIT');
        const [archived, received] = await Promise.all(first === 'archive' ? [archiving!, second] : [second, receiving!]);

        const winners = [archived.status === 200, received.status === 201].filter(Boolean);
        expect(winners).toHaveLength(1);
        if (archived.status === 200) {
          expect(received.status).toBeGreaterThanOrEqual(400);
          expect(await count('select count(*) as n from inventory.operations where workspace_id = $1', [lab.workspace.id])).toBe(0);
        } else {
          expect(errorCode(archived.body)).toBe('VALIDATION_FAILED');
          expect(receiptResponse.parse(received.body).containers).toHaveLength(1);
          expect(await count('select count(*) as n from core.locations where id = $1 and archived_at is null', [lab.room])).toBe(1);
        }
        expect(await stockInArchived(lab.workspace.id)).toBe(0);
      } finally {
        await blocker.query('ROLLBACK').catch(() => undefined);
        blocker.release();
      }
    }
  });

  it('archivar el área mientras se crea un estante en ella: ningún estante activo queda bajo un área archivada', async () => {
    for (const first of ['archive', 'create'] as const) {
      const lab = await createOrgLab(['reagents']);
      const archive = () => post(lab, `/locations/${lab.room}/archive`);
      const create = () => post(lab, '/locations', { name: `Estante ${uniqueSuffix()}`, parentId: lab.room });
      // Otra conexión retiene el área: el primero toma el bloqueo de ubicaciones del espacio y espera el área;
      // el segundo espera ese bloqueo.
      const blocker = await admin.connect();
      try {
        await blocker.query('BEGIN');
        await blocker.query('select id from core.locations where id = $1 for update', [lab.room]);
        const firstCall = first === 'archive' ? archive() : create();
        await waitForRuntimeLock(1);
        const secondCall = first === 'archive' ? create() : archive();
        await waitForRuntimeLock(2);
        await blocker.query('COMMIT');
        const [archived, created] = await Promise.all(first === 'archive' ? [firstCall, secondCall] : [secondCall, firstCall]);

        expect(archived.status).toBe(200);
        if (first === 'archive') {
          expect(created.status).toBe(404);
        } else {
          const shelf = location.parse(created.body).id;
          expect(await count('select count(*) as n from core.locations where id = $1 and archived_at is not null', [shelf])).toBe(1);
        }
        expect(
          await count(
            `select count(*) as n from core.locations as child
               join core.locations as parent on parent.workspace_id = child.workspace_id and parent.id = child.parent_id
              where child.workspace_id = $1 and child.archived_at is null and parent.archived_at is not null`,
            [lab.workspace.id],
          ),
        ).toBe(0);
      } finally {
        await blocker.query('ROLLBACK').catch(() => undefined);
        blocker.release();
      }
    }
  });
});

describe('C-01a · cifras y enlaces', () => {
  it('cada área y cada departamento cuentan, por módulo, los reactivos con existencias y los equipos activos', async () => {
    const lab = await createOrgLab();
    const teaching = await createDepartment(lab, 'Docencia');
    const research = await createDepartment(lab, 'Investigación');
    const first = await createProduct(lab);
    const second = await createProduct(lab);
    // Dos frascos del mismo reactivo cuentan uno; en el área y en su estante, la misma área.
    expect((await receive(lab, first, lab.shelf, { departmentId: teaching.id })).status).toBe(201);
    expect((await receive(lab, first, lab.room, { departmentId: teaching.id })).status).toBe(201);
    expect((await receive(lab, second, lab.room)).status).toBe(201);
    expect((await createAsset(lab, lab.shelf, { departmentId: teaching.id })).status).toBe(201);
    const gone = await createAsset(lab, lab.room, { departmentId: research.id });
    expect(
      (await post(lab, `/equipment/assets/${assetContract.parse(gone.body).id}/condition`, { condition: 'retired', reason: 'Obsoleto' })).status,
    ).toBe(201);

    const view = await overview(lab);
    expect(view.areas.find((area) => area.id === lab.room)?.counts).toEqual({ reagents: 2, equipment: 1 });
    expect(view.departments).toEqual([
      { id: teaching.id, name: 'Docencia', counts: { reagents: 1, equipment: 1 } },
      { id: research.id, name: 'Investigación', counts: { reagents: 0, equipment: 0 } },
    ]);
  });

  it('un equipo se enlaza a un departamento activo; uno archivado se rechaza y el ya enlazado lo conserva', async () => {
    const lab = await createOrgLab();
    const teaching = await createDepartment(lab, 'Docencia');
    const created = await createAsset(lab, lab.room, { departmentId: teaching.id });
    expect(created.status).toBe(201);
    expect(assetContract.parse(created.body).department).toEqual({ id: teaching.id, name: 'Docencia' });
    expect((await post(lab, `/departments/${teaching.id}/archive`)).status).toBe(200);
    const archived = await createAsset(lab, lab.room, { departmentId: teaching.id });
    expect(archived.status).toBe(400);
    expect(errorCode(archived.body)).toBe('VALIDATION_FAILED');
    const kept = await call(lab.operator.subject, `${lab.base}/equipment/assets/${assetContract.parse(created.body).id}`);
    expect(assetContract.parse(kept.body).department).toEqual({ id: teaching.id, name: 'Docencia' });
  });

  it('reintentar con la misma clave no duplica el departamento ni la auditoría', async () => {
    const lab = await createOrgLab();
    const key = `departamento-${uniqueSuffix()}`;
    const first = await post(lab, '/departments', { name: 'Química' }, lab.adminMember.subject, key);
    expect(first.status).toBe(201);
    expect(await post(lab, '/departments', { name: 'Química' }, lab.adminMember.subject, key)).toEqual(first);
    const reused = await post(lab, '/departments', { name: 'Física' }, lab.adminMember.subject, key);
    expect(reused.status).toBe(422);
    expect(errorCode(reused.body)).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await count('select count(*) as n from core.departments where workspace_id = $1', [lab.workspace.id])).toBe(1);
    expect(
      await count(`select count(*) as n from core.audit_events where workspace_id = $1 and action = 'core.department.create'`, [lab.workspace.id]),
    ).toBe(1);
  });
});

describe('C-01a · paso de datos de la migración', () => {
  /**
   * Las sentencias de datos de la migración, tal como están en el archivo: altas de departamentos y enlace de
   * los lotes. Se ejecutan sobre la forma anterior (listas y `lots.area`) recreada en una transacción que
   * se revierte.
   */
  async function migrationDataSteps(): Promise<string[]> {
    const file = new URL('../../../../../supabase/migrations/20261020200000_c01a_areas_departments.sql', import.meta.url);
    const statements = (await readFile(file, 'utf8')).split(/;\s*\n/).map((statement) =>
      statement
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim(),
    );
    const steps = statements.filter((statement) => /^(insert into core\.departments|update inventory\.lots)/.test(statement));
    expect(steps).toHaveLength(3);
    return steps;
  }

  it('las listas activas pasan sin repetir nombres y un nombre que solo está en lotes queda archivado y enlazado', async () => {
    const steps = await migrationDataSteps();
    const workspace = await seedWorkspace(admin, { modules: ['reagents'] });
    const client = await admin.connect();
    try {
      await client.query('BEGIN');
      await client.query('alter table inventory.lots add column area text');
      for (const list of ['areas', 'destinations']) {
        await client.query(
          `create table inventory.${list} (workspace_id uuid, name text, created_at timestamptz default now(), archived_at timestamptz)`,
        );
      }
      // Entre dos iguales sin mayúsculas, queda el nombre más antiguo.
      await client.query(
        `insert into inventory.areas (workspace_id, name, created_at, archived_at)
         values ($1, 'Química', now() - interval '2 days', null), ($1, 'Ya archivada', now(), now())`,
        [workspace.id],
      );
      await client.query(
        `insert into inventory.destinations (workspace_id, name, created_at)
         values ($1, ' química ', now() - interval '1 day'), ($1, 'Laboratorio 1', now())`,
        [workspace.id],
      );
      const item = await client.query<{ id: string }>(
        `insert into inventory.items (workspace_id, kind, code, name, base_unit) values ($1, 'reagent', 'NACL', 'Cloruro de sodio', 'g') returning id`,
        [workspace.id],
      );
      const lots = await client.query<{ id: string; area: string | null }>(
        `insert into inventory.lots (workspace_id, item_id, code, area)
         values ($1, $2, 'L-001', 'QUÍMICA'), ($1, $2, 'L-002', 'Solo en lotes'), ($1, $2, 'L-003', null)
         returning id, area`,
        [workspace.id, item.rows[0]!.id],
      );
      for (const step of steps) await client.query(step);

      const departments = await client.query<{ name: string; archived: boolean }>(
        `select name, archived_at is not null as archived from core.departments where workspace_id = $1 order by lower(name)`,
        [workspace.id],
      );
      expect(departments.rows).toEqual([
        { name: 'Laboratorio 1', archived: false },
        { name: 'Química', archived: false },
        { name: 'Solo en lotes', archived: true },
      ]);
      const linked = await client.query<{ code: string; department: string | null }>(
        `select l.code, d.name as department from inventory.lots as l
           left join core.departments as d on d.workspace_id = l.workspace_id and d.id = l.department_id
          where l.workspace_id = $1 order by l.code`,
        [workspace.id],
      );
      expect(lots.rows).toHaveLength(3);
      expect(linked.rows).toEqual([
        { code: 'L-001', department: 'Química' },
        { code: 'L-002', department: 'Solo en lotes' },
        { code: 'L-003', department: null },
      ]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
