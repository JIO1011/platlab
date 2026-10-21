import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  errorResponse,
  issueResponse,
  location,
  locationList,
  movementResponse,
  operationList,
  positionList,
  product as productContract,
  productDetail,
  tareResponse,
  containerCodeSuggestion,
  brandList,
  receiptResponse,
  departmentList,
} from '@platlab/contracts';
import { addLocation, uniqueSuffix } from '../../testing/core-fixtures.js';
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
  createDepartment,
  operationsIn,
} from './reagents.fixtures.js';

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
    const docencia = await createDepartment(lab, 'Docencia');
    const response = await ingress(lab, {
      newProduct: acetone,
      brand: 'Merck',
      departmentId: docencia.id,
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
    expect(positions.map((position) => [position.container?.code, position.product.controlled, position.lot.brand, position.lot.department?.name])).toEqual([
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

  it('crea ubicaciones del Núcleo en tres niveles con su tipo; la repetida responde NAME_TAKEN y nadie más las crea', async () => {
    const lab = await createLab();
    const create = (body: Record<string, unknown>, subject = lab.adminMember.subject) =>
      call(subject, `/workspaces/${lab.workspace.id}/locations`, { method: 'POST', body });
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
    // Bajo la sede del laboratorio, una sala; repetida sin distinguir tildes ni mayúsculas, NAME_TAKEN.
    const site = (await admin.query<{ parent_id: string }>('select parent_id from core.locations where id = $1', [lab.storage])).rows[0]!.parent_id;
    expect(await created({ name: 'Sala 2', parentId: site })).toMatchObject({ kind: 'room' });
    const repeated = await create({ name: 'estánte a', parentId: room.id });
    expect(repeated.status).toBe(409);
    expect(errorCode(repeated.body)).toBe('NAME_TAKEN');
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
      const response = await call(lab.adminMember.subject, `/workspaces/${lab.workspace.id}/locations`, { method: 'POST', body: { name, parentId } });
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

  it('el ingreso enlaza un departamento activo del espacio; uno archivado o de otro espacio se rechaza', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const research = await createDepartment(lab, 'Investigación');
    const received = await receive(lab, product.id, '1', lab.storage, lab.operator.subject, { departmentId: research.id });
    expect(received.status).toBe(201);
    const lotOf = (positionId: string) => admin.query<{ department_id: string | null }>(
      'select l.department_id from inventory.positions as p join inventory.lots as l on l.id = p.lot_id where p.id = $1',
      [positionId],
    );
    expect((await lotOf(receivedPosition(received))).rows[0]?.department_id).toBe(research.id);

    const operations = await operationsIn(lab.workspace.id);
    const foreign = await createDepartment(await createLab(), 'Ajeno');
    const crossed = await receive(lab, product.id, '1', lab.storage, lab.operator.subject, { departmentId: foreign.id });
    expect(crossed.status).toBe(400);
    expect(errorCode(crossed.body)).toBe('VALIDATION_FAILED');
    const archive = await call(lab.adminMember.subject, `/workspaces/${lab.workspace.id}/departments/${research.id}/archive`, { method: 'POST' });
    expect(archive.status).toBe(200);
    const archived = await receive(lab, product.id, '1', lab.storage, lab.operator.subject, { departmentId: research.id });
    expect(archived.status).toBe(400);
    expect(errorCode(archived.body)).toBe('VALIDATION_FAILED');
    expect(await operationsIn(lab.workspace.id)).toBe(operations);
    // El lote ya enlazado lo conserva; la lista deja de ofrecerlo.
    expect((await lotOf(receivedPosition(received))).rows[0]?.department_id).toBe(research.id);
    expect(departmentList.parse((await call(lab.operator.subject, `/workspaces/${lab.workspace.id}/departments`)).body).items).toEqual([]);
  });

  it('las marcas usadas se sugieren, recientes primero', async () => {
    const lab = await createLab();

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
