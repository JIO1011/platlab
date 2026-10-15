import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  errorResponse,
  locationList,
  operationList,
  positionList,
  product as productContract,
  productList,
} from '@platlab/contracts';
import {
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
