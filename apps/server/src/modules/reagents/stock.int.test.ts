import { describe, expect, it } from 'vitest';
import {
  issueResponse,
  locationList,
  operationList,
  positionList,
  productList,
  reagentsSummary,
  receiptResponse,
  containerResponse,
  countResponse,
  transferResponse,
} from '@platlab/contracts';
import { addMember } from '../../testing/core-fixtures.js';
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
} from './reagents.fixtures.js';

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
