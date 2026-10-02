import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  errorResponse,
  homeResponse,
  locationList,
  lotList,
  lot as lotContract,
  movementResponse,
  operationList,
  positionList,
  product as productContract,
  productList,
} from '@platlab/contracts';
import { buildApp } from '../../app.js';
import { createPool } from '../../platform/db/pool.js';
import {
  addLocation,
  addMember,
  createAdminPool,
  seedWorkspace,
  setModuleStatus,
  uniqueSuffix,
  type Member,
  type Workspace,
} from '../../testing/core-fixtures.js';
import { createTestSigner } from '../../testing/tokens.js';

/**
 * R-00 por HTTP contra la base local, con el rol de runtime y conexiones reales: el recorrido de
 * la demo y la evidencia de G0 (primer incremento, «Evidencia para cerrar G0»).
 */
const admin = createAdminPool();
const pool = createPool({
  connectionString:
    process.env['DATABASE_URL_API'] ??
    'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 4,
});
const signer = await createTestSigner();
const app = buildApp({ pool, verifyToken: signer.verifier });

afterAll(async () => {
  await app.close();
  await pool.end();
  await admin.end();
});

interface Call {
  method?: 'GET' | 'POST';
  body?: unknown;
  key?: string;
}

async function call(subject: string, url: string, { method = 'GET', body, key }: Call = {}) {
  const response = await app.inject({
    method,
    url: `/v1${url}`,
    headers: {
      authorization: `Bearer ${await signer.sign(subject)}`,
      ...(key ? { 'idempotency-key': key } : {}),
    },
    ...(body === undefined ? {} : { payload: body as Record<string, unknown> }),
  });
  return { status: response.statusCode, body: response.json() as unknown };
}

const errorCode = (body: unknown) => errorResponse.parse(body).error.code;

interface Lab {
  workspace: Workspace;
  base: string;
  adminMember: Member;
  operator: Member;
  storage: string;
  otherStorage: string;
}

/** Espacio con Reactivos, un Administrador, un Operador y dos almacenes bajo una sede. */
async function createLab(): Promise<Lab> {
  const workspace = await seedWorkspace(admin, { modules: ['reagents'] });
  const site = await addLocation(admin, workspace.id, { kind: 'site' });
  const storage = await addLocation(admin, workspace.id, { kind: 'storage', parentId: site });
  const otherStorage = await addLocation(admin, workspace.id, { kind: 'storage', parentId: site });
  return {
    workspace,
    base: `/workspaces/${workspace.id}/reagents`,
    adminMember: await addMember(admin, workspace.id, { roles: [{ role: 'admin' }], displayName: 'Administradora' }),
    operator: await addMember(admin, workspace.id, { roles: [{ role: 'operator' }], displayName: 'Operador' }),
    storage,
    otherStorage,
  };
}

/** El Administrador crea un reactivo y un lote por la API. */
async function createProductAndLot(lab: Lab, unit = 'g') {
  const created = await call(lab.adminMember.subject, `${lab.base}/products`, {
    method: 'POST',
    body: { code: `R-${uniqueSuffix()}`, name: 'Cloruro de sodio', baseUnit: unit, casNumber: '7647-14-5' },
  });
  expect(created.status).toBe(201);
  const product = productContract.parse(created.body);
  const lotCreated = await call(lab.adminMember.subject, `${lab.base}/products/${product.id}/lots`, {
    method: 'POST',
    body: { code: 'L-001', expiresOn: null },
  });
  expect(lotCreated.status).toBe(201);
  return { product, lot: lotContract.parse(lotCreated.body) };
}

async function receive(lab: Lab, lotId: string, quantity: string, location = lab.storage, subject = lab.operator.subject) {
  return call(subject, `${lab.base}/receipts`, {
    method: 'POST',
    body: { lotId, locationId: location, quantity, unit: 'g' },
  });
}

const count = async (sql: string, params: unknown[]) =>
  Number((await admin.query<{ n: string }>(sql, params)).rows[0]!.n);
const operationsIn = (workspaceId: string) =>
  count('select count(*) as n from inventory.operations where workspace_id = $1', [workspaceId]);
const auditsIn = (workspaceId: string) =>
  count('select count(*) as n from core.audit_events where workspace_id = $1', [workspaceId]);

describe('G0 · recorrido visible', () => {
  it('ingreso de 100 g, salida de 20 g y ajuste de −0,5 g dejan 79,5 g, con historial y responsables', async () => {
    const lab = await createLab();
    const { product, lot } = await createProductAndLot(lab);
    expect(lot).toMatchObject({ productId: product.id, expiresOn: null, supplierLot: null });

    const receipt = await receive(lab, lot.id, '100');
    expect(receipt.status).toBe(201);
    const receiptBody = movementResponse.parse(receipt.body);
    expect(receiptBody).toMatchObject({ type: 'receipt', appliedQuantity: '100', balance: '100', unit: 'g' });

    const issue = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: receiptBody.positionId, quantity: '20', unit: 'g', reason: 'Práctica', destination: 'Laboratorio 1' },
    });
    expect(issue.status).toBe(201);
    expect(movementResponse.parse(issue.body)).toMatchObject({ appliedQuantity: '-20', balance: '80' });

    const denied = await call(lab.operator.subject, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId: receiptBody.positionId, quantity: '-0.5', unit: 'g', reason: 'Conteo' },
    });
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');

    const adjustment = await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId: receiptBody.positionId, quantity: '-0.5', unit: 'g', reason: 'Conteo' },
    });
    expect(adjustment.status).toBe(201);
    expect(movementResponse.parse(adjustment.body)).toMatchObject({ appliedQuantity: '-0.5', balance: '79.5' });

    const positions = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions`)).body);
    expect(positions.items).toEqual([
      expect.objectContaining({ id: receiptBody.positionId, balance: '79.5', unit: 'g' }),
    ]);
    const catalog = productList.parse((await call(lab.operator.subject, `${lab.base}/products`)).body);
    expect(catalog.items).toEqual([expect.objectContaining({ id: product.id, balance: '79.5' })]);

    const history = operationList.parse((await call(lab.operator.subject, `${lab.base}/operations`)).body);
    expect(
      history.items.map(({ type, quantity, balanceAfter, actor, reason }) => ({
        type,
        quantity,
        balanceAfter,
        actor: actor.displayName,
        reason,
      })),
    ).toEqual([
      { type: 'adjustment', quantity: '-0.5', balanceAfter: '79.5', actor: 'Administradora', reason: 'Conteo' },
      { type: 'issue', quantity: '-20', balanceAfter: '80', actor: 'Operador', reason: 'Práctica' },
      { type: 'receipt', quantity: '100', balanceAfter: '100', actor: 'Operador', reason: null },
    ]);

    const home = homeResponse.parse((await call(lab.adminMember.subject, `/workspaces/${lab.workspace.id}/home`)).body);
    expect(home.cards).toEqual([
      { moduleCode: 'reagents', name: 'Reactivos', summary: { productsWithStock: 1, positionsWithStock: 1 } },
    ]);
  });
});

describe('G0 · aislamiento entre A y B', () => {
  let a: Lab;
  let b: Lab;
  let bLot: string;
  let bPosition: string;
  let shared: string;

  beforeAll(async () => {
    a = await createLab();
    b = await createLab();
    bLot = (await createProductAndLot(b)).lot.id;
    bPosition = movementResponse.parse((await receive(b, bLot, '50')).body).positionId;
    // Una misma identidad: Operador en A y Administrador en B.
    shared = `sub-shared-${uniqueSuffix()}`;
    await addMember(admin, a.workspace.id, { subject: shared, roles: [{ role: 'operator' }] });
    await addMember(admin, b.workspace.id, { subject: shared, roles: [{ role: 'admin' }] });
  });

  it('un miembro de A no consulta ni usa Reactivos de B', async () => {
    const response = await call(a.operator.subject, `${b.base}/positions`);
    expect(response.status).toBe(403);
    expect(errorCode(response.body)).toBe('ACCESS_DENIED');
  });

  it('pertenecer a ambos no permite usar un lote, una ubicación o una posición de B en un comando de A', async () => {
    const aLot = (await createProductAndLot(a)).lot.id;
    const attempts = [
      await receive(a, bLot, '1', a.storage, shared),
      await receive(a, aLot, '1', b.storage, shared),
      await call(shared, `${a.base}/issues`, {
        method: 'POST',
        body: { positionId: bPosition, quantity: '1', unit: 'g', reason: 'Cruce', destination: 'Otro espacio' },
      }),
    ];
    for (const attempt of attempts) {
      expect(attempt.status).toBe(404);
      expect(errorCode(attempt.body)).toBe('NOT_FOUND');
    }
    expect(await operationsIn(a.workspace.id)).toBe(0);
    const bPositions = positionList.parse((await call(shared, `${b.base}/positions`)).body);
    expect(bPositions.items.map((p) => p.balance)).toEqual(['50']);
  });

  it('las listas de A no incluyen datos de B', async () => {
    const products = productList.parse((await call(shared, `${a.base}/products`)).body);
    const positions = positionList.parse((await call(shared, `${a.base}/positions`)).body);
    expect(products.items.every((p) => p.id !== bLot)).toBe(true);
    expect(positions.items.find((p) => p.id === bPosition)).toBeUndefined();
  });
});

describe('G0 · roles', () => {
  let lab: Lab;
  let lotId: string;
  let productId: string;

  beforeAll(async () => {
    lab = await createLab();
    ({
      lot: { id: lotId },
      product: { id: productId },
    } = await createProductAndLot(lab));
  });

  it('el propietario sin rol operativo no registra movimientos ni consulta el inventario', async () => {
    const receipt = await receive(lab, lotId, '1', lab.storage, lab.workspace.owner.subject);
    expect(receipt.status).toBe(403);
    expect((await call(lab.workspace.owner.subject, `${lab.base}/positions`)).status).toBe(403);
  });

  it('el Operador registra ingresos y salidas, pero no productos, lotes ni ajustes', async () => {
    const product = await call(lab.operator.subject, `${lab.base}/products`, {
      method: 'POST',
      body: { code: `OP-${uniqueSuffix()}`, name: 'No permitido', baseUnit: 'g' },
    });
    const lot = await call(lab.operator.subject, `${lab.base}/products/${productId}/lots`, {
      method: 'POST',
      body: { code: 'L-OP' },
    });
    for (const response of [product, lot]) {
      expect(response.status).toBe(403);
      expect(errorCode(response.body)).toBe('ACCESS_DENIED');
    }
    expect((await receive(lab, lotId, '5')).status).toBe(201);
  });

  it('un Operador con ámbito en un almacén no opera ni ve el otro', async () => {
    const scoped = await addMember(admin, lab.workspace.id, {
      roles: [{ role: 'operator', locationId: lab.storage }],
    });
    const other = movementResponse.parse((await receive(lab, lotId, '10', lab.otherStorage)).body);
    const issue = await call(scoped.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: other.positionId, quantity: '1', unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });
    expect(issue.status).toBe(403);
    expect((await receive(lab, lotId, '1', lab.otherStorage, scoped.subject)).status).toBe(403);
    expect((await receive(lab, lotId, '1', lab.storage, scoped.subject)).status).toBe(201);
    const positions = positionList.parse((await call(scoped.subject, `${lab.base}/positions`)).body);
    expect(positions.items.every((p) => p.location.id === lab.storage)).toBe(true);
  });
});

describe('G0 · módulos y tipo de ítem', () => {
  it('C, sin Reactivos, recibe «módulo no disponible» en las rutas del módulo', async () => {
    const c = await seedWorkspace(admin);
    const adminC = await addMember(admin, c.id, { roles: [{ role: 'admin' }] });
    for (const response of [
      await call(adminC.subject, `/workspaces/${c.id}/reagents/products`),
      await call(adminC.subject, `/workspaces/${c.id}/reagents/receipts`, {
        method: 'POST',
        body: { lotId: randomUUID(), locationId: randomUUID(), quantity: '1', unit: 'g' },
      }),
    ]) {
      expect(response.status).toBe(403);
      expect(errorCode(response.body)).toBe('MODULE_UNAVAILABLE');
    }
  });

  it('un ítem de otro tipo no se lista ni se opera desde las rutas de Reactivos', async () => {
    const lab = await createLab();
    const item = await admin.query<{ id: string }>(
      `insert into inventory.items (workspace_id, kind, code, name, base_unit)
       values ($1, 'material', $2, 'Pipeta', 'g') returning id`,
      [lab.workspace.id, `MAT-${uniqueSuffix()}`],
    );
    const materialId = item.rows[0]!.id;
    const lot = await admin.query<{ id: string }>(
      `insert into inventory.lots (workspace_id, item_id, code) values ($1, $2, 'M-1') returning id`,
      [lab.workspace.id, materialId],
    );
    const position = await admin.query<{ id: string }>(
      `insert into inventory.positions (workspace_id, item_id, lot_id, location_id)
       values ($1, $2, $3, $4) returning id`,
      [lab.workspace.id, materialId, lot.rows[0]!.id, lab.storage],
    );

    const products = productList.parse((await call(lab.adminMember.subject, `${lab.base}/products`)).body);
    expect(products.items.map((p) => p.id)).not.toContain(materialId);
    const attempts = [
      await call(lab.adminMember.subject, `${lab.base}/products/${materialId}/lots`, {
        method: 'POST',
        body: { code: 'L-X' },
      }),
      await receive(lab, lot.rows[0]!.id, '1', lab.storage, lab.adminMember.subject),
      await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
        method: 'POST',
        body: { positionId: position.rows[0]!.id, quantity: '1', unit: 'g', reason: 'Conteo' },
      }),
    ];
    for (const attempt of attempts) expect(attempt.status).toBe(404);
  });

  it('una salida lanzada a la vez que la desactivación del módulo no queda confirmada después', async () => {
    const lab = await createLab();
    const { lot } = await createProductAndLot(lab);
    const positionId = movementResponse.parse((await receive(lab, lot.id, '100')).body).positionId;
    const before = await operationsIn(lab.workspace.id);

    const other = await admin.connect();
    try {
      await other.query('BEGIN');
      await setModuleStatus(other, lab.workspace.id, 'reagents', 'disabled');
      const issue = call(lab.operator.subject, `${lab.base}/issues`, {
        method: 'POST',
        body: { positionId, quantity: '20', unit: 'g', reason: 'Práctica', destination: 'Lab' },
      });
      await waitForRuntimeLock();
      await other.query('COMMIT');
      const response = await issue;
      expect(response.status).toBe(403);
      expect(errorCode(response.body)).toBe('MODULE_UNAVAILABLE');
    } finally {
      await other.query('ROLLBACK').catch(() => undefined);
      other.release();
    }
    expect(await operationsIn(lab.workspace.id)).toBe(before);
    const balance = await admin.query<{ balance: string }>(
      'select trim_scale(balance) as balance from inventory.positions where id = $1',
      [positionId],
    );
    expect(balance.rows[0]!.balance).toBe('100');
  });
});

async function waitForRuntimeLock(): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const { rows } = await admin.query<{ n: string }>(
      `select count(*) as n from pg_stat_activity where wait_event_type = 'Lock' and usename = 'platlab_api'`,
    );
    if (Number(rows[0]!.n) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('El runtime no quedó esperando el bloqueo');
}

describe('G0 · concurrencia', () => {
  it('dos salidas de 60 g sobre 100 g: una confirma, la otra recibe stock insuficiente y quedan 40 g', async () => {
    const lab = await createLab();
    const { lot } = await createProductAndLot(lab);
    const positionId = movementResponse.parse((await receive(lab, lot.id, '100')).body).positionId;
    const issue = () =>
      call(lab.operator.subject, `${lab.base}/issues`, {
        method: 'POST',
        body: { positionId, quantity: '60', unit: 'g', reason: 'Práctica', destination: 'Lab' },
      });

    const results = await Promise.all([issue(), issue()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const rejected = results.find((r) => r.status === 409)!;
    expect(errorCode(rejected.body)).toBe('INSUFFICIENT_STOCK');

    const positions = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions`)).body);
    expect(positions.items.map((p) => p.balance)).toEqual(['40']);
    expect(
      await count(`select count(*) as n from inventory.operations where workspace_id = $1 and type = 'issue'`, [
        lab.workspace.id,
      ]),
    ).toBe(1);
  });

  it('dos ingresos simultáneos a una posición nueva no duplican su clave', async () => {
    const lab = await createLab();
    const { lot } = await createProductAndLot(lab);
    const results = await Promise.all([receive(lab, lot.id, '10'), receive(lab, lot.id, '15')]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    const positions = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions`)).body);
    expect(positions.items.map((p) => p.balance)).toEqual(['25']);
  });
});

describe('G0 · idempotencia y rollback', () => {
  it('repetir un ingreso con la misma clave no añade asientos ni auditoría; con otra cantidad se rechaza', async () => {
    const lab = await createLab();
    const { lot } = await createProductAndLot(lab);
    const body = { lotId: lot.id, locationId: lab.storage, quantity: '100', unit: 'g' };
    const key = `ingreso-${uniqueSuffix()}`;
    const audits = await auditsIn(lab.workspace.id);

    const first = await call(lab.operator.subject, `${lab.base}/receipts`, { method: 'POST', body, key });
    const again = await call(lab.operator.subject, `${lab.base}/receipts`, { method: 'POST', body, key });
    expect(again).toEqual(first);
    expect(await operationsIn(lab.workspace.id)).toBe(1);
    expect(await auditsIn(lab.workspace.id)).toBe(audits + 1);

    const changed = await call(lab.operator.subject, `${lab.base}/receipts`, {
      method: 'POST',
      body: { ...body, quantity: '60' },
      key,
    });
    expect(changed.status).toBe(422);
    expect(errorCode(changed.body)).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await operationsIn(lab.workspace.id)).toBe(1);
  });

  it('duplicados simultáneos con la misma clave producen un solo movimiento', async () => {
    const lab = await createLab();
    const { lot } = await createProductAndLot(lab);
    const body = { lotId: lot.id, locationId: lab.storage, quantity: '7', unit: 'g' };
    const key = `simultaneo-${uniqueSuffix()}`;
    const results = await Promise.all(
      [1, 2, 3].map(() => call(lab.operator.subject, `${lab.base}/receipts`, { method: 'POST', body, key })),
    );
    // Mismo estado y mismo contenido; jsonb puede devolver las claves en otro orden.
    for (const result of results) expect(result).toEqual(results[0]);
    expect(await operationsIn(lab.workspace.id)).toBe(1);
  });

  it('un fallo provocado antes del commit no deja movimiento, auditoría de éxito ni saldo parcial', async () => {
    const lab = await createLab();
    const { lot } = await createProductAndLot(lab);
    const audits = await auditsIn(lab.workspace.id);
    const trigger = `fail_${uniqueSuffix().replace(/-/g, '')}`;
    // Fallo en el último paso de la escritura, solo para este espacio.
    await admin.query(`
      create function inventory.${trigger}() returns trigger language plpgsql as $$
      begin
        if new.workspace_id = '${lab.workspace.id}' then raise exception 'fallo provocado'; end if;
        return new;
      end $$;
      create trigger ${trigger} after insert on inventory.entries
        for each row execute function inventory.${trigger}();`);
    try {
      const failed = await receive(lab, lot.id, '100');
      expect(failed.status).toBe(500);
      expect(errorCode(failed.body)).toBe('INTERNAL');
    } finally {
      await admin.query(`drop trigger ${trigger} on inventory.entries; drop function inventory.${trigger}();`);
    }
    expect(await operationsIn(lab.workspace.id)).toBe(0);
    expect(await auditsIn(lab.workspace.id)).toBe(audits);
    expect(
      await count('select count(*) as n from inventory.positions where workspace_id = $1', [lab.workspace.id]),
    ).toBe(0);

    expect((await receive(lab, lot.id, '100')).status).toBe(201);
  });
});

describe('validación y consultas', () => {
  let lab: Lab;
  let lotId: string;
  let positionId: string;

  beforeAll(async () => {
    lab = await createLab();
    lotId = (await createProductAndLot(lab)).lot.id;
    positionId = movementResponse.parse((await receive(lab, lotId, '10')).body).positionId;
  });

  it.each([
    ['una unidad incompatible', { unit: 'kg' }],
    ['una cantidad cero', { quantity: '0' }],
    ['una cantidad negativa', { quantity: '-5' }],
    ['notación científica', { quantity: '1e3' }],
    ['más de nueve decimales', { quantity: '1.0000000001' }],
    ['un campo no previsto', { actorId: randomUUID() }],
  ])('un ingreso con %s se rechaza como datos inválidos', async (_case, override) => {
    const body = { lotId, locationId: lab.storage, quantity: '1', unit: 'g', ...override };
    const response = await call(lab.operator.subject, `${lab.base}/receipts`, { method: 'POST', body });
    expect(response.status).toBe(400);
    expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
  });

  it('un ajuste de cero y una salida sin motivo se rechazan', async () => {
    const zero = await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId, quantity: '0.000', unit: 'g', reason: 'Conteo' },
    });
    const noReason = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId, quantity: '1', unit: 'g', destination: 'Lab' },
    });
    expect([zero.status, noReason.status]).toEqual([400, 400]);
  });

  it('una salida mayor que el saldo responde stock insuficiente y no escribe nada', async () => {
    const before = await operationsIn(lab.workspace.id);
    const response = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId, quantity: '10.000000001', unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });
    expect(response.status).toBe(409);
    expect(errorCode(response.body)).toBe('INSUFFICIENT_STOCK');
    expect(await operationsIn(lab.workspace.id)).toBe(before);
  });

  it('un código de producto repetido se rechaza sin distinguir mayúsculas', async () => {
    const code = `DUP-${uniqueSuffix()}`;
    const create = (value: string) =>
      call(lab.adminMember.subject, `${lab.base}/products`, {
        method: 'POST',
        body: { code: value, name: 'Duplicado', baseUnit: 'g' },
      });
    expect((await create(code)).status).toBe(201);
    const repeated = await create(code.toLowerCase());
    expect(repeated.status).toBe(400);
    expect(errorCode(repeated.body)).toBe('VALIDATION_FAILED');
  });

  it('las listas se paginan con un cursor opaco y rechazan uno manipulado', async () => {
    await receive(lab, lotId, '1', lab.otherStorage);
    const first = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions?limit=1`)).body);
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).not.toBeNull();
    const second = positionList.parse(
      (await call(lab.operator.subject, `${lab.base}/positions?limit=1&cursor=${first.nextCursor}`)).body,
    );
    expect(second.items).toHaveLength(1);
    expect(second.items[0]!.id).not.toBe(first.items[0]!.id);

    const bad = await call(lab.operator.subject, `${lab.base}/positions?cursor=no-es-un-cursor`);
    expect(bad.status).toBe(400);
    const unknownFilter = await call(lab.operator.subject, `${lab.base}/positions?orderBy=balance`);
    expect(unknownFilter.status).toBe(400);
  });

  it('el historial pagina sin perder movimientos del mismo instante', async () => {
    const history = operationList.parse((await call(lab.operator.subject, `${lab.base}/operations?limit=1`)).body);
    const rest = operationList.parse(
      (await call(lab.operator.subject, `${lab.base}/operations?limit=50&cursor=${history.nextCursor}`)).body,
    );
    const all = operationList.parse((await call(lab.operator.subject, `${lab.base}/operations?limit=50`)).body);
    expect([...history.items, ...rest.items].map((o) => o.id)).toEqual(all.items.map((o) => o.id));
  });
});

describe('consultas de apoyo a la interfaz', () => {
  it('lista los lotes de un reactivo y las ubicaciones donde el miembro puede registrar ingresos', async () => {
    const lab = await createLab();
    const { product, lot } = await createProductAndLot(lab);
    const lots = lotList.parse((await call(lab.operator.subject, `${lab.base}/products/${product.id}/lots`)).body);
    expect(lots.items).toEqual([expect.objectContaining({ id: lot.id, code: 'L-001', condition: 'enabled' })]);

    const scoped = await addMember(admin, lab.workspace.id, {
      roles: [{ role: 'operator', locationId: lab.storage }],
    });
    const scopedLocations = locationList.parse((await call(scoped.subject, `${lab.base}/receipt-locations`)).body);
    expect(scopedLocations.items.map((l) => l.id)).toEqual([lab.storage]);
    const allLocations = locationList.parse((await call(lab.adminMember.subject, `${lab.base}/receipt-locations`)).body);
    expect(allLocations.items.map((l) => l.id)).toEqual(expect.arrayContaining([lab.storage, lab.otherStorage]));
  });

  it('los lotes de un ítem de otro tipo no se listan', async () => {
    const lab = await createLab();
    const item = await admin.query<{ id: string }>(
      `insert into inventory.items (workspace_id, kind, code, name, base_unit)
       values ($1, 'material', $2, 'Gradilla', 'u') returning id`,
      [lab.workspace.id, `MAT-${uniqueSuffix()}`],
    );
    await admin.query(`insert into inventory.lots (workspace_id, item_id, code) values ($1, $2, 'M-1')`, [
      lab.workspace.id,
      item.rows[0]!.id,
    ]);
    const lots = lotList.parse((await call(lab.adminMember.subject, `${lab.base}/products/${item.rows[0]!.id}/lots`)).body);
    expect(lots.items).toEqual([]);
  });
});
