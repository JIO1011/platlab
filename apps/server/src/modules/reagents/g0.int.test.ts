import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  errorResponse,
  homeResponse,
  issueResponse,
  location,
  locationList,
  movementResponse,
  operationList,
  positionList,
  productList,
  reagentsSummary,
  receiptResponse,
} from '@platlab/contracts';
import { addMember, seedWorkspace, setModuleStatus, uniqueSuffix } from '../../testing/core-fixtures.js';
import {
  admin,
  call,
  errorCode,
  type Lab,
  createLab,
  createProduct,
  freshCodes,
  receive,
  receivedPosition,
  count,
  operationsIn,
  auditsIn,
} from './reagents.fixtures.js';

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

  it('de dos altas simultáneas de la misma ubicación, una la crea y la otra responde NAME_TAKEN', async () => {
    const lab = await createLab();
    const create = () =>
      call(lab.adminMember.subject, `/workspaces/${lab.workspace.id}/locations`, { method: 'POST', body: { name: 'Bodega norte', parentId: null } });
    const results = await Promise.all([create(), create()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const created = results.find((r) => r.status === 201)!;
    const taken = results.find((r) => r.status === 409)!;
    expect(location.parse(created.body).name).toBe('Bodega norte');
    expect(errorCode(taken.body)).toBe('NAME_TAKEN');
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
