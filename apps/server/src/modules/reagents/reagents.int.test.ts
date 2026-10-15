import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  errorResponse,
  homeResponse,
  issueRequestList,
  issueResponse,
  location,
  locationList,
  movementResponse,
  operationFacets,
  operationList,
  operationTotals,
  type Operation,
  positionList,
  product as productContract,
  productDetail,
  tareResponse,
  containerCodeSuggestion,
  brandList,
  productList,
  reagentsSummary,
  receiptResponse,
  entryList,
  containerResponse,
  countResponse,
  transferResponse,
} from '@platlab/contracts';
import { buildApp } from '../../app.js';
import { localPublicFiles } from '../../testing/storage.js';
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
const app = buildApp({ pool, verifyToken: signer.verifier, publicFiles: localPublicFiles });

afterAll(async () => {
  await app.close();
  await pool.end();
  await admin.end();
});

interface Call {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
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

/** El Administrador crea un reactivo por la API; el código es automático (ADR 0015). */
async function createProduct(lab: Lab, unit = 'g', name = 'Cloruro de sodio') {
  const created = await call(lab.adminMember.subject, `${lab.base}/products`, {
    method: 'POST',
    body: { name, baseUnit: unit, casNumber: '7647-14-5', physicalState: unit === 'g' || unit === 'kg' ? 'solid' : 'liquid' },
  });
  expect(created.status).toBe(201);
  return productContract.parse(created.body);
}

/** Códigos de frasco únicos para un ingreso de prueba. */
const freshCodes = (count = 1) => Array.from({ length: count }, () => `F-${uniqueSuffix()}`);

/** Ingreso de un frasco (ADR 0015): cada ingreso abre un lote nuevo del reactivo. */
async function receive(
  lab: Lab,
  productId: string,
  quantity: string,
  location = lab.storage,
  subject = lab.operator.subject,
  extra: Record<string, unknown> = {},
) {
  return call(subject, `${lab.base}/receipts`, {
    method: 'POST',
    body: { productId, locationId: location, quantity, unit: 'g', codes: freshCodes(), ...extra },
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
    const product = await createProduct(lab);
    expect(product).toMatchObject({ code: 'CLORURO-SODIO', hazards: [], controlled: false, sdsKind: null, density: null });

    const receipt = await receive(lab, product.id, '100', lab.storage, lab.operator.subject, { codes: ['NAC-001'] });
    expect(receipt.status).toBe(201);
    const received = receiptResponse.parse(receipt.body);
    expect(received).toMatchObject({
      type: 'receipt',
      product: { id: product.id, code: 'CLORURO-SODIO' },
      lot: { code: 'L-001' },
      unit: 'g',
    });
    expect(received.containers).toEqual([
      expect.objectContaining({ code: 'NAC-001', quantity: '100', balance: '100', tare: null }),
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
        container: expect.objectContaining({
          code: 'NAC-001',
          initialQuantity: '100',
          tare: null,
          density: null,
          // Quien ingresó el frasco, no quien lo movió después (el ajuste es del Administrador).
          receivedBy: { displayName: 'Operador' },
        }),
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
        summary: { productsWithStock: 1, containersWithStock: 1, expiredContainers: 0, expiringContainers: 0, belowMinimum: 0, productsWithMinimum: 0, pendingRequests: 0 },
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

    // El Resumen de la app devuelve lo mismo que la tarjeta, también para el Operador.
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
  let bProduct: string;
  let bPosition: string;
  let shared: string;

  beforeAll(async () => {
    a = await createLab();
    b = await createLab();
    bProduct = (await createProduct(b)).id;
    bPosition = receivedPosition(await receive(b, bProduct, '50'));
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

  it('pertenecer a ambos no permite usar un reactivo, una ubicación o una posición de B en un comando de A', async () => {
    const aProduct = (await createProduct(a)).id;
    const attempts = [
      await receive(a, bProduct, '1', a.storage, shared),
      await receive(a, aProduct, '1', b.storage, shared),
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
    expect(products.items.every((p) => p.id !== bProduct)).toBe(true);
    expect(positions.items.find((p) => p.id === bPosition)).toBeUndefined();
  });
});

describe('G0 · roles', () => {
  let lab: Lab;
  let productId: string;

  beforeAll(async () => {
    lab = await createLab();
    productId = (await createProduct(lab)).id;
  });

  it('un Estudiante, sin permisos de inventario, no registra movimientos ni consulta el inventario', async () => {
    const student = await addMember(admin, lab.workspace.id, { roles: [{ role: 'student' }] });
    const position = receivedPosition(await receive(lab, productId, '10'));
    const issue = await call(student.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: position, quantity: '1', unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });
    expect(issue.status).toBe(403);
    expect((await receive(lab, productId, '1', lab.storage, student.subject)).status).toBe(403);
    expect((await call(student.subject, `${lab.base}/positions`)).status).toBe(403);
  });

  it('el propietario opera como Administrador sin asignación: ingresa y ajusta (ADR 0008, 02-10-2026)', async () => {
    const owner = lab.workspace.owner.subject;
    const receipt = await receive(lab, productId, '5', lab.storage, owner);
    expect(receipt.status).toBe(201);
    const positionId = receivedPosition(receipt);
    const adjustment = await call(owner, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId, quantity: '-1', unit: 'g', reason: 'Conteo del propietario' },
    });
    expect(adjustment.status).toBe(201);
    expect((await call(owner, `${lab.base}/positions`)).status).toBe(200);
  });

  it('el Operador registra ingresos y salidas, pero no productos, fichas ni ajustes', async () => {
    const product = await call(lab.operator.subject, `${lab.base}/products`, {
      method: 'POST',
      body: { name: 'No permitido', baseUnit: 'g', physicalState: 'mixture' },
    });
    const edit = await call(lab.operator.subject, `${lab.base}/products/${productId}`, {
      method: 'PATCH',
      body: { controlled: true },
    });
    for (const response of [product, edit]) {
      expect(response.status).toBe(403);
      expect(errorCode(response.body)).toBe('ACCESS_DENIED');
    }
    expect((await receive(lab, productId, '5')).status).toBe(201);
  });

  it('el rol vale en todo el espacio: el Operador opera y ve los dos almacenes, y nada de otro espacio (ADR 0008)', async () => {
    const other = await createLab();
    await receive(other, (await createProduct(other)).id, '3', other.storage);
    await receive(lab, productId, '4', lab.storage);
    const otherPosition = receivedPosition(await receive(lab, productId, '10', lab.otherStorage));
    const issue = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: otherPosition, quantity: '1', unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });
    expect(issue.status).toBe(201);

    const positions = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions`)).body);
    const seen = new Set(positions.items.map((p) => p.location.id));
    expect([...seen]).toEqual(expect.arrayContaining([lab.storage, lab.otherStorage]));
    expect([...seen]).not.toContain(other.storage);
    const locations = locationList.parse((await call(lab.operator.subject, `${lab.base}/receipt-locations`)).body);
    const ids = locations.items.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining([lab.storage, lab.otherStorage]));
    expect(ids).not.toContain(other.storage);
    expect(ids).not.toContain(other.otherStorage);
    // El Resumen del Operador es el del espacio entero: el mismo que ve el Administrador.
    const summaryOf = async (subject: string) => reagentsSummary.parse((await call(subject, `${lab.base}/summary`)).body).summary;
    expect(await summaryOf(lab.operator.subject)).toEqual(await summaryOf(lab.adminMember.subject));
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
        body: { productId: randomUUID(), locationId: randomUUID(), quantity: '1', unit: 'g', codes: freshCodes() },
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
      await call(lab.adminMember.subject, `${lab.base}/products/${materialId}`, {
        method: 'PATCH',
        body: { name: 'Pipeta' },
      }),
      await receive(lab, materialId, '1', lab.storage, lab.adminMember.subject),
      await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
        method: 'POST',
        body: { positionId: position.rows[0]!.id, quantity: '1', unit: 'g', reason: 'Conteo' },
      }),
    ];
    for (const attempt of attempts) expect(attempt.status).toBe(404);
  });

  it('una salida lanzada a la vez que la desactivación del módulo no queda confirmada después', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const positionId = receivedPosition(await receive(lab, product.id, '100'));
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

async function waitForRuntimeLock(waiting = 1): Promise<void> {
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

describe('G0 · concurrencia', () => {
  it('dos salidas de 60 g sobre 100 g: una confirma, la otra recibe stock insuficiente y quedan 40 g', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const positionId = receivedPosition(await receive(lab, product.id, '100'));
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

  it('dos ingresos simultáneos del mismo reactivo abren lotes distintos (ADR 0015)', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const results = await Promise.all([receive(lab, product.id, '10'), receive(lab, product.id, '15')]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results.map((r) => receiptResponse.parse(r.body).lot.code).sort()).toEqual(['L-001', 'L-002']);
    const positions = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions`)).body);
    expect(positions.items.map((p) => p.balance).sort()).toEqual(['10', '15']);
  });

  it('un ingreso de varios frascos es una operación con un asiento por frasco', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const response = await receive(lab, product.id, '250', lab.storage, lab.operator.subject, {
      codes: ['LAB-7', 'LAB-8', 'LAB-9'],
    });
    expect(response.status).toBe(201);
    const received = receiptResponse.parse(response.body);
    expect(received.containers.map((c) => [c.code, c.balance])).toEqual([
      ['LAB-7', '250'],
      ['LAB-8', '250'],
      ['LAB-9', '250'],
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

  it('dos ingresos simultáneos con el mismo código: uno completo y el otro CODE_TAKEN sin efectos', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const ingress = (codes: string[]) => receive(lab, product.id, '5', lab.storage, lab.operator.subject, { codes });
    const results = await Promise.all([ingress(['DUP-1', 'DUP-2']), ingress(['dup-2', 'DUP-3'])]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const rejected = results.find((r) => r.status === 409)!;
    expect(errorCode(rejected.body)).toBe('CODE_TAKEN');
    expect(errorResponse.parse(rejected.body).error.message).toMatch(/DUP-2|dup-2/);
    expect(await operationsIn(lab.workspace.id)).toBe(1);
    expect(await count('select count(*) as n from inventory.containers where workspace_id = $1', [lab.workspace.id])).toBe(2);
    expect(await count('select count(*) as n from inventory.lots where workspace_id = $1', [lab.workspace.id])).toBe(1);
  });

  it('dos altas simultáneas del mismo nombre: se crea una y la otra recibe NAME_TAKEN (ADR 0015)', async () => {
    const lab = await createLab();
    const create = (name: string) =>
      call(lab.adminMember.subject, `${lab.base}/products`, {
        method: 'POST',
        body: { name, baseUnit: 'g', casNumber: '7647-14-5', physicalState: 'solid' },
      });
    // Las dos esperan el bloqueo del catálogo a la vez; al soltarlo, la segunda ve la primera.
    const other = await admin.connect();
    let results: Array<{ status: number; body: unknown }>;
    try {
      await other.query('BEGIN');
      await other.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`inventory.items/${lab.workspace.id}`]);
      const pending = Promise.all([create('Acetona'), create('ACETONA')]);
      await waitForRuntimeLock(2);
      await other.query('COMMIT');
      results = await pending;
    } finally {
      await other.query('ROLLBACK').catch(() => undefined);
      other.release();
    }
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(errorCode(results.find((r) => r.status === 409)!.body)).toBe('NAME_TAKEN');
    expect(
      await count(`select count(*) as n from inventory.items where workspace_id = $1 and inventory.fold_text(name) = 'acetona'`, [
        lab.workspace.id,
      ]),
    ).toBe(1);
    // Dos nombres distintos que dan el mismo código siguen recibiendo códigos distintos.
    const codes = await Promise.all([createProduct(lab, 'g', 'Acetona 99 %'), createProduct(lab, 'g', 'Acetona 99')]);
    expect(codes.map((product) => product.code).sort()).toEqual(['ACETONA-99', 'ACETONA-99-2']);
  });

  it('dos altas simultáneas de la misma ubicación devuelven la misma', async () => {
    const lab = await createLab();
    const create = () =>
      call(lab.adminMember.subject, `${lab.base}/locations`, { method: 'POST', body: { name: 'Bodega norte', parentId: null } });
    const results = await Promise.all([create(), create()]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    const [first, second] = results.map((r) => location.parse(r.body));
    expect(first!.id).toBe(second!.id);
    expect(
      await count('select count(*) as n from core.locations where workspace_id = $1 and name = $2', [lab.workspace.id, 'Bodega norte']),
    ).toBe(1);
  });
});

describe('G0 · idempotencia y rollback', () => {
  it('repetir un ingreso con la misma clave no añade asientos ni auditoría; con otra cantidad se rechaza', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const body = { productId: product.id, locationId: lab.storage, quantity: '100', unit: 'g', codes: freshCodes() };
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
    const product = await createProduct(lab);
    const body = { productId: product.id, locationId: lab.storage, quantity: '7', unit: 'g', codes: freshCodes() };
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
    const product = await createProduct(lab);
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
      const failed = await receive(lab, product.id, '100');
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

    expect((await receive(lab, product.id, '100')).status).toBe(201);
  });
});

describe('validación y consultas', () => {
  let lab: Lab;
  let productId: string;
  let positionId: string;

  beforeAll(async () => {
    lab = await createLab();
    productId = (await createProduct(lab)).id;
    positionId = receivedPosition(await receive(lab, productId, '10'));
  });

  it.each([
    ['una unidad incompatible', { unit: 'kg' }],
    ['una cantidad cero', { quantity: '0' }],
    ['una cantidad negativa', { quantity: '-5' }],
    ['notación científica', { quantity: '1e3' }],
    ['más de nueve decimales', { quantity: '1.0000000001' }],
    ['un campo no previsto', { actorId: randomUUID() }],
    ['un código repetido en la solicitud', { codes: ['REP-1', 'rep-1'] }],
    ['un código con formato inválido', { codes: ['-X'] }],
    ['sin códigos', { codes: [] }],
    ['un reactivo del catálogo y uno nuevo a la vez', { newProduct: { name: 'Otro', physicalState: 'mixture', baseUnit: 'g' } }],
  ])('un ingreso con %s se rechaza como datos inválidos', async (_case, override) => {
    const body = { productId, locationId: lab.storage, quantity: '1', unit: 'g', codes: freshCodes(), ...override };
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

  it('el código del reactivo es automático: sin tildes y con -2 si otro nombre da el mismo (ADR 0015)', async () => {
    const create = (body: Record<string, unknown>) => call(lab.adminMember.subject, `${lab.base}/products`, { method: 'POST', body });
    const acid = { name: 'Ácido clorhídrico 37 %', casNumber: '7647-01-0', physicalState: 'liquid', baseUnit: 'mL' };
    const first = await create(acid);
    const second = await create({ ...acid, name: 'Ácido clorhídrico 37' });
    expect([first.status, second.status]).toEqual([201, 201]);
    expect([productContract.parse(first.body).code, productContract.parse(second.body).code]).toEqual([
      'ACIDO-CLORHIDRICO-37',
      'ACIDO-CLORHIDRICO-37-2',
    ]);
    // Un código propio no se acepta: lo decide el servidor.
    const withCode = await create({ ...acid, code: 'PROPIO' });
    expect(withCode.status).toBe(400);
    // El CAS se valida con su dígito de control y solo una mezcla puede no tenerlo.
    expect((await create({ ...acid, casNumber: '7647-01-1' })).status).toBe(400);
    expect((await create({ ...acid, casNumber: null })).status).toBe(400);
    expect((await create({ ...acid, name: 'Mezcla clorhídrica', casNumber: null, physicalState: 'mixture' })).status).toBe(201);
  });

  it('un nombre ya usado en el catálogo no se repite, sin tildes, mayúsculas ni espacios de más (ADR 0015)', async () => {
    const create = (name: string) =>
      call(lab.adminMember.subject, `${lab.base}/products`, {
        method: 'POST',
        body: { name, casNumber: '7732-18-5', physicalState: 'liquid', baseUnit: 'mL' },
      });
    const water = await create('Agua destilada');
    expect(water.status).toBe(201);
    const rejected = async (response: { status: number; body: unknown }) => {
      expect(response.status).toBe(409);
      expect(errorResponse.parse(response.body).error).toEqual({
        code: 'NAME_TAKEN',
        message: 'Ya existe «Agua destilada» en el catálogo: elígelo de la lista',
      });
    };
    const before = await auditsIn(lab.workspace.id);
    await rejected(await create('Agua destilada'));
    await rejected(await create('ÁGUA   DESTILADA'));
    // Desde el ingreso, con un reactivo nuevo, tampoco: no queda ni el reactivo ni el frasco.
    await rejected(
      await call(lab.adminMember.subject, `${lab.base}/receipts`, {
        method: 'POST',
        body: {
          newProduct: { name: 'agua destilada', casNumber: '7732-18-5', physicalState: 'liquid', baseUnit: 'mL' },
          locationId: lab.storage,
          quantity: '1',
          unit: 'mL',
          codes: freshCodes(),
        },
      }),
    );
    expect(await auditsIn(lab.workspace.id)).toBe(before);
    expect(
      await count(`select count(*) as n from inventory.items where workspace_id = $1 and inventory.fold_text(name) = 'agua destilada'`, [
        lab.workspace.id,
      ]),
    ).toBe(1);

    // Renombrar a un nombre de otro reactivo se rechaza; a sí mismo con otras mayúsculas, no.
    const rename = (productId: string, name: string) =>
      call(lab.adminMember.subject, `${lab.base}/products/${productId}`, { method: 'PATCH', body: { name } });
    const other = productContract.parse((await create('Agua desionizada')).body);
    await rejected(await rename(other.id, 'agua  Destilada'));
    const self = await rename(productContract.parse(water.body).id, 'AGUA DESTILADA');
    expect(self.status).toBe(200);
    expect(productContract.parse(self.body).name).toBe('AGUA DESTILADA');
  });

  it('las listas se paginan con un cursor opaco y rechazan uno manipulado', async () => {
    await receive(lab, productId, '1', lab.otherStorage);
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

describe('R-01D · buscar reactivos en el catálogo', () => {
  let lab: Lab;

  beforeAll(async () => {
    lab = await createLab();
    for (const body of [
      { name: 'Ácido acético', casNumber: '64-19-7', physicalState: 'liquid', baseUnit: 'mL' },
      { name: 'Acetona', casNumber: '67-64-1', physicalState: 'liquid', baseUnit: 'mL' },
      { name: 'Etanol 96 %', casNumber: '64-17-5', physicalState: 'liquid', baseUnit: 'mL' },
      { name: 'Etanol 96 puro', casNumber: null, physicalState: 'mixture', baseUnit: 'mL' },
      { name: 'Sulfato de cobre', casNumber: '7758-98-7', physicalState: 'solid', baseUnit: 'g' },
    ]) {
      expect((await call(lab.adminMember.subject, `${lab.base}/products`, { method: 'POST', body })).status).toBe(201);
    }
  });

  const list = async (search: string) => {
    const response = await call(lab.operator.subject, `${lab.base}/products${search}`);
    expect(response.status).toBe(200);
    return productList.parse(response.body);
  };
  const names = async (q: string) => (await list(`?q=${encodeURIComponent(q)}`)).items.map((item) => item.name);

  it('busca por nombre sin distinguir mayúsculas ni tildes, a ambos lados', async () => {
    expect(await names('ácido')).toEqual(['Ácido acético']);
    expect(await names('ACIDO ACETICO')).toEqual(['Ácido acético']);
    // Guardado sin tilde y escrito con ella.
    expect(await names('acétona')).toEqual(['Acetona']);
    expect(await names('  aceto  ')).toEqual(['Acetona']);
  });

  it('busca por código y por CAS', async () => {
    expect(await names('acido-ac')).toEqual(['Ácido acético']);
    expect(await names('64-19')).toEqual(['Ácido acético']);
    expect(await names('64-17')).toEqual(['Etanol 96 %']);
  });

  it('`%`, `_` y `\\` cuentan como texto, no como comodines', async () => {
    expect(await names('96 %')).toEqual(['Etanol 96 %']);
    expect(await names('de_c')).toEqual([]);
    expect(await names('de c')).toEqual(['Sulfato de cobre']);
    // Sin escapar, «\%» sería un «%» literal y encontraría «Etanol 96 %».
    expect(await names('96 \\')).toEqual([]);
  });

  it('pagina con el cursor y en el orden de siempre', async () => {
    const first = await list('?q=etanol&limit=1');
    expect(first.items.map((item) => item.name)).toEqual(['Etanol 96 %']);
    const second = await list(`?q=etanol&limit=1&cursor=${first.nextCursor}`);
    expect(second.items.map((item) => item.name)).toEqual(['Etanol 96 puro']);
    expect(second.nextCursor).toBeNull();
  });

  it.each([
    ['una sola letra', 'a'],
    ['una letra rodeada de espacios', '  a  '],
    ['más de 100 caracteres', 'a'.repeat(101)],
  ])('una búsqueda con %s se rechaza como datos inválidos', async (_case, q) => {
    const response = await call(lab.operator.subject, `${lab.base}/products?q=${encodeURIComponent(q)}`);
    expect(response.status).toBe(400);
    expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
  });

  it('sin `q` lista todo el catálogo por código, como antes', async () => {
    const all = await list('?limit=100');
    expect(all.items.map((item) => item.code)).toEqual([
      'ACETONA',
      'ACIDO-ACETICO',
      'ETANOL-96',
      'ETANOL-96-PURO',
      'SULFATO-COBRE',
    ]);
  });
});

describe('consultas de apoyo a la interfaz', () => {
  it('lista las ubicaciones donde el miembro puede registrar ingresos, con su padre', async () => {
    const lab = await createLab();
    const allLocations = locationList.parse((await call(lab.adminMember.subject, `${lab.base}/receipt-locations`)).body);
    expect(allLocations.items.map((l) => l.id)).toEqual(expect.arrayContaining([lab.storage, lab.otherStorage]));
    expect(allLocations.items.find((l) => l.id === lab.storage)?.parentId).toEqual(expect.any(String));
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

describe('R-01A · vencidos y por vencer (ADR 0012, 05-10-2026)', () => {
  it('cuenta frascos con saldo vencidos y por vencer en 30 días, en la fecha del espacio', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    // La fecha civil del espacio la da la propia base: la prueba no depende del reloj del runner.
    const day = async (offset: number) =>
      (
        await admin.query<{ d: string }>(
          `select to_char((now() at time zone 'America/Guayaquil')::date + $1::int, 'YYYY-MM-DD') as d`,
          [offset],
        )
      ).rows[0]!.d;
    const receiveNew = async (code: string, offset: number | null, location = lab.storage) => {
      const response = await receive(lab, product.id, '10', location, lab.adminMember.subject, {
        codes: [code],
        expiresOn: offset === null ? null : await day(offset),
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
  });
});

describe('R-01A · mínimos (ADR 0012, 05-10-2026)', () => {
  const summaryOf = async (lab: Lab) =>
    reagentsSummary.parse((await call(lab.adminMember.subject, `${lab.base}/summary`)).body).summary;
  const productOf = async (lab: Lab, productId: string) =>
    productList.parse((await call(lab.adminMember.subject, `${lab.base}/products`)).body).items.find(
      (item) => item.id === productId,
    )!;
  const requestIssue = (lab: Lab, positionId: string, quantity: string) =>
    call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId, quantity, unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });

  it('el mínimo lo fija el Administrador; bajo mínimo cuenta la existencia física, con lo apartado', async () => {
    const lab = await createLab();
    const product = await createProduct(lab, 'g', 'Acetona');
    expect(product.minimum).toBeNull();
    const fixed = await call(lab.adminMember.subject, `${lab.base}/products/${product.id}/minimum`, { method: 'PUT', body: { minimum: '50' } });
    expect(fixed).toMatchObject({ status: 200, body: { minimum: '50' } });
    // Con mínimo y sin existencias, está bajo mínimo.
    expect(await summaryOf(lab)).toMatchObject({ belowMinimum: 1, productsWithMinimum: 1 });
    expect(await productOf(lab, product.id)).toMatchObject({ minimum: '50', belowMinimum: true });

    const first = receivedPosition(await receive(lab, product.id, '30'));
    expect(await productOf(lab, product.id)).toMatchObject({ balance: '30', belowMinimum: true });
    await receive(lab, product.id, '20', lab.otherStorage);
    // Igual al mínimo no es «bajo»: 50 de 50.
    expect(await productOf(lab, product.id)).toMatchObject({ balance: '50', belowMinimum: false });
    expect(await summaryOf(lab)).toMatchObject({ belowMinimum: 0 });

    // Lo apartado sigue siendo existencia física.
    expect((await requestIssue(lab, first, '10')).status).toBe(201);
    expect(await productOf(lab, product.id)).toMatchObject({ belowMinimum: false });

    // El Operador no fija mínimos; un mínimo de cero no es válido; null lo quita.
    const denied = await call(lab.operator.subject, `${lab.base}/products/${product.id}/minimum`, { method: 'PUT', body: { minimum: '80' } });
    expect(denied.status).toBe(403);
    const zero = await call(lab.adminMember.subject, `${lab.base}/products/${product.id}/minimum`, { method: 'PUT', body: { minimum: '0' } });
    expect(zero.status).toBe(400);
    const raised = await call(lab.adminMember.subject, `${lab.base}/products/${product.id}/minimum`, { method: 'PUT', body: { minimum: '80.5' } });
    expect(raised).toMatchObject({ status: 200, body: { productId: product.id, minimum: '80.5' } });
    expect(await summaryOf(lab)).toMatchObject({ belowMinimum: 1 });
    const cleared = await call(lab.adminMember.subject, `${lab.base}/products/${product.id}/minimum`, { method: 'PUT', body: { minimum: null } });
    expect(cleared).toMatchObject({ status: 200, body: { minimum: null } });
    expect(await productOf(lab, product.id)).toMatchObject({ minimum: null, belowMinimum: false });
    expect(await summaryOf(lab)).toMatchObject({ belowMinimum: 0, productsWithMinimum: 0 });
    expect(
      await count(`select count(*) as n from core.audit_events where workspace_id = $1 and action = 'reagents.product.minimum'`, [lab.workspace.id]),
    ).toBe(3);
  });
});

describe('R-01A · traslados (ADR 0012, entrega 4)', () => {
  const transfer = (lab: Lab, positionId: string, locationId: string, subject = lab.operator.subject) =>
    call(subject, `${lab.base}/transfers`, { method: 'POST', body: { positionId, locationId } });
  const stockOf = async (lab: Lab, productId: string) =>
    positionList.parse((await call(lab.adminMember.subject, `${lab.base}/positions`)).body).items.filter(
      (position) => position.product.id === productId,
    );

  it('el Operador traslada un frasco entero en un paso, el historial lo muestra y puede volver', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const positionId = receivedPosition(await receive(lab, product.id, '100.5'));

    const locations = locationList.parse((await call(lab.operator.subject, `${lab.base}/transfer-locations`)).body);
    expect(locations.items.map((location) => location.id)).toEqual(expect.arrayContaining([lab.storage, lab.otherStorage]));

    const moved = await transfer(lab, positionId, lab.otherStorage);
    expect(moved.status).toBe(201);
    const result = transferResponse.parse(moved.body);
    expect(result).toMatchObject({ fromPositionId: positionId, quantity: '100.5', unit: 'g' });
    // El frasco se ve solo donde está, con su código y todo su saldo.
    const [here] = await stockOf(lab, product.id);
    expect(here).toMatchObject({ id: result.toPositionId, balance: '100.5', location: expect.objectContaining({ id: lab.otherStorage }) });
    // Quién lo ingresó viaja con el frasco: el ingreso quedó en la posición de origen.
    expect(here?.container?.receivedBy).toEqual({ displayName: 'Operador' });
    expect(await stockOf(lab, product.id)).toHaveLength(1);

    // Una operación con dos asientos: sale del origen y entra en el destino.
    const history = operationList.parse((await call(lab.adminMember.subject, `${lab.base}/operations?type=transfer`)).body);
    expect(history.items.map((item) => item.quantity).sort()).toEqual(['-100.5', '100.5']);
    expect(new Set(history.items.map((item) => item.id))).toEqual(new Set([result.operationId]));

    // Volver reutiliza la posición de origen; la misma ubicación no es un traslado.
    const back = transferResponse.parse((await transfer(lab, result.toPositionId, lab.storage)).body);
    expect(back.toPositionId).toBe(positionId);
    expect((await transfer(lab, positionId, lab.storage)).status).toBe(400);
    expect(
      await count(`select count(*) as n from core.audit_events where workspace_id = $1 and action = 'reagents.transfer.create'`, [lab.workspace.id]),
    ).toBe(2);
  });

  it('un frasco vacío o con salidas pendientes no se traslada; sin permiso o a otro espacio, tampoco', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const positionId = receivedPosition(await receive(lab, product.id, '50'));

    const pending = issueResponse.parse(
      (
        await call(lab.operator.subject, `${lab.base}/issues`, {
          method: 'POST',
          body: { positionId, quantity: '10', unit: 'g', reason: 'Práctica', destination: 'Lab' },
        })
      ).body,
    );
    if (pending.status !== 'pending') throw new Error('se esperaba una solicitud pendiente');
    const blocked = await transfer(lab, positionId, lab.otherStorage);
    expect(blocked.status).toBe(400);
    expect(errorCode(blocked.body)).toBe('VALIDATION_FAILED');
    await call(lab.adminMember.subject, `${lab.base}/issue-requests/${pending.requestId}/reject`, { method: 'POST', body: { reason: 'No' } });

    const outsider = await addMember(admin, lab.workspace.id, { roles: [] });
    expect((await transfer(lab, positionId, lab.otherStorage, outsider.subject)).status).toBe(403);
    const other = await createLab();
    expect((await transfer(lab, positionId, other.storage)).status).toBe(404);

    const emptied = await call(lab.adminMember.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId, quantity: '50', unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });
    expect(emptied.status).toBe(201);
    expect((await transfer(lab, positionId, lab.otherStorage)).status).toBe(400);
  });

  it('un traslado y una salida simultáneos: el frasco nunca queda con saldo en dos lugares', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const positionId = receivedPosition(await receive(lab, product.id, '100'));
    const [moved, issued] = await Promise.all([
      transfer(lab, positionId, lab.otherStorage),
      call(lab.adminMember.subject, `${lab.base}/issues`, {
        method: 'POST',
        body: { positionId, quantity: '30', unit: 'g', reason: 'Práctica', destination: 'Lab' },
      }),
    ]);
    const stocked = await stockOf(lab, product.id);
    expect(stocked).toHaveLength(1);
    expect(moved.status).toBe(201);
    if (issued.status === 201) {
      // La salida llegó antes: se trasladan los 70 que quedaban.
      expect(stocked[0]).toMatchObject({ balance: '70', location: expect.objectContaining({ id: lab.otherStorage }) });
    } else {
      // El traslado llegó antes: la salida sobre el origen vacío no alcanza.
      expect(issued.status).toBe(409);
      expect(stocked[0]).toMatchObject({ balance: '100', location: expect.objectContaining({ id: lab.otherStorage }) });
    }
  });
});

describe('R-01A · conteo por ubicación (ADR 0012, entrega 4)', () => {
  const countAt = (lab: Lab, locationId: string, lines: Array<{ positionId: string; expected: string; counted: string }>, subject = lab.adminMember.subject) =>
    call(subject, `${lab.base}/counts`, { method: 'POST', body: { locationId, lines } });

  async function countedLab() {
    const lab = await createLab();
    const product = await createProduct(lab);
    const received = await receive(lab, product.id, '50', lab.storage, lab.operator.subject, { codes: freshCodes(2) });
    const [first, second] = receiptResponse.parse(received.body).containers;
    const elsewhere = receivedPosition(await receive(lab, product.id, '30', lab.otherStorage));
    return { lab, first: first!.positionId, second: second!.positionId, elsewhere };
  }

  it('los frascos que no cuadran se ajustan en una sola operación «Conteo»; si todo cuadra, no hay movimiento', async () => {
    const { lab, first, second } = await countedLab();
    const here = positionList.parse((await call(lab.adminMember.subject, `${lab.base}/positions?locationId=${lab.storage}`)).body);
    expect(here.items.map((position) => position.id).sort()).toEqual([first, second].sort());
    const locations = locationList.parse((await call(lab.adminMember.subject, `${lab.base}/count-locations`)).body);
    expect(locations.items.map((location) => location.id)).toEqual(expect.arrayContaining([lab.storage]));

    const counted = await countAt(lab, lab.storage, [
      { positionId: first, expected: '50', counted: '48.5' },
      { positionId: second, expected: '50', counted: '50' },
    ]);
    expect(counted.status).toBe(201);
    expect(countResponse.parse(counted.body)).toMatchObject({ counted: 2, adjusted: 1 });
    const adjustments = operationList.parse((await call(lab.adminMember.subject, `${lab.base}/operations?type=adjustment`)).body);
    expect(adjustments.items).toEqual([expect.objectContaining({ positionId: first, quantity: '-1.5', balanceAfter: '48.5', reason: 'Conteo' })]);

    const even = await countAt(lab, lab.storage, [{ positionId: first, expected: '48.5', counted: '48.5' }]);
    expect(even.status).toBe(200);
    expect(countResponse.parse(even.body)).toMatchObject({ operationId: null, adjusted: 0 });
    expect(
      await count(`select count(*) as n from core.audit_events where workspace_id = $1 and action = 'reagents.count.create'`, [lab.workspace.id]),
    ).toBe(2);
  });

  it('un saldo que cambió mientras se contaba, lo contado bajo lo apartado u otra ubicación no escriben nada', async () => {
    const { lab, first, second, elsewhere } = await countedLab();
    const before = await operationsIn(lab.workspace.id);

    const stale = await countAt(lab, lab.storage, [
      { positionId: second, expected: '50', counted: '40' },
      { positionId: first, expected: '60', counted: '55' },
    ]);
    expect(stale.status).toBe(400);
    expect(errorCode(stale.body)).toBe('VALIDATION_FAILED');

    await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: first, quantity: '10', unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });
    expect((await countAt(lab, lab.storage, [{ positionId: first, expected: '50', counted: '5' }])).status).toBe(400);
    expect((await countAt(lab, lab.storage, [{ positionId: elsewhere, expected: '30', counted: '20' }])).status).toBe(404);
    expect((await countAt(lab, lab.storage, [{ positionId: second, expected: '50', counted: '40' }], lab.operator.subject)).status).toBe(403);
    const duplicated = await countAt(lab, lab.storage, [
      { positionId: second, expected: '50', counted: '40' },
      { positionId: second, expected: '50', counted: '41' },
    ]);
    expect(duplicated.status).toBe(400);
    expect(await operationsIn(lab.workspace.id)).toBe(before);
  });
});

describe('R-01A · enlace de la etiqueta QR (ADR 0012, entrega 4)', () => {
  it('resuelve el reactivo de un frasco del espacio; uno de otro espacio no existe para él', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const received = receiptResponse.parse((await receive(lab, product.id, '10')).body);
    const containerId = received.containers[0]!.containerId;

    const found = await call(lab.operator.subject, `${lab.base}/containers/${containerId}`);
    expect(found.status).toBe(200);
    expect(containerResponse.parse(found.body)).toEqual({ containerId, productId: product.id });

    const other = await createLab();
    expect((await call(other.adminMember.subject, `${other.base}/containers/${containerId}`)).status).toBe(404);
    const outsider = await addMember(admin, lab.workspace.id, { roles: [] });
    expect((await call(outsider.subject, `${lab.base}/containers/${containerId}`)).status).toBe(403);
  });
});

describe('R-01C · Movimientos como informe (ADR 0014)', () => {
  /** Recorre el libro entero, de dos en dos asientos, con los mismos filtros. */
  async function walk(subject: string, base: string, search = ''): Promise<Operation[]> {
    const items: Operation[] = [];
    let cursor: string | null = null;
    do {
      const url: string = `${base}/operations?limit=2${search ? `&${search}` : ''}${cursor ? `&cursor=${cursor}` : ''}`;
      const response = await call(subject, url);
      expect(response.status).toBe(200);
      const page = operationList.parse(response.body);
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return items;
  }

  const facetsOf = async (subject: string, lab: Lab, search = '') => {
    const response = await call(subject, `${lab.base}/operations/facets${search ? `?${search}` : ''}`);
    expect(response.status).toBe(200);
    return operationFacets.parse(response.body);
  };

  const totalsOf = async (subject: string, lab: Lab, search: string) => {
    const response = await call(subject, `${lab.base}/operations/totals?${search}`);
    expect(response.status).toBe(200);
    return operationTotals.parse(response.body);
  };

  const counts = <T extends { count: number }>(options: T[], key: (option: T) => string | null) =>
    Object.fromEntries(options.map((option) => [key(option), option.count]));

  /**
   * Un libro con dos reactivos de unidades distintas. A (g): ingreso de 100 del Operador, salida
   * directa de 0,1 del Administrador, salida de 0,2 pedida por el Operador y aprobada por el
   * Administrador, y ajuste de −0,5. B (mL): ingreso de 50 del Administrador y su traslado al otro
   * almacén (dos asientos). Siete asientos en total.
   */
  async function reportLab() {
    const lab = await createLab();
    const a = await createProduct(lab);
    const b = await createProduct(lab, 'mL', 'Etanol');
    const aPosition = receivedPosition(await receive(lab, a.id, '100'));
    const bReceipt = await receive(lab, b.id, '50', lab.storage, lab.adminMember.subject, { unit: 'mL' });
    expect(bReceipt.status).toBe(201);
    const bPosition = receivedPosition(bReceipt);
    const direct = await call(lab.adminMember.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: aPosition, quantity: '0.1', unit: 'g', reason: 'Práctica', destination: 'Laboratorio 1' },
    });
    expect(issueResponse.parse(direct.body).status).toBe('done');
    const requested = issueResponse.parse(
      (
        await call(lab.operator.subject, `${lab.base}/issues`, {
          method: 'POST',
          body: { positionId: aPosition, quantity: '0.2', unit: 'g', reason: 'Docencia', destination: 'Laboratorio 2' },
        })
      ).body,
    );
    if (requested.status !== 'pending') throw new Error('se esperaba una solicitud');
    expect(
      (await call(lab.adminMember.subject, `${lab.base}/issue-requests/${requested.requestId}/approve`, { method: 'POST' })).status,
    ).toBe(201);
    const adjusted = await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { positionId: aPosition, quantity: '-0.5', unit: 'g', reason: 'Conteo' },
    });
    expect(adjusted.status).toBe(201);
    const moved = await call(lab.adminMember.subject, `${lab.base}/transfers`, {
      method: 'POST',
      body: { positionId: bPosition, locationId: lab.otherStorage },
    });
    expect(moved.status).toBe(201);
    return { lab, a, b };
  }

  /** Fija la fecha de las operaciones de un reactivo, como dueño: el runtime no puede retrofechar. */
  const backdate = (productId: string, type: string, at: string) =>
    admin.query(
      `update inventory.operations as o set effective_at = $3::timestamptz
        where o.type = $2 and exists (
          select 1 from inventory.entries e join inventory.positions p on p.workspace_id = e.workspace_id and p.id = e.position_id
           where e.workspace_id = o.workspace_id and e.operation_id = o.id and p.item_id = $1)`,
      [productId, type, at],
    );

  it('varios tipos en parámetros repetidos; un tipo suelto y los días siguen igual', async () => {
    const { lab } = await reportLab();
    const subject = lab.operator.subject;
    const several = await walk(subject, lab.base, 'type=issue&type=adjustment');
    expect(several.map((item) => item.type).sort()).toEqual(['adjustment', 'issue', 'issue']);
    expect((await walk(subject, lab.base, 'type=issue')).map((item) => item.quantity).sort()).toEqual(['-0.1', '-0.2']);
    expect(await walk(subject, lab.base, 'days=30')).toHaveLength(7);
    // Un valor repetido cuenta una vez; un tipo desconocido es un error de datos.
    expect(await walk(subject, lab.base, 'type=issue&type=issue')).toHaveLength(2);
    const unknown = await call(subject, `${lab.base}/operations?type=issue&type=baja`);
    expect(unknown.status).toBe(400);
    expect(errorCode(unknown.body)).toBe('VALIDATION_FAILED');
  });

  it('desde–hasta son días civiles del espacio: las 23:30 del último día entran y las 00:00 del siguiente no', async () => {
    const { lab, a, b } = await reportLab();
    // America/Guayaquil es UTC−5 todo el año.
    await backdate(a.id, 'receipt', '2026-03-10T23:30:00-05:00');
    await backdate(b.id, 'receipt', '2026-03-11T00:00:00-05:00');
    const subject = lab.adminMember.subject;
    const tenth = await walk(subject, lab.base, 'from=2026-03-10&to=2026-03-10');
    expect(tenth.map((item) => [item.product.id, item.type])).toEqual([[a.id, 'receipt']]);
    const eleventh = await walk(subject, lab.base, 'from=2026-03-11&to=2026-03-11');
    expect(eleventh.map((item) => [item.product.id, item.type])).toEqual([[b.id, 'receipt']]);
    expect(await walk(subject, lab.base, 'from=2026-03-01&to=2026-03-31')).toHaveLength(2);
    // Un extremo solo: desde el día 11 entra todo lo de hoy, y hasta el 10 solo el ingreso de A.
    expect(await walk(subject, lab.base, 'from=2026-03-11')).toHaveLength(6);
    expect(await walk(subject, lab.base, 'to=2026-03-10')).toHaveLength(1);
    expect((await facetsOf(subject, lab, 'from=2026-03-10&to=2026-03-10')).total).toBe(1);
    expect((await totalsOf(subject, lab, 'groupBy=product&from=2026-03-11&to=2026-03-11')).groups.map((group) => group.key)).toEqual([b.id]);

    for (const search of ['from=2026-03-11&to=2026-03-10', 'days=30&from=2026-03-10', 'days=7&to=2026-03-10', 'from=2026-02-30']) {
      for (const path of ['operations', 'operations/facets', 'operations/totals?groupBy=product']) {
        const response = await call(subject, `${lab.base}/${path}${path.includes('?') ? '&' : '?'}${search}`);
        expect({ search, path, status: response.status }).toEqual({ search, path, status: 400 });
        expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
      }
    }
  });

  it('el responsable es quien pidió la salida; si no hubo solicitud, quien la registró', async () => {
    const { lab } = await reportLab();
    const operator = await walk(lab.adminMember.subject, lab.base, `responsibleId=${lab.operator.principalId}`);
    expect(operator.map((item) => [item.type, item.quantity]).sort()).toEqual([
      ['issue', '-0.2'],
      ['receipt', '100'],
    ]);
    const administrator = await walk(lab.adminMember.subject, lab.base, `responsibleId=${lab.adminMember.principalId}&type=issue`);
    expect(administrator.map((item) => item.quantity)).toEqual(['-0.1']);

    const facets = await facetsOf(lab.adminMember.subject, lab);
    expect(counts(facets.responsibles, (option) => option.principalId)).toEqual({
      [lab.operator.principalId]: 2,
      [lab.adminMember.principalId]: 5,
    });
    expect(facets.responsibles.map((option) => option.displayName)).toEqual(['Administradora', 'Operador']);
    const totals = await totalsOf(lab.adminMember.subject, lab, 'groupBy=responsible&type=issue');
    expect(totals.groups.map((group) => [group.key, group.label, group.rows[0]?.issues])).toEqual([
      [lab.adminMember.principalId, 'Administradora', '-0.1'],
      [lab.operator.principalId, 'Operador', '-0.2'],
    ]);
  });

  it('quien pertenece a dos espacios solo ve lo de A desde A, aunque pida un reactivo de B', async () => {
    const { lab, a, b } = await reportLab();
    const other = await reportLab();
    const shared = `shared-${uniqueSuffix()}`;
    await addMember(admin, lab.workspace.id, { subject: shared, roles: [{ role: 'admin' }] });
    await addMember(admin, other.lab.workspace.id, { subject: shared, roles: [{ role: 'admin' }] });
    const sharedFacets = await facetsOf(shared, lab, `productId=${other.a.id}`);
    expect(sharedFacets.total).toBe(0);
    expect(sharedFacets.products.options.map((option) => option.id).sort()).toEqual([a.id, b.id].sort());
    expect(sharedFacets.responsibles.map((option) => option.principalId)).not.toContain(other.lab.adminMember.principalId);
    expect(sharedFacets.locations.map((option) => option.id)).not.toContain(other.lab.storage);
    const sharedTotals = await totalsOf(shared, lab, 'groupBy=product');
    expect(sharedTotals.groups.map((group) => group.key).sort()).toEqual([a.id, b.id].sort());
    expect(await walk(shared, lab.base, `productId=${other.a.id}`)).toEqual([]);
  });

  it('cada grupo cuenta con los demás filtros; lo elegido sin resultados sigue en cero; el total cuadra con la lista', async () => {
    const { lab, a } = await reportLab();
    const subject = lab.operator.subject;
    const issues = await facetsOf(subject, lab, 'type=issue');
    expect(issues.total).toBe(2);
    // Marcar «Salidas» sigue contando los demás tipos...
    expect(counts(issues.types, (option) => option.value)).toEqual({ receipt: 2, issue: 2, adjustment: 1, transfer: 2 });
    // ...y los demás grupos ya cuentan solo salidas.
    expect(issues.products).toEqual({ options: [expect.objectContaining({ id: a.id, count: 2 })], more: false });
    expect(counts(issues.destinations, (option) => option.value)).toEqual({ 'Laboratorio 1': 1, 'Laboratorio 2': 1 });
    expect(counts(issues.reasons, (option) => option.value)).toEqual({ Práctica: 1, Docencia: 1 });
    expect(counts(issues.locations, (option) => option.id)).toEqual({ [lab.storage]: 2 });

    // Sin filtros: los grupos ordenados por conteo y luego por nombre.
    const all = await facetsOf(subject, lab);
    expect(all.total).toBe(7);
    expect(all.types.map((option) => [option.value, option.count])).toEqual([
      ['issue', 2],
      ['receipt', 2],
      ['transfer', 2],
      ['adjustment', 1],
    ]);
    expect(all.reasons.map((option) => option.value)).toEqual(['Conteo', 'Docencia', 'Práctica']);

    const empty = await facetsOf(subject, lab, `type=issue&destination=${encodeURIComponent('Sin uso')}`);
    expect(empty.total).toBe(0);
    expect(empty.destinations).toEqual([
      { value: 'Laboratorio 1', count: 1 },
      { value: 'Laboratorio 2', count: 1 },
      { value: 'Sin uso', count: 0 },
    ]);
    const unused = await facetsOf(subject, lab, `type=receipt&reason=Conteo`);
    expect(unused.reasons).toEqual([{ value: 'Conteo', count: 0 }]);
    expect(unused.types.find((option) => option.value === 'receipt')).toEqual({ value: 'receipt', count: 0 });

    // Búsqueda dentro del grupo de reactivos: por código o nombre, sin distinguir mayúsculas.
    const search = await facetsOf(subject, lab, `productQuery=${encodeURIComponent(a.code.toLowerCase())}`);
    expect(search.products.options.map((option) => option.id)).toEqual([a.id]);

    for (const filters of [
      '',
      'type=issue',
      'type=issue&type=adjustment',
      `responsibleId=${lab.operator.principalId}&type=receipt&type=issue`,
      `destination=${encodeURIComponent('Laboratorio 1')}&destination=${encodeURIComponent('Laboratorio 2')}`,
      `reason=Conteo&locationId=${lab.storage}`,
      `productId=${a.id}&days=7`,
    ]) {
      const facets = await facetsOf(subject, lab, filters);
      expect({ filters, total: facets.total }).toEqual({ filters, total: (await walk(subject, lab.base, filters)).length });
    }
  });

  it('los totales son exactos, por reactivo y unidad, y un traslado se cuenta sin sumar cantidad', async () => {
    const { lab, a, b } = await reportLab();
    const subject = lab.adminMember.subject;
    const issues = await totalsOf(subject, lab, 'groupBy=product&type=issue');
    expect(issues).toEqual({
      groupBy: 'product',
      truncated: false,
      groups: [
        {
          key: a.id,
          label: a.name,
          count: 2,
          rows: [
            {
              product: { id: a.id, code: a.code, name: a.name },
              unit: 'g',
              count: 2,
              receipts: null,
              issues: '-0.3',
              adjustments: null,
              net: '-0.3',
              transfers: 0,
            },
          ],
        },
      ],
    });

    const byProduct = await totalsOf(subject, lab, 'groupBy=product');
    expect(byProduct.groups.map((group) => [group.key, group.count, group.rows])).toEqual([
      [a.id, 4, [expect.objectContaining({ unit: 'g', receipts: '100', issues: '-0.3', adjustments: '-0.5', net: '99.2', transfers: 0 })]],
      [b.id, 3, [expect.objectContaining({ unit: 'mL', receipts: '50', issues: null, adjustments: null, net: '50', transfers: 1 })]],
    ]);
    // El neto cuadra con el saldo de los frascos.
    const positions = positionList.parse((await call(subject, `${lab.base}/positions`)).body).items;
    expect(positions.find((position) => position.product.id === a.id)?.balance).toBe('99.2');

    // Sin destino forma su propio grupo; ninguna fila mezcla reactivos ni unidades.
    const byDestination = await totalsOf(subject, lab, 'groupBy=destination');
    expect(byDestination.groups.map((group) => [group.key, group.label, group.count])).toEqual([
      [null, 'Sin destino', 5],
      ['Laboratorio 1', 'Laboratorio 1', 1],
      ['Laboratorio 2', 'Laboratorio 2', 1],
    ]);
    const unknown = byDestination.groups[0]!;
    expect(unknown.rows.map((row) => [row.product.id, row.unit, row.count, row.net, row.transfers])).toEqual([
      [b.id, 'mL', 3, '50', 1],
      [a.id, 'g', 2, '99.5', 0],
    ]);
    for (const group of [...byProduct.groups, ...byDestination.groups]) {
      expect(new Set(group.rows.map((row) => row.product.id)).size).toBe(group.rows.length);
      expect(group.rows.reduce((sum, row) => sum + row.count, 0)).toBe(group.count);
    }

    // El mes se corta en la zona del espacio: las 23:30 del 28 de febrero son febrero.
    await backdate(a.id, 'receipt', '2026-02-28T23:30:00-05:00');
    await backdate(b.id, 'receipt', '2026-03-01T00:00:00-05:00');
    const byMonth = await totalsOf(subject, lab, 'groupBy=month&type=receipt');
    expect(byMonth.groups.map((group) => [group.key, group.label, group.rows.map((row) => row.product.id)])).toEqual([
      ['2026-03', '2026-03', [b.id]],
      ['2026-02', '2026-02', [a.id]],
    ]);
  });

  it('los totales son del Administrador y del Propietario; el Operador ve los conteos, pero no los totales', async () => {
    const { lab } = await reportLab();
    const denied = await call(lab.operator.subject, `${lab.base}/operations/totals?groupBy=product`);
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    expect((await call(lab.operator.subject, `${lab.base}/operations/facets`)).status).toBe(200);
    for (const subject of [lab.adminMember.subject, lab.workspace.owner.subject]) {
      expect((await call(subject, `${lab.base}/operations/facets`)).status).toBe(200);
      expect((await call(subject, `${lab.base}/operations/totals?groupBy=month`)).status).toBe(200);
    }
    const outsider = await addMember(admin, lab.workspace.id);
    expect((await call(outsider.subject, `${lab.base}/operations/facets`)).status).toBe(403);
    expect((await call(lab.adminMember.subject, `${lab.base}/operations/totals`)).status).toBe(400);
    expect((await call(lab.adminMember.subject, `${lab.base}/operations/facets?limit=5`)).status).toBe(400);

    // La admisión de consulta sigue como hoy: en solo lectura se consulta; deshabilitado, no.
    await setModuleStatus(admin, lab.workspace.id, 'reagents', 'read_only');
    expect((await call(lab.adminMember.subject, `${lab.base}/operations/facets`)).status).toBe(200);
    expect((await call(lab.adminMember.subject, `${lab.base}/operations/totals?groupBy=product`)).status).toBe(200);
    await setModuleStatus(admin, lab.workspace.id, 'reagents', 'disabled');
    for (const path of ['operations/facets', 'operations/totals?groupBy=product']) {
      const response = await call(lab.adminMember.subject, `${lab.base}/${path}`);
      expect(response.status).toBe(403);
      expect(errorCode(response.body)).toBe('MODULE_UNAVAILABLE');
    }
  });

  it('el Resumen y la lista sin filtros nuevos devuelven lo mismo que antes', async () => {
    const { lab } = await reportLab();
    const list = operationList.parse((await call(lab.operator.subject, `${lab.base}/operations?limit=50`)).body);
    expect(list.items).toHaveLength(7);
    expect(list.items).toEqual(await walk(lab.operator.subject, lab.base));
    const summary = reagentsSummary.parse((await call(lab.operator.subject, `${lab.base}/summary`)).body);
    expect(summary.activity.map((item) => item.id)).toEqual(list.items.slice(0, 6).map((item) => item.entryId));
    expect(summary.trend?.points.reduce((sum, point) => sum + point.value, 0)).toBe(2);
  });
});

describe('R-01D · ingreso en un paso, ficha y control por peso (ADR 0015)', () => {
  const acetone = { name: 'Acetona', casNumber: '67-64-1', physicalState: 'liquid', baseUnit: 'mL', hazards: ['GHS07', 'GHS02'], controlled: true, density: '0.79' };
  const productsIn = (workspaceId: string) => count('select count(*) as n from inventory.items where workspace_id = $1', [workspaceId]);
  const auditOf = async (workspaceId: string, action: string) =>
    (
      await admin.query<{ changes: Record<string, unknown> }>(
        'select changes from core.audit_events where workspace_id = $1 and action = $2 order by occurred_at desc',
        [workspaceId, action],
      )
    ).rows;
  const ingress = (lab: Lab, body: Record<string, unknown>, subject = lab.adminMember.subject) =>
    call(subject, `${lab.base}/receipts`, { method: 'POST', body: { locationId: lab.storage, codes: freshCodes(), ...body } });
  const positionsOf = async (lab: Lab, productId: string) =>
    positionList.parse((await call(lab.adminMember.subject, `${lab.base}/positions?productId=${productId}`)).body).items;

  it('el Administrador ingresa un reactivo nuevo: código automático, lote L-001, frascos con sus códigos y auditoría', async () => {
    const lab = await createLab();
    const response = await ingress(lab, {
      newProduct: acetone,
      brand: 'Merck',
      area: 'Docencia',
      expiresOn: '2027-05-31',
      quantity: '500',
      unit: 'mL',
      codes: ['ACE-001', 'ACE-002', 'ACE-003'],
    });
    expect(response.status).toBe(201);
    const received = receiptResponse.parse(response.body);
    expect(received).toMatchObject({ product: { code: 'ACETONA', name: 'Acetona' }, lot: { code: 'L-001' }, unit: 'mL' });
    expect(received.containers.map(({ code, balance, tare }) => [code, balance, tare])).toEqual([
      ['ACE-001', '500', null],
      ['ACE-002', '500', null],
      ['ACE-003', '500', null],
    ]);
    const detail = productDetail.parse((await call(lab.operator.subject, `${lab.base}/products/${received.product.id}`)).body);
    expect(detail).toMatchObject({
      code: 'ACETONA',
      hazards: ['GHS02', 'GHS07'],
      controlled: true,
      density: '0.79',
      balance: '1500',
      containersWithStock: 3,
      unitEditable: false,
    });
    const positions = await positionsOf(lab, received.product.id);
    expect(positions.map((position) => [position.container?.code, position.product.controlled, position.lot.brand, position.lot.area])).toEqual([
      ['ACE-001', true, 'Merck', 'Docencia'],
      ['ACE-002', true, 'Merck', 'Docencia'],
      ['ACE-003', true, 'Merck', 'Docencia'],
    ]);
    expect(await auditOf(lab.workspace.id, 'reagents.product.create')).toHaveLength(1);
    const [receiptAudit] = await auditOf(lab.workspace.id, 'reagents.receipt.create');
    expect(receiptAudit?.changes).toMatchObject({ productId: received.product.id, lotId: received.lot.id });
  });

  it('repetir con la misma clave un ingreso que crea el reactivo no lo duplica ni añade movimientos', async () => {
    const lab = await createLab();
    const products = await productsIn(lab.workspace.id);
    const body = { locationId: lab.storage, codes: freshCodes(), newProduct: acetone, quantity: '500', unit: 'mL' };
    const key = `ingreso-nuevo-${uniqueSuffix()}`;
    const send = () => call(lab.adminMember.subject, `${lab.base}/receipts`, { method: 'POST', body, key });

    const first = await send();
    expect(first.status).toBe(201);
    expect(await send()).toEqual(first);
    expect(await productsIn(lab.workspace.id)).toBe(products + 1);
    expect(await operationsIn(lab.workspace.id)).toBe(1);
  });

  it('el Operador no crea reactivos desde el ingreso; con uno del catálogo, sí ingresa', async () => {
    const lab = await createLab();
    const before = await productsIn(lab.workspace.id);
    const denied = await ingress(lab, { newProduct: acetone, quantity: '1', unit: 'mL' }, lab.operator.subject);
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    expect(await productsIn(lab.workspace.id)).toBe(before);
    expect(await operationsIn(lab.workspace.id)).toBe(0);
    const product = await createProduct(lab);
    expect((await ingress(lab, { productId: product.id, quantity: '1', unit: 'g' }, lab.operator.subject)).status).toBe(201);
  });

  it('un código de frasco ya usado en el espacio, en cualquier mayúscula, responde CODE_TAKEN sin dejar nada', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    expect((await ingress(lab, { productId: product.id, quantity: '1', unit: 'g', codes: ['NAC-001'] })).status).toBe(201);
    const operations = await operationsIn(lab.workspace.id);
    const lots = await count('select count(*) as n from inventory.lots where workspace_id = $1', [lab.workspace.id]);
    const taken = await ingress(lab, { newProduct: { ...acetone, name: 'Otro' }, quantity: '1', unit: 'mL', codes: ['NAC-009', 'nac-001'] });
    expect(taken.status).toBe(409);
    expect(errorCode(taken.body)).toBe('CODE_TAKEN');
    expect(errorResponse.parse(taken.body).error.message).toBe('El código nac-001 ya existe en el espacio');
    expect(await operationsIn(lab.workspace.id)).toBe(operations);
    expect(await count('select count(*) as n from inventory.lots where workspace_id = $1', [lab.workspace.id])).toBe(lots);
    expect(await productsIn(lab.workspace.id)).toBe(1);
    // El mismo código en otro espacio no choca.
    const other = await createLab();
    const otherProduct = await createProduct(other);
    expect((await ingress(other, { productId: otherProduct.id, quantity: '1', unit: 'g', codes: ['NAC-001'] })).status).toBe(201);
  });

  it('la tara se calcula exacta: volumen con densidad, masa en kg; sin densidad o con tara ≤ 0 se rechaza', async () => {
    const lab = await createLab();
    const acid = { name: 'Ácido clorhídrico 37 %', casNumber: '7647-01-0', physicalState: 'liquid', baseUnit: 'L' };
    const liters = await ingress(lab, { newProduct: acid, quantity: '2.5', unit: 'L', weight: { grossWeight: '3395.0', density: '1.19' } });
    expect(liters.status).toBe(201);
    const litersReceipt = receiptResponse.parse(liters.body);
    expect(litersReceipt.containers[0]?.tare).toBe('420');
    expect((await positionsOf(lab, litersReceipt.product.id))[0]?.container).toMatchObject({ tare: '420', density: '1.19' });

    const kilos = await ingress(lab, {
      newProduct: { name: 'Cloruro de sodio', casNumber: '7647-14-5', physicalState: 'solid', baseUnit: 'kg' },
      quantity: '1',
      unit: 'kg',
      weight: { grossWeight: '1180.5', density: '2' },
    });
    const kilosReceipt = receiptResponse.parse(kilos.body);
    expect(kilosReceipt.containers[0]?.tare).toBe('180.5');
    expect((await positionsOf(lab, kilosReceipt.product.id))[0]?.container).toMatchObject({ tare: '180.5', density: null });

    // Sin densidad enviada, la del reactivo.
    const withProductDensity = await ingress(lab, { newProduct: acetone, quantity: '500', unit: 'mL', weight: { grossWeight: '530' } });
    expect(receiptResponse.parse(withProductDensity.body).containers[0]?.tare).toBe('135');

    const operations = await operationsIn(lab.workspace.id);
    const noDensity = await ingress(lab, { productId: litersReceipt.product.id, quantity: '1', unit: 'L', weight: { grossWeight: '2000' } });
    expect(noDensity.status).toBe(400);
    expect(errorResponse.parse(noDensity.body).error.message).toBe('Indica la densidad para calcular la tara');
    const zeroTare = await ingress(lab, { productId: litersReceipt.product.id, quantity: '2.5', unit: 'L', weight: { grossWeight: '2975', density: '1.19' } });
    expect(zeroTare.status).toBe(400);
    expect(await operationsIn(lab.workspace.id)).toBe(operations);
  });

  it('el ajuste por peso deja el saldo de la balanza en centésimas, con motivo «Pesada»; los casos inválidos no escriben', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const weighed = receiptResponse.parse((await receive(lab, product.id, '1000', lab.storage, lab.operator.subject, { weight: { grossWeight: '1140' } })).body);
    const positionId = weighed.containers[0]!.positionId;
    const byWeight = (grossWeight: string, subject = lab.adminMember.subject, id = positionId) =>
      call(subject, `${lab.base}/adjustments/by-weight`, { method: 'POST', body: { positionId: id, grossWeight } });

    const adjusted = await byWeight('1000.456');
    expect(adjusted.status).toBe(201);
    expect(movementResponse.parse(adjusted.body)).toMatchObject({ type: 'adjustment', appliedQuantity: '-139.54', balance: '860.46' });
    const [entry] = operationList.parse((await call(lab.adminMember.subject, `${lab.base}/operations?type=adjustment`)).body).items;
    expect(entry).toMatchObject({ reason: 'Pesada', reference: 'Peso en balanza: 1000.456 g' });

    const operations = await operationsIn(lab.workspace.id);
    const expectFailure = async (response: { status: number; body: unknown }, status: number, code: string, message?: string) => {
      expect(response.status).toBe(status);
      expect(errorCode(response.body)).toBe(code);
      if (message) expect(errorResponse.parse(response.body).error.message).toBe(message);
    };
    await expectFailure(await byWeight('1000.46'), 400, 'VALIDATION_FAILED', 'El saldo ya coincide con el peso');
    await expectFailure(await byWeight('139.99'), 400, 'VALIDATION_FAILED', 'El peso es menor que la tara');
    await expectFailure(await byWeight('900', lab.operator.subject), 403, 'ACCESS_DENIED');
    const untared = receivedPosition(await receive(lab, product.id, '10'));
    await expectFailure(await byWeight('500', lab.adminMember.subject, untared), 400, 'VALIDATION_FAILED');
    // Lo apartado por una solicitud no se ajusta por debajo.
    const pending = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId, quantity: '800', unit: 'g', reason: 'Práctica', destination: 'Lab' },
    });
    expect(issueResponse.parse(pending.body).status).toBe('pending');
    await expectFailure(await byWeight('900'), 409, 'INSUFFICIENT_STOCK');
    expect(await operationsIn(lab.workspace.id)).toBe(operations + 1);
  });

  it('fijar la tara usa el saldo actual, la densidad de reserva y audita los valores anteriores', async () => {
    const lab = await createLab();
    const created = receiptResponse.parse((await ingress(lab, { newProduct: acetone, quantity: '500', unit: 'mL' })).body);
    const containerId = created.containers[0]!.containerId;
    const setTare = (body: Record<string, unknown>, subject = lab.adminMember.subject, id = containerId) =>
      call(subject, `${lab.base}/containers/${id}/tare`, { method: 'PUT', body });

    // Sin densidad enviada ni en el frasco: la del reactivo (0.79).
    const first = await setTare({ grossWeight: '530' });
    expect(first.status).toBe(200);
    expect(tareResponse.parse(first.body)).toEqual({ containerId, tare: '135', density: '0.79' });
    // Con densidad enviada, reemplaza la tara y la densidad.
    expect(tareResponse.parse((await setTare({ grossWeight: '530', density: '0.8' })).body)).toEqual({ containerId, tare: '130', density: '0.8' });
    // Sin densidad enviada: la del frasco (0.8), no la del reactivo.
    expect(tareResponse.parse((await setTare({ grossWeight: '540' })).body)).toEqual({ containerId, tare: '140', density: '0.8' });
    const [audit] = await auditOf(lab.workspace.id, 'reagents.container.tare');
    expect(audit?.changes).toMatchObject({ tare: { from: '130', to: '140' }, density: { from: '0.8', to: '0.8' } });

    // Con saldo cero, la tara es el peso.
    const emptied = await call(lab.adminMember.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId: created.containers[0]!.positionId, quantity: '500', unit: 'mL', reason: 'Práctica', destination: 'Lab' },
    });
    expect(emptied.status).toBe(201);
    expect(tareResponse.parse((await setTare({ grossWeight: '133.5' })).body).tare).toBe('133.5');

    expect((await setTare({ grossWeight: '100' }, lab.operator.subject)).status).toBe(403);
    expect((await setTare({ grossWeight: '100' }, lab.adminMember.subject, randomUUID())).status).toBe(404);
    // En volumen sin ninguna densidad, y con tara ≤ 0, se rechaza.
    const plain = await createProduct(lab, 'mL', 'Agua destilada');
    const water = receiptResponse.parse((await receive(lab, plain.id, '100', lab.storage, lab.operator.subject, { unit: 'mL' })).body);
    expect((await setTare({ grossWeight: '200' }, lab.adminMember.subject, water.containers[0]!.containerId)).status).toBe(400);
    expect((await setTare({ grossWeight: '79', density: '0.8' }, lab.adminMember.subject, water.containers[0]!.containerId)).status).toBe(400);
  });

  it('la ficha se edita por partes; la unidad no cambia con movimientos y el Operador no edita', async () => {
    const lab = await createLab();
    const product = await createProduct(lab, 'g', 'Sulfato de cobre');
    const patch = (body: Record<string, unknown>, subject = lab.adminMember.subject, id = product.id) =>
      call(subject, `${lab.base}/products/${id}`, { method: 'PATCH', body });

    const edited = await patch({ hazards: ['GHS09', 'GHS05'], controlled: true, sdsKind: 'digital', sdsUrl: 'https://ejemplo.org/sds.pdf' });
    expect(edited.status).toBe(200);
    expect(productContract.parse(edited.body)).toMatchObject({ code: product.code, hazards: ['GHS05', 'GHS09'], controlled: true, sdsKind: 'digital' });
    const [audit] = await auditOf(lab.workspace.id, 'reagents.product.update');
    expect(audit?.changes).toEqual({
      hazards: { from: [], to: ['GHS05', 'GHS09'] },
      controlled: { from: false, to: true },
      sdsKind: { from: null, to: 'digital' },
      sdsUrl: { from: null, to: 'https://ejemplo.org/sds.pdf' },
    });

    // Sin movimientos la unidad cambia; el enlace sin ficha digital y el CAS ausente fuera de una mezcla, no.
    expect(productDetail.parse((await call(lab.adminMember.subject, `${lab.base}/products/${product.id}`)).body).unitEditable).toBe(true);
    expect((await patch({ baseUnit: 'kg' })).status).toBe(200);
    expect((await patch({ sdsKind: 'physical' })).status).toBe(400);
    expect((await patch({ casNumber: null })).status).toBe(400);
    expect((await patch({ casNumber: null, physicalState: 'mixture' })).status).toBe(200);
    expect((await patch({})).status).toBe(400);

    expect((await receive(lab, product.id, '1', lab.storage, lab.operator.subject, { unit: 'kg' })).status).toBe(201);
    expect(productDetail.parse((await call(lab.adminMember.subject, `${lab.base}/products/${product.id}`)).body).unitEditable).toBe(false);
    const unit = await patch({ baseUnit: 'g' });
    expect(unit.status).toBe(400);
    expect(errorCode(unit.body)).toBe('VALIDATION_FAILED');
    expect((await patch({ name: 'Sulfato de cobre pentahidratado' })).status).toBe(200);

    const denied = await patch({ controlled: false }, lab.operator.subject);
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    const other = await createLab();
    expect((await patch({ controlled: false }, lab.adminMember.subject, (await createProduct(other)).id)).status).toBe(404);
  });

  it('sugiere la serie del reactivo, una a partir del nombre y salta los códigos ocupados', async () => {
    const lab = await createLab();
    const suggest = async (query: string, subject = lab.operator.subject) => {
      const response = await call(subject, `${lab.base}/container-codes/suggestion?${query}`);
      return { status: response.status, codes: response.status === 200 ? containerCodeSuggestion.parse(response.body).codes : [] };
    };
    const product = await createProduct(lab);
    expect((await suggest(`productId=${product.id}&count=2`)).codes).toEqual(['CLO-001', 'CLO-002']);
    expect((await suggest('name=Acetona')).codes).toEqual(['ACE-001']);

    await receive(lab, product.id, '1', lab.storage, lab.operator.subject, { codes: ['AC-BIO-001'] });
    expect((await suggest(`productId=${product.id}&count=2`)).codes).toEqual(['AC-BIO-002', 'AC-BIO-003']);
    // Otro reactivo ocupa AC-BIO-003: la serie salta hasta la primera libre.
    const other = await createProduct(lab, 'g', 'Otro');
    await receive(lab, other.id, '1', lab.storage, lab.operator.subject, { codes: ['ac-bio-003'] });
    expect((await suggest(`productId=${product.id}&count=2`)).codes).toEqual(['AC-BIO-004', 'AC-BIO-005']);

    expect((await suggest('count=2')).status).toBe(400);
    const foreign = await createProduct(await createLab());
    expect((await suggest(`productId=${foreign.id}`)).status).toBe(404);
  });

  it('crea ubicaciones en tres niveles con su tipo; la repetida devuelve la misma y nadie más las crea', async () => {
    const lab = await createLab();
    const create = (body: Record<string, unknown>, subject = lab.adminMember.subject) =>
      call(subject, `${lab.base}/locations`, { method: 'POST', body });
    const created = async (body: Record<string, unknown>) => {
      const response = await create(body);
      expect(response.status).toBe(201);
      return location.parse(response.body);
    };
    const room = await created({ name: 'Bodega química', parentId: null });
    expect(room).toMatchObject({ code: 'BODEGA-QUIMICA', kind: 'room', parentId: null });
    const shelf = await created({ name: 'Estante A', parentId: room.id });
    expect(shelf).toMatchObject({ code: 'ESTANTE-A', kind: 'storage', parentId: room.id });
    const level = await created({ name: 'Nivel 1', parentId: shelf.id });
    expect(level).toMatchObject({ code: 'NIVEL-1', kind: 'storage', parentId: shelf.id });
    // Bajo la sede del laboratorio, una sala; repetida sin distinguir mayúsculas, la misma.
    const site = (await admin.query<{ parent_id: string }>('select parent_id from core.locations where id = $1', [lab.storage])).rows[0]!.parent_id;
    expect(await created({ name: 'Sala 2', parentId: site })).toMatchObject({ kind: 'room' });
    expect((await created({ name: 'estante a', parentId: room.id })).id).toBe(shelf.id);
    // El mismo nombre bajo otro padre es otra ubicación, con otro código.
    expect(await created({ name: 'Estante A', parentId: level.id })).toMatchObject({ code: 'ESTANTE-A-2' });

    const denied = await create({ name: 'Del Operador', parentId: null }, lab.operator.subject);
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    const foreign = await createLab();
    expect((await create({ name: 'Cruzada', parentId: foreign.storage })).status).toBe(404);
    const custody = await addLocation(admin, lab.workspace.id, { kind: 'custody' });
    expect((await create({ name: 'Dentro', parentId: custody })).status).toBe(400);
    // La nueva ubicación sirve para el ingreso y llega con su padre.
    const locations = locationList.parse((await call(lab.adminMember.subject, `${lab.base}/receipt-locations`)).body);
    expect(locations.items.find((item) => item.id === level.id)).toMatchObject({ parentId: shelf.id });
  });

  it('cada posición trae la ruta de su ubicación desde el primer nivel bajo la sede', async () => {
    const lab = await createLab();
    const created = async (name: string, parentId: string) => {
      const response = await call(lab.adminMember.subject, `${lab.base}/locations`, { method: 'POST', body: { name, parentId } });
      expect(response.status).toBe(201);
      return location.parse(response.body).id;
    };
    const site = (await admin.query<{ parent_id: string }>('select parent_id from core.locations where id = $1', [lab.storage])).rows[0]!.parent_id;
    const room = await created('Lab', site);
    const level = await created('Nivel', await created('Estante', room));
    const product = await createProduct(lab);
    const inLevel = receivedPosition(await receive(lab, product.id, '1', level, lab.adminMember.subject));
    const inRoom = receivedPosition(await receive(lab, product.id, '1', room, lab.adminMember.subject));

    const positions = positionList.parse((await call(lab.adminMember.subject, `${lab.base}/positions`)).body).items;
    const pathOf = (id: string) => positions.find((position) => position.id === id)?.location.path;
    expect(pathOf(inLevel)).toEqual(['Lab', 'Estante', 'Nivel']);
    expect(pathOf(inRoom)).toEqual(['Lab']);
  });

  it('las áreas se administran como los destinos y las marcas usadas se sugieren, recientes primero', async () => {
    const lab = await createLab();
    const area = await call(lab.adminMember.subject, `${lab.base}/areas`, { method: 'POST', body: { name: 'Investigación' } });
    expect(area.status).toBe(201);
    const entry = entryList.shape.items.element.parse(area.body);
    const again = await call(lab.adminMember.subject, `${lab.base}/areas`, { method: 'POST', body: { name: 'investigación' } });
    expect(entryList.shape.items.element.parse(again.body).id).toBe(entry.id);
    expect((await call(lab.operator.subject, `${lab.base}/areas`, { method: 'POST', body: { name: 'Docencia' } })).status).toBe(403);
    expect(entryList.parse((await call(lab.operator.subject, `${lab.base}/areas`)).body).items).toEqual([entry]);
    expect((await call(lab.adminMember.subject, `${lab.base}/areas/${entry.id}/archive`, { method: 'POST' })).status).toBe(200);
    expect(entryList.parse((await call(lab.operator.subject, `${lab.base}/areas`)).body).items).toEqual([]);

    const product = await createProduct(lab);
    for (const brand of ['Merck', 'Sigma', 'merck']) {
      expect((await receive(lab, product.id, '1', lab.storage, lab.operator.subject, { brand })).status).toBe(201);
    }
    const brands = brandList.parse((await call(lab.operator.subject, `${lab.base}/brands`)).body);
    expect(brands.items).toEqual(['merck', 'Sigma']);
  });
});

describe('mejoras pequeñas (ADR 0016)', () => {
  it('las posiciones traen la ficha de seguridad: digital con enlace, solo en físico o sin indicar', async () => {
    const lab = await createLab();
    const create = async (name: string, casNumber: string, safety: Record<string, unknown>) => {
      const created = await call(lab.adminMember.subject, `${lab.base}/products`, {
        method: 'POST',
        body: { name, casNumber, physicalState: 'solid', baseUnit: 'g', ...safety },
      });
      expect(created.status).toBe(201);
      const product = productContract.parse(created.body);
      expect((await receive(lab, product.id, '10', lab.storage, lab.adminMember.subject)).status).toBe(201);
      const [position] = positionList.parse(
        (await call(lab.operator.subject, `${lab.base}/positions?productId=${product.id}`)).body,
      ).items;
      return position!.product;
    };
    expect(await create('Ficha digital', '7647-14-5', { sdsKind: 'digital', sdsUrl: 'https://ejemplo.org/sds.pdf' })).toMatchObject({
      sdsKind: 'digital',
      sdsUrl: 'https://ejemplo.org/sds.pdf',
      controlled: false,
    });
    expect(await create('Ficha en papel', '7757-82-6', { sdsKind: 'physical', controlled: true })).toMatchObject({
      sdsKind: 'physical',
      sdsUrl: null,
      controlled: true,
    });
    expect(await create('Ficha sin indicar', '1310-73-2', {})).toMatchObject({ sdsKind: null, sdsUrl: null, controlled: false });
  });

  it('el historial trae la ruta de la ubicación: anidada en 3 niveles bajo la sede, o la sede sola', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const nameOf = async (id: string) =>
      (await admin.query<{ name: string; parent_id: string | null }>('select name, parent_id from core.locations where id = $1', [id]))
        .rows[0]!;
    const site = (await nameOf(lab.storage)).parent_id!;
    const room = await addLocation(admin, lab.workspace.id, { kind: 'room', parentId: site });
    const cabinet = await addLocation(admin, lab.workspace.id, { kind: 'storage', parentId: room });
    const shelf = await addLocation(admin, lab.workspace.id, { kind: 'storage', parentId: cabinet });
    expect((await receive(lab, product.id, '10', shelf, lab.adminMember.subject)).status).toBe(201);
    expect((await receive(lab, product.id, '20', site, lab.adminMember.subject)).status).toBe(201);

    const history = operationList.parse(
      (await call(lab.operator.subject, `${lab.base}/operations?type=receipt&limit=100`)).body,
    ).items;
    const locationOf = (quantity: string) => history.find((entry) => entry.quantity === quantity)!.location;
    const [siteName, roomName, cabinetName, shelfName] = await Promise.all(
      [site, room, cabinet, shelf].map(async (id) => (await nameOf(id)).name),
    );
    expect(locationOf('10')).toEqual({
      code: shelfName,
      name: shelfName,
      path: [roomName, cabinetName, shelfName],
    });
    expect(locationOf('20')).toEqual({ code: siteName, name: siteName, path: [siteName] });
  });

  it('el ingreso ya no acepta referencia: el esquema estricto la rechaza sin registrar nada', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const before = await operationsIn(lab.workspace.id);
    const response = await receive(lab, product.id, '10', lab.storage, lab.adminMember.subject, { reference: 'Factura 12' });
    expect(response.status).toBe(400);
    expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
    expect(await operationsIn(lab.workspace.id)).toBe(before);
  });
});

describe('R-01B · ficha de seguridad en PDF (ADR 0017)', () => {
  const pdf = (text: string) => Buffer.from(`%PDF-1.4\n% ${text}\n%%EOF\n`, 'latin1');
  const upload = async (subject: string, url: string, file: Buffer, key?: string) => {
    const response = await app.inject({
      method: 'PUT',
      url: `/v1${url}/safety-sheet`,
      headers: {
        authorization: `Bearer ${await signer.sign(subject)}`,
        'content-type': 'application/pdf',
        ...(key ? { 'idempotency-key': key } : {}),
      },
      payload: file,
    });
    return { status: response.statusCode, body: response.json() as unknown };
  };
  const sheetsOf = (productId: string) =>
    count('select count(*) as n from reagents.safety_sheets where product_id = $1', [productId]);
  const download = async (url: string) => Buffer.from(await (await fetch(url)).arrayBuffer());

  it('el Administrador sube el PDF: queda vigente con enlace público y una ficha nueva no sobrescribe la anterior', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const productUrl = `${lab.base}/products/${product.id}`;
    await call(lab.adminMember.subject, productUrl, { method: 'PATCH', body: { sdsKind: 'digital', sdsUrl: 'https://ejemplo.org/sds.pdf' } });

    const first = await upload(lab.adminMember.subject, productUrl, pdf('primera'));
    expect(first.status).toBe(200);
    const uploaded = productContract.parse(first.body);
    // El PDF reemplaza al enlace: hay una sola ficha vigente.
    expect(uploaded).toMatchObject({ sdsKind: 'digital', sdsUrl: null });
    expect(uploaded.sdsFileUrl).toContain(`/public-files/${lab.workspace.id}/sds/`);
    expect((await download(uploaded.sdsFileUrl!)).toString('latin1')).toContain('primera');

    const second = productContract.parse((await upload(lab.adminMember.subject, productUrl, pdf('segunda'))).body);
    expect(second.sdsFileUrl).not.toBe(uploaded.sdsFileUrl);
    expect((await download(uploaded.sdsFileUrl!)).toString('latin1')).toContain('primera');
    expect(await sheetsOf(product.id)).toBe(2);

    // La ficha, la lista y las posiciones leen el PDF vigente.
    expect(productDetail.parse((await call(lab.operator.subject, productUrl)).body).sdsFileUrl).toBe(second.sdsFileUrl);
    expect((await receive(lab, product.id, '10')).status).toBe(201);
    const [position] = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions?productId=${product.id}`)).body).items;
    expect(position?.product).toMatchObject({ sdsKind: 'digital', sdsUrl: null, sdsFileUrl: second.sdsFileUrl });

    const [audit] = await admin.query<{ changes: Record<string, unknown> }>(
      `select changes from core.audit_events where workspace_id = $1 and action = 'reagents.product.safety_sheet'
        order by occurred_at desc limit 1`,
      [lab.workspace.id],
    ).then((result) => result.rows);
    expect(audit?.changes).toMatchObject({ sdsFileUrl: { from: uploaded.sdsFileUrl, to: second.sdsFileUrl } });
  });

  it('el formulario reenvía el enlace vacío y el PDF sigue; un enlace o «física» lo reemplazan y queda en el historial', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const productUrl = `${lab.base}/products/${product.id}`;
    const patch = (body: Record<string, unknown>) =>
      call(lab.adminMember.subject, productUrl, { method: 'PATCH', body }).then((response) => productContract.parse(response.body));
    const { sdsFileUrl } = productContract.parse((await upload(lab.adminMember.subject, productUrl, pdf('vigente'))).body);

    expect(await patch({ controlled: true, sdsKind: 'digital', sdsUrl: null })).toMatchObject({ sdsFileUrl, controlled: true });
    expect(await patch({ sdsKind: 'digital', sdsUrl: 'https://ejemplo.org/sds.pdf' })).toMatchObject({
      sdsUrl: 'https://ejemplo.org/sds.pdf',
      sdsFileUrl: null,
    });
    await upload(lab.adminMember.subject, productUrl, pdf('otra'));
    expect(await patch({ sdsKind: 'physical', sdsUrl: null })).toMatchObject({ sdsKind: 'physical', sdsUrl: null, sdsFileUrl: null });
    expect(await sheetsOf(product.id)).toBe(2);
  });

  it('solo PDF de hasta 6 MiB, del catálogo del espacio y con el permiso de catálogo; nada de eso deja fichas', async () => {
    const lab = await createLab();
    const other = await createLab();
    const product = await createProduct(lab);
    const foreign = await createProduct(other);
    const productUrl = `${lab.base}/products/${product.id}`;

    expect((await upload(lab.adminMember.subject, productUrl, Buffer.from('<html>no es un pdf</html>'))).status).toBe(400);
    const tooLarge = Buffer.concat([pdf('grande'), Buffer.alloc(6 * 1024 * 1024)]);
    expect((await upload(lab.adminMember.subject, productUrl, tooLarge)).status).toBe(400);
    const denied = await upload(lab.operator.subject, productUrl, pdf('operador'));
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    expect((await upload(lab.adminMember.subject, `${lab.base}/products/${foreign.id}`, pdf('ajeno'))).status).toBe(404);
    expect(await sheetsOf(product.id)).toBe(0);
    expect(await sheetsOf(foreign.id)).toBe(0);
  });

  it('repetir con la misma clave devuelve la misma ficha; la misma clave con otro PDF se rechaza', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const productUrl = `${lab.base}/products/${product.id}`;
    const key = randomUUID();

    const first = await upload(lab.adminMember.subject, productUrl, pdf('una'), key);
    const retry = await upload(lab.adminMember.subject, productUrl, pdf('una'), key);
    expect(retry.status).toBe(200);
    expect(productContract.parse(retry.body).sdsFileUrl).toBe(productContract.parse(first.body).sdsFileUrl);
    const reused = await upload(lab.adminMember.subject, productUrl, pdf('otra'), key);
    expect(reused.status).toBe(422);
    expect(errorCode(reused.body)).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await sheetsOf(product.id)).toBe(1);
  });
});
