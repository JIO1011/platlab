import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  errorResponse,
  homeResponse,
  issueRequestList,
  issueResponse,
  locationList,
  lotList,
  lot as lotContract,
  movementResponse,
  operationList,
  positionList,
  product as productContract,
  productList,
  reagentsSummary,
  receiptResponse,
  entryList,
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

const listEntry = entryList.shape.items.element;

/** Posición del primer frasco de un ingreso (ADR 0012: la posición es frasco + ubicación). */
const receivedPosition = (response: { body: unknown }) => receiptResponse.parse(response.body).containers[0]!.positionId;

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
    const received = receiptResponse.parse(receipt.body);
    expect(received).toMatchObject({ type: 'receipt', lot: { id: lot.id, code: 'L-001' }, unit: 'g' });
    expect(received.containers).toEqual([
      expect.objectContaining({ code: 'L-001-01', quantity: '100', balance: '100' }),
    ]);
    const receiptBody = { positionId: received.containers[0]!.positionId };

    // ADR 0012: la salida del Operador queda pendiente y aparta los 20 g; la aprueba el Administrador.
    const issue = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: receiptBody.positionId, quantity: '20', unit: 'g', reason: 'Práctica', destination: 'Laboratorio 1' },
    });
    expect(issue.status).toBe(201);
    const pending = issueResponse.parse(issue.body);
    expect(pending).toMatchObject({ status: 'pending', quantity: '20', available: '80' });
    if (pending.status !== 'pending') throw new Error('se esperaba una solicitud');
    const approved = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${pending.requestId}/approve`, {
      method: 'POST',
    });
    expect(approved.status).toBe(201);
    expect(movementResponse.parse(approved.body)).toMatchObject({ appliedQuantity: '-20', balance: '80' });

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
      expect.objectContaining({
        id: receiptBody.positionId,
        balance: '79.5',
        unit: 'g',
        container: expect.objectContaining({ code: 'L-001-01', initialQuantity: '100' }),
      }),
    ]);
    const catalog = productList.parse((await call(lab.operator.subject, `${lab.base}/products`)).body);
    expect(catalog.items).toEqual([expect.objectContaining({ id: product.id, balance: '79.5', containersWithStock: 1 })]);

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
      { type: 'issue', quantity: '-20', balanceAfter: '80', actor: 'Administradora', reason: 'Práctica' },
      { type: 'receipt', quantity: '100', balanceAfter: '100', actor: 'Operador', reason: null },
    ]);
    expect(history.items.map((operation) => operation.requestedBy?.displayName ?? null)).toEqual([null, 'Operador', null]);

    const home = homeResponse.parse((await call(lab.adminMember.subject, `/workspaces/${lab.workspace.id}/home`)).body);
    expect(home.cards).toEqual([
      expect.objectContaining({
        moduleCode: 'reagents',
        name: 'Reactivos',
        summary: { productsWithStock: 1, containersWithStock: 1, expiredContainers: 0, expiringContainers: 0, pendingRequests: 0 },
      }),
    ]);
    // Actividad reciente en Inicio: los mismos tres movimientos, del más reciente al más antiguo.
    expect(
      home.cards[0]!.activity.map(({ type, quantity, actor }) => ({ type, quantity, actor })),
    ).toEqual([
      { type: 'adjustment', quantity: '-0.5', actor: 'Administradora' },
      { type: 'issue', quantity: '-20', actor: 'Administradora' },
      { type: 'receipt', quantity: '100', actor: 'Operador' },
    ]);
    // Gráfico (ADR 0011): 30 días con ceros incluidos, que cuentan salidas y no cantidades; la
    // única salida cae en el día de hoy según la zona del espacio.
    const trend = home.cards[0]!.trend;
    expect(trend?.label).toBe('Salidas por día, últimos 30 días');
    expect(trend?.points).toHaveLength(30);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
    expect(trend?.points.at(-1)).toEqual({ date: today, value: 1 });
    expect(trend?.points.reduce((sum, point) => sum + point.value, 0)).toBe(1);

    // El Resumen de la app devuelve lo mismo que la tarjeta; el Operador lo ve con su ámbito.
    const summary = reagentsSummary.parse((await call(lab.operator.subject, `${lab.base}/summary`)).body);
    expect(summary).toEqual({ summary: home.cards[0]!.summary, activity: home.cards[0]!.activity, trend });

    // La cifra «Salidas, últimos 30 días» abre la lista con el mismo filtro: suman lo mismo.
    const issues = operationList.parse(
      (await call(lab.operator.subject, `${lab.base}/operations?type=issue&days=30&limit=100`)).body,
    );
    expect(issues.items.map((operation) => operation.type)).toEqual(['issue']);
    expect(issues.items).toHaveLength(trend!.points.reduce((sum, point) => sum + point.value, 0));
    const receipts = operationList.parse(
      (await call(lab.operator.subject, `${lab.base}/operations?type=receipt&days=1`)).body,
    );
    expect(receipts.items.map((operation) => operation.quantity)).toEqual(['100']);
    expect((await call(lab.operator.subject, `${lab.base}/operations?days=0`)).status).toBe(400);
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
    bPosition = receivedPosition(await receive(b, bLot, '50'));
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

  it('un miembro sin rol no registra movimientos ni consulta el inventario', async () => {
    const member = await addMember(admin, lab.workspace.id);
    const receipt = await receive(lab, lotId, '1', lab.storage, member.subject);
    expect(receipt.status).toBe(403);
    expect((await call(member.subject, `${lab.base}/positions`)).status).toBe(403);
  });

  it('el propietario opera como Administrador sin asignación: ingresa y ajusta (ADR 0008, 02-10-2026)', async () => {
    const owner = lab.workspace.owner.subject;
    const receipt = await receive(lab, lotId, '5', lab.storage, owner);
    expect(receipt.status).toBe(201);
    const positionId = receivedPosition(receipt);
    const adjustment = await call(owner, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId, quantity: '-1', unit: 'g', reason: 'Conteo del propietario' },
    });
    expect(adjustment.status).toBe(201);
    expect((await call(owner, `${lab.base}/positions`)).status).toBe(200);
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
    const otherPosition = receivedPosition(await receive(lab, lotId, '10', lab.otherStorage));
    const issue = await call(scoped.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: otherPosition, quantity: '1', unit: 'g', reason: 'Práctica', destination: 'Lab' },
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
    const positionId = receivedPosition(await receive(lab, lot.id, '100'));
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
    const positionId = receivedPosition(await receive(lab, lot.id, '100'));
    // Salidas directas: las registra quien puede aprobar (ADR 0012).
    const issue = () =>
      call(lab.adminMember.subject, `${lab.base}/issues`, {
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

  it('dos ingresos simultáneos al mismo lote reciben números de frasco distintos', async () => {
    const lab = await createLab();
    const { lot } = await createProductAndLot(lab);
    const results = await Promise.all([receive(lab, lot.id, '10'), receive(lab, lot.id, '15')]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    const positions = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions`)).body);
    expect(positions.items.map((p) => p.container?.code).sort()).toEqual(['L-001-01', 'L-001-02']);
    expect(positions.items.map((p) => p.balance).sort()).toEqual(['10', '15']);
  });

  it('un ingreso de varios frascos es una operación con un asiento por frasco', async () => {
    const lab = await createLab();
    const { lot } = await createProductAndLot(lab);
    const response = await call(lab.operator.subject, `${lab.base}/receipts`, {
      method: 'POST',
      body: { lotId: lot.id, locationId: lab.storage, containers: 3, quantity: '250', unit: 'g' },
    });
    expect(response.status).toBe(201);
    const received = receiptResponse.parse(response.body);
    expect(received.containers.map((c) => [c.code, c.balance])).toEqual([
      ['L-001-01', '250'],
      ['L-001-02', '250'],
      ['L-001-03', '250'],
    ]);
    const history = operationList.parse((await call(lab.operator.subject, `${lab.base}/operations?limit=2`)).body);
    expect(history.items.map((item) => item.id)).toEqual([received.operationId, received.operationId]);
    // La página siguiente sigue con el tercer frasco de la misma operación, sin saltarlo.
    const next = operationList.parse(
      (await call(lab.operator.subject, `${lab.base}/operations?limit=2&cursor=${history.nextCursor}`)).body,
    );
    expect(next.items.map((item) => item.id)).toEqual([received.operationId]);
    expect(new Set([...history.items, ...next.items].map((item) => item.entryId)).size).toBe(3);
  });

  it('el ingreso puede crear el lote en la misma transacción (01 §6.1)', async () => {
    const lab = await createLab();
    const { product } = await createProductAndLot(lab);
    const response = await call(lab.operator.subject, `${lab.base}/receipts`, {
      method: 'POST',
      body: {
        productId: product.id,
        newLot: { code: 'L-NUEVO', expiresOn: '2027-01-31' },
        locationId: lab.storage,
        quantity: '40',
        unit: 'g',
      },
    });
    expect(response.status).toBe(201);
    expect(receiptResponse.parse(response.body)).toMatchObject({ lot: { code: 'L-NUEVO' } });
    const lots = lotList.parse((await call(lab.operator.subject, `${lab.base}/products/${product.id}/lots`)).body);
    expect(lots.items.map((l) => l.code).sort()).toEqual(['L-001', 'L-NUEVO']);
    // Lote existente y lote nuevo a la vez es ambiguo: se rechaza.
    const ambiguous = await call(lab.operator.subject, `${lab.base}/receipts`, {
      method: 'POST',
      body: { lotId: lots.items[0]!.id, productId: product.id, newLot: { code: 'L-X' }, locationId: lab.storage, quantity: '1', unit: 'g' },
    });
    expect(ambiguous.status).toBe(400);
    // Un lote nuevo para un reactivo de otro espacio no encuentra el reactivo: 404, sin revelar nada.
    const other = await createLab();
    const foreign = await createProductAndLot(other);
    const crossed = await call(lab.operator.subject, `${lab.base}/receipts`, {
      method: 'POST',
      body: { productId: foreign.product.id, newLot: { code: 'L-AJENO' }, locationId: lab.storage, quantity: '1', unit: 'g' },
    });
    expect(crossed.status).toBe(404);
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
    positionId = receivedPosition(await receive(lab, lotId, '10'));
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
    const { lot } = await createProductAndLot(lab);
    const positionId = receivedPosition(await receive(lab, lot.id, quantity));
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
        container: { code: 'L-001-01' },
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

  it('si el lote pasa a cuarentena después de pedirse, no se aprueba pero se puede rechazar', async () => {
    const { lab, positionId } = await stockedLab();
    const requestId = requestIdOf(await requestIssue(lab, positionId, '10'));
    await admin.query(
      `update inventory.lots set condition = 'quarantine'
        where id = (select lot_id from inventory.positions where id = $1)`,
      [positionId],
    );
    const approve = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${requestId}/approve`, { method: 'POST' });
    expect(approve.status).toBe(400);
    expect(errorCode(approve.body)).toBe('VALIDATION_FAILED');
    expect(await positionOf(lab, positionId)).toMatchObject({ balance: '100', reserved: '10' });
    const reject = await call(lab.adminMember.subject, `${lab.base}/issue-requests/${requestId}/reject`, {
      method: 'POST',
      body: { reason: 'Lote en cuarentena' },
    });
    expect(reject.status).toBe(200);
    expect(await positionOf(lab, positionId)).toMatchObject({ balance: '100', reserved: '0' });
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

describe('R-01A · vencidos y por vencer (ADR 0012, 05-10-2026)', () => {
  it('cuenta frascos con saldo vencidos y por vencer en 30 días, en la fecha del espacio y en el ámbito', async () => {
    const lab = await createLab();
    const { product } = await createProductAndLot(lab);
    // La fecha civil del espacio la da la propia base: la prueba no depende del reloj del runner.
    const day = async (offset: number) =>
      (
        await admin.query<{ d: string }>(
          `select to_char((now() at time zone 'America/Guayaquil')::date + $1::int, 'YYYY-MM-DD') as d`,
          [offset],
        )
      ).rows[0]!.d;
    const receiveNew = async (code: string, offset: number | null, location = lab.storage) => {
      const response = await call(lab.adminMember.subject, `${lab.base}/receipts`, {
        method: 'POST',
        body: {
          productId: product.id,
          newLot: { code, expiresOn: offset === null ? null : await day(offset) },
          locationId: location,
          quantity: '10',
          unit: 'g',
        },
      });
      expect(response.status).toBe(201);
      return receivedPosition(response);
    };

    await receiveNew('V-1', -1); // vencido
    await receiveNew('H-0', 0); // vence hoy: por vencer, todavía no vencido
    await receiveNew('H-30', 30); // el último día del plazo
    await receiveNew('H-31', 31); // fuera del plazo
    await receiveNew('SIN', null); // sin caducidad confirmada: ni vencido ni por vencer
    const emptied = await receiveNew('V-5', -5);
    const issued = await call(lab.adminMember.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: emptied, quantity: '10', unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });
    expect(issued.status).toBe(201); // vencido pero sin saldo: no cuenta
    await receiveNew('V-OTRO', -2, lab.otherStorage);

    const summary = reagentsSummary.parse((await call(lab.adminMember.subject, `${lab.base}/summary`)).body).summary;
    expect(summary).toMatchObject({ productsWithStock: 1, containersWithStock: 6, expiredContainers: 2, expiringContainers: 2 });
    const products = productList.parse((await call(lab.adminMember.subject, `${lab.base}/products`)).body);
    expect(products.items).toEqual([expect.objectContaining({ id: product.id, expiredContainers: 2, expiringContainers: 2 })]);

    // Un Operador con ámbito en un almacén no cuenta el vencido del otro.
    const scoped = await addMember(admin, lab.workspace.id, { roles: [{ role: 'operator', locationId: lab.storage }] });
    const scopedSummary = reagentsSummary.parse((await call(scoped.subject, `${lab.base}/summary`)).body).summary;
    expect(scopedSummary).toMatchObject({ containersWithStock: 5, expiredContainers: 1, expiringContainers: 2 });
  });
});
