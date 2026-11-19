import { beforeAll, describe, expect, it } from 'vitest';
import { locationList, materialAreaList, materialDetail, materialsDashboard, materialList, materialMovementResponse, materialsSummary, materialStockList } from '@platlab/contracts';
import {
  admin,
  call,
  count,
  createMaterial,
  createMaterialsLab,
  errorCode,
  lend,
  receive,
  receivedPosition,
  reusableWithStock,
  stockOf,
  type MaterialsLab,
} from './materials.fixtures.js';

/** MA-01a (ADR 0025): catálogo, ingreso, salida y ajuste de Materiales por la API. */

let lab: MaterialsLab;
let other: MaterialsLab;

beforeAll(async () => {
  lab = await createMaterialsLab();
  other = await createMaterialsLab();
});

describe('catálogo', () => {
  it('el Administrador crea con código automático; el Operador y el Docente no', async () => {
    const material = await createMaterial(lab, { name: 'Puntas de pipeta 200 µL' });
    expect(material.code).toMatch(/^[A-Z0-9]/);
    expect(material.class).toBe('consumable');
    const denied = await call(lab.operator.subject, `${lab.base}/products`, {
      method: 'POST',
      body: { name: 'Otro', class: 'consumable' },
    });
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    expect((await call(lab.teacher.subject, `${lab.base}/products`)).status).toBe(403);
  });

  it('un nombre activo no se repite sin tildes ni mayúsculas', async () => {
    const material = await createMaterial(lab, { name: 'Papel filtro cualitativo' });
    const repeated = await call(lab.adminMember.subject, `${lab.base}/products`, {
      method: 'POST',
      body: { name: ` ${material.name.replace('í', 'i').toUpperCase()} `, class: 'consumable' },
    });
    expect(repeated.status).toBe(409);
    expect(errorCode(repeated.body)).toBe('NAME_TAKEN');
  });

  it('un reutilizable se cuenta en piezas; un consumible admite otras unidades', async () => {
    const bad = await call(lab.adminMember.subject, `${lab.base}/products`, {
      method: 'POST',
      body: { name: 'Vasos de precipitados', class: 'reusable_counted', baseUnit: 'kg' },
    });
    expect(bad.status).toBe(400);
    const reusable = await createMaterial(lab, { name: 'Vasos de precipitados 250 mL', class: 'reusable_counted' });
    expect(reusable.baseUnit).toBe('u');
    const cotton = await createMaterial(lab, { name: 'Algodón', baseUnit: 'g' });
    expect(cotton.baseUnit).toBe('g');
  });

  it('un insumo se cuenta en la unidad con que se entrega (cajas, metros) y se mueve en ella (MA-01g)', async () => {
    const gloves = await createMaterial(lab, { name: 'Guantes de látex S (caja ×100)', baseUnit: 'caja' });
    const receipt = await call(lab.operator.subject, `${lab.base}/receipts`, {
      method: 'POST',
      body: { productId: gloves.id, locationId: lab.shelf, quantity: '4', unit: 'caja' },
    });
    expect(receipt.status).toBe(201);
    expect(materialMovementResponse.parse(receipt.body)).toMatchObject({ balance: '4', unit: 'caja' });
    // Sin conversión: otra unidad de conteo no se acepta.
    const inUnits = await call(lab.operator.subject, `${lab.base}/receipts`, {
      method: 'POST',
      body: { productId: gloves.id, locationId: lab.shelf, quantity: '100', unit: 'u' },
    });
    expect(inUnits.status).toBe(400);
    expect((await createMaterial(lab, { name: 'Alambre de ortodoncia #7', baseUnit: 'm' })).baseUnit).toBe('m');
    const box = await call(lab.adminMember.subject, `${lab.base}/products`, {
      method: 'POST',
      body: { name: 'Pinzas en caja', class: 'reusable_counted', baseUnit: 'caja' },
    });
    expect(box.status).toBe(400);
  });

  it('edita nombre y unidad mientras no haya movimientos; la clase no se edita', async () => {
    const material = await createMaterial(lab, { name: 'Tubos de ensayo' });
    const renamed = await call(lab.adminMember.subject, `${lab.base}/products/${material.id}`, {
      method: 'PATCH',
      body: { name: 'Tubos de ensayo 16x100' },
    });
    expect(renamed.status).toBe(200);
    const classChange = await call(lab.adminMember.subject, `${lab.base}/products/${material.id}`, {
      method: 'PATCH',
      body: { class: 'reusable_counted' },
    });
    expect(classChange.status).toBe(400);
    await receivedPosition(lab, material.id, '5');
    const unit = await call(lab.adminMember.subject, `${lab.base}/products/${material.id}`, {
      method: 'PATCH',
      body: { baseUnit: 'g' },
    });
    expect(unit.status).toBe(400);
    const detail = materialDetail.parse((await call(lab.operator.subject, `${lab.base}/products/${material.id}`)).body);
    expect(detail.name).toBe('Tubos de ensayo 16x100');
    expect(detail.unitEditable).toBe(false);
  });

  it('un espacio no ve ni opera los materiales de otro', async () => {
    const material = await createMaterial(lab);
    expect((await call(other.adminMember.subject, `${other.base}/products/${material.id}`)).status).toBe(404);
    expect((await receive(other, material.id, '1', other.shelf, other.operator.subject)).status).toBe(404);
    const list = materialList.parse((await call(other.adminMember.subject, `${other.base}/products`)).body);
    expect(list.items.some((item) => item.id === material.id)).toBe(false);
  });

  it('sin el módulo contratado, nada de Materiales responde', async () => {
    const without = await createMaterialsLab(['reagents']);
    const response = await call(without.adminMember.subject, `${without.base}/products`);
    expect(response.status).toBe(403);
    expect(errorCode(response.body)).toBe('MODULE_UNAVAILABLE');
  });
});

describe('existencias', () => {
  it('el ingreso crea la posición y un segundo ingreso en la misma ubicación la suma', async () => {
    const material = await createMaterial(lab);
    const first = materialMovementResponse.parse((await receive(lab, material.id, '10.5')).body);
    const second = materialMovementResponse.parse((await receive(lab, material.id, '4.5')).body);
    expect(second.positionId).toBe(first.positionId);
    expect(second.balance).toBe('15');
    // Otra ubicación: otra posición; el total del catálogo suma ambas.
    await receive(lab, material.id, '5', lab.lab);
    const stock = await stockOf(lab, material.id);
    expect(stock).toHaveLength(2);
    const detail = materialDetail.parse((await call(lab.operator.subject, `${lab.base}/products/${material.id}`)).body);
    expect(detail.balance).toBe('20');
    expect(detail.locationsWithStock).toBe(2);
    // Un solo lote por material, sin envases (ADR 0025).
    expect(await count('select count(*) as n from inventory.lots where item_id = $1', [material.id])).toBe(1);
    expect(await count('select count(*) as n from inventory.containers where item_id = $1', [material.id])).toBe(0);
  });

  it('ingresos simultáneos del primer ingreso crean un solo lote y una sola posición, y suman todo', async () => {
    const material = await createMaterial(lab);
    const responses = await Promise.all(Array.from({ length: 6 }, () => receive(lab, material.id, '2')));
    expect(responses.map((response) => response.status)).toEqual(Array(6).fill(201));
    expect(await count('select count(*) as n from inventory.lots where item_id = $1', [material.id])).toBe(1);
    const stock = await stockOf(lab, material.id);
    expect(stock).toHaveLength(1);
    expect(stock[0]?.balance).toBe('12');
  });

  it('la salida descuenta el saldo y nunca lo deja bajo cero', async () => {
    const material = await createMaterial(lab);
    const positionId = await receivedPosition(lab, material.id, '10');
    const issue = (quantity: string) =>
      call(lab.operator.subject, `${lab.base}/issues`, {
        method: 'POST',
        body: { positionId, quantity, unit: 'u', purpose: 'practice', detail: 'Práctica de química' },
      });
    const done = materialMovementResponse.parse((await issue('3')).body);
    expect(done.balance).toBe('7');
    expect(done.type).toBe('issue');
    const over = await issue('8');
    expect(over.status).toBe(409);
    expect(errorCode(over.body)).toBe('INSUFFICIENT_STOCK');
    expect((await stockOf(lab, material.id))[0]?.balance).toBe('7');
  });

  it('salidas simultáneas nunca dejan el saldo bajo cero', async () => {
    const material = await createMaterial(lab);
    const positionId = await receivedPosition(lab, material.id, '10');
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        call(lab.operator.subject, `${lab.base}/issues`, {
          method: 'POST',
          body: { positionId, quantity: '2', unit: 'u', purpose: 'practice', detail: 'Práctica' },
        }),
      ),
    );
    expect(responses.filter((response) => response.status === 201)).toHaveLength(5);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    expect((await stockOf(lab, material.id))[0]?.balance).toBe('0');
  });

  it('una posición de un reactivo no se mueve por las rutas de Materiales', async () => {
    const itemId = (
      await admin.query<{ id: string }>(
        `insert into inventory.items (workspace_id, kind, code, name, base_unit) values ($1, 'reagent', $2, 'Acetona', 'mL') returning id`,
        [lab.workspace.id, `ACE-${lab.workspace.code}`],
      )
    ).rows[0]!.id;
    const lotId = (
      await admin.query<{ id: string }>(
        `insert into inventory.lots (workspace_id, item_id, code) values ($1, $2, 'L-001') returning id`,
        [lab.workspace.id, itemId],
      )
    ).rows[0]!.id;
    const positionId = (
      await admin.query<{ id: string }>(
        `insert into inventory.positions (workspace_id, item_id, lot_id, location_id) values ($1, $2, $3, $4) returning id`,
        [lab.workspace.id, itemId, lotId, lab.shelf],
      )
    ).rows[0]!.id;
    const body = { positionId, quantity: '1', unit: 'mL' };
    const issue = await call(lab.adminMember.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { ...body, purpose: 'practice', detail: 'Práctica' },
    });
    expect(issue.status).toBe(404);
    const adjustment = await call(lab.adminMember.subject, `${lab.base}/adjustments`, {
      method: 'POST',
      body: { ...body, reason: 'Conteo' },
    });
    expect(adjustment.status).toBe(404);
  });

  it('el ajuste es del Administrador y exige motivo; la unidad debe ser la base', async () => {
    const material = await createMaterial(lab);
    const positionId = await receivedPosition(lab, material.id, '10');
    const adjust = (subject: string, body: Record<string, unknown>) =>
      call(subject, `${lab.base}/adjustments`, { method: 'POST', body: { positionId, unit: 'u', ...body } });
    expect((await adjust(lab.operator.subject, { quantity: '-2', reason: 'Conteo' })).status).toBe(403);
    expect((await adjust(lab.adminMember.subject, { quantity: '-2' })).status).toBe(400);
    const done = materialMovementResponse.parse((await adjust(lab.adminMember.subject, { quantity: '-2', reason: 'Conteo' })).body);
    expect(done.balance).toBe('8');
    const wrongUnit = await adjust(lab.adminMember.subject, { quantity: '1', reason: 'Conteo', unit: 'kg' });
    expect(wrongUnit.status).toBe(400);
  });

  it('un material no se opera con ítems de Reactivos y viceversa', async () => {
    const [reagent] = (
      await admin.query<{ id: string }>(
        `insert into inventory.items (workspace_id, kind, code, name, base_unit) values ($1, 'reagent', $2, 'Etanol', 'mL') returning id`,
        [lab.workspace.id, `ETA-${lab.workspace.code}`],
      )
    ).rows;
    const response = await receive(lab, reagent!.id, '1');
    expect(response.status).toBe(404);
  });

  it('no suma existencias a una ubicación archivada', async () => {
    const material = await createMaterial(lab);
    const archived = (
      await admin.query<{ id: string }>(
        `insert into core.locations (workspace_id, kind, code, name, archived_at)
         select $1, 'storage', $2, 'Estante viejo', now() returning id`,
        [lab.workspace.id, `OLD-${lab.workspace.code}`],
      )
    ).rows[0]!;
    expect((await receive(lab, material.id, '1', archived.id)).status).toBe(404);
  });
});

describe('mínimo y listado', () => {
  it('fija el mínimo (Administrador), marca «bajo mínimo» y pagina por código', async () => {
    const material = await createMaterial(lab, { name: 'Guantes de nitrilo M' });
    await receivedPosition(lab, material.id, '5');
    expect(
      (await call(lab.operator.subject, `${lab.base}/products/${material.id}/minimum`, { method: 'PUT', body: { minimum: '10' } })).status,
    ).toBe(403);
    const set = await call(lab.adminMember.subject, `${lab.base}/products/${material.id}/minimum`, { method: 'PUT', body: { minimum: '10' } });
    expect(set.status).toBe(200);
    const detail = materialDetail.parse((await call(lab.operator.subject, `${lab.base}/products/${material.id}`)).body);
    expect(detail.belowMinimum).toBe(true);

    const found = materialList.parse((await call(lab.operator.subject, `${lab.base}/products?q=nitrilo`)).body);
    expect(found.items.map((item) => item.id)).toEqual([material.id]);
    const firstPage = materialList.parse((await call(lab.operator.subject, `${lab.base}/products?limit=1`)).body);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).not.toBeNull();
    const secondPage = materialList.parse(
      (await call(lab.operator.subject, `${lab.base}/products?limit=1&cursor=${firstPage.nextCursor}`)).body,
    );
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
  });

  it('el stock sin filtro lista las posiciones del espacio', async () => {
    const list = materialStockList.parse((await call(lab.operator.subject, `${lab.base}/stock`)).body);
    expect(list.items.length).toBeGreaterThan(0);
  });
});

describe('auditoría', () => {
  it('deja una fila por cada operación de catálogo y de existencias', async () => {
    const audits = await admin.query<{ action: string }>('select action from core.audit_events where workspace_id = $1', [lab.workspace.id]);
    const actions = new Set(audits.rows.map((row) => row.action));
    for (const action of [
      'materials.product.create',
      'materials.product.update',
      'materials.product.minimum',
      'materials.receipt.create',
      'materials.issue.create',
      'materials.adjustment.create',
    ]) {
      expect(actions.has(action), action).toBe(true);
    }
  });
});

describe('resumen, ubicaciones y clases', () => {
  it('cuenta materiales, bajo mínimo y préstamos abiertos y atrasados', async () => {
    const fresh = await createMaterialsLab();
    const supply = await createMaterial(fresh, { name: 'Papel filtro' });
    const glass = await createMaterial(fresh, { name: 'Vasos', class: 'reusable_counted' });
    await receivedPosition(fresh, supply.id, '2');
    const positionId = await receivedPosition(fresh, glass.id, '10');
    await call(fresh.adminMember.subject, `${fresh.base}/products/${supply.id}/minimum`, { method: 'PUT', body: { minimum: '5' } });
    const loan = await call(fresh.operator.subject, `${fresh.base}/loans`, {
      method: 'POST',
      body: { borrowerId: fresh.teacher.principalId, lines: [{ positionId, quantity: '2' }] },
    });
    await admin.query(`update materials.loans set due_on = current_date - 2 where id = $1`, [(loan.body as { id: string }).id]);
    const summary = materialsSummary.parse((await call(fresh.operator.subject, `${fresh.base}/summary`)).body);
    expect(summary).toEqual({ materials: 2, belowMinimum: 1, openLoans: 1, closedLoans: 0, overdueLoans: 1, expiring: 0 });
  });

  it('ofrece ubicaciones de ingreso a quien ingresa y ninguna a quien no', async () => {
    const withPermission = locationList.parse((await call(lab.operator.subject, `${lab.base}/receipt-locations`)).body);
    expect(withPermission.items.map((place) => place.id)).toContain(lab.shelf);
    // El Docente ni siquiera consulta Materiales: la admisión lo rechaza antes.
    expect((await call(lab.teacher.subject, `${lab.base}/receipt-locations`)).status).toBe(403);
  });

  it('filtra el catálogo por clase', async () => {
    const fresh = await createMaterialsLab();
    const supply = await createMaterial(fresh, { name: 'Guantes' });
    const glass = await createMaterial(fresh, { name: 'Probetas', class: 'reusable_counted' });
    const byClass = async (name: string) =>
      materialList.parse((await call(fresh.operator.subject, `${fresh.base}/products?class=${name}`)).body).items.map((item) => item.id);
    expect(await byClass('consumable')).toEqual([supply.id]);
    expect(await byClass('reusable_counted')).toEqual([glass.id]);
  });

  it('dice dónde está cada material, resume por área y filtra por ella', async () => {
    const fresh = await createMaterialsLab();
    const supply = await createMaterial(fresh, { name: 'Guantes' });
    const glass = await createMaterial(fresh, { name: 'Probetas', class: 'reusable_counted' });
    const empty = await createMaterial(fresh, { name: 'Sin existencias' });
    await receive(fresh, supply.id, '10', fresh.shelf);
    await receive(fresh, glass.id, '5', fresh.lab);
    const places = locationList.parse((await call(fresh.operator.subject, `${fresh.base}/receipt-locations`)).body).items;
    const nameOf = (id: string) => places.find((place) => place.id === id)?.name;

    const areas = materialAreaList.parse((await call(fresh.operator.subject, `${fresh.base}/areas`)).body).items;
    expect(areas).toHaveLength(1);
    expect(areas[0]).toMatchObject({ materials: 2, lentMaterials: 0 });

    const inArea = async (areaId: string) =>
      materialList.parse((await call(fresh.operator.subject, `${fresh.base}/products?areaId=${areaId}`)).body).items;
    const found = await inArea(areas[0]!.id);
    expect(found.map((item) => item.id).sort()).toEqual([supply.id, glass.id].sort());
    expect(found.find((item) => item.id === supply.id)?.locationNames).toEqual([nameOf(fresh.shelf)]);
    expect(found.some((item) => item.id === empty.id)).toBe(false);
    expect(await inArea('00000000-0000-4000-8000-000000000000')).toEqual([]);

    // «Bajo mínimo»: con mínimo de 20 y 10 en existencia, los guantes entran; las probetas, sin mínimo, no.
    await call(fresh.adminMember.subject, `${fresh.base}/products/${supply.id}/minimum`, { method: 'PUT', body: { minimum: '20' } });
    const below = materialList.parse((await call(fresh.operator.subject, `${fresh.base}/products?stock=below-minimum`)).body).items;
    expect(below.map((item) => item.id)).toEqual([supply.id]);
  });

  it('arma el tablero: cuenta salidas y vales, ordena lo más usado y reserva el ranking de personas al Administrador', async () => {
    const fresh = await createMaterialsLab();
    const supply = await createMaterial(fresh, { name: 'Guantes' });
    const supplyPosition = await receivedPosition(fresh, supply.id, '100');
    const issue = (quantity: string) =>
      call(fresh.operator.subject, `${fresh.base}/issues`, {
        method: 'POST',
        body: { positionId: supplyPosition, quantity, unit: 'u', purpose: 'practice', detail: 'Práctica' },
      });
    expect((await issue('10')).status).toBe(201);
    expect((await issue('20')).status).toBe(201);
    const glass = await reusableWithStock(fresh, '30');
    expect((await lend(fresh, [{ positionId: glass.positionId, quantity: '12' }])).status).toBe(201);
    await call(fresh.adminMember.subject, `${fresh.base}/products/${supply.id}/minimum`, { method: 'PUT', body: { minimum: '90' } });

    const asAdmin = materialsDashboard.parse((await call(fresh.adminMember.subject, `${fresh.base}/dashboard?days=30`)).body);
    expect(asAdmin.figures.issues).toEqual({ current: 2, previous: 0 });
    expect(asAdmin.figures.loans).toEqual({ current: 1, previous: 0 });
    expect(asAdmin.figures).toMatchObject({ openLoans: 1, overdueLoans: 0, belowMinimum: 1 });
    expect(asAdmin.weekly).toHaveLength(8);
    expect(asAdmin.weekly.reduce((sum, week) => sum + week.issued, 0)).toBe(2);
    expect(asAdmin.topSupplies[0]).toMatchObject({ name: 'Guantes', events: 2, quantity: '30' });
    expect(asAdmin.topReusables[0]).toMatchObject({ events: 1, quantity: '12' });
    expect(asAdmin.runningLow[0]).toMatchObject({ name: 'Guantes', balance: '70' });
    expect(asAdmin.shelf).toEqual({ available: '18', total: '30' });
    expect(asAdmin.attention.belowMinimum[0]).toMatchObject({ name: 'Guantes', balance: '70', minimum: '90' });
    expect(asAdmin.topBorrowers?.[0]).toMatchObject({ loans: 1, units: '12' });

    const asOperator = materialsDashboard.parse((await call(fresh.operator.subject, `${fresh.base}/dashboard`)).body);
    expect(asOperator.days).toBe(30);
    expect(asOperator.topBorrowers).toBeNull();
    expect((await call(fresh.operator.subject, `${fresh.base}/dashboard?days=15`)).status).toBe(400);
    expect((await call(fresh.teacher.subject, `${fresh.base}/dashboard`)).status).toBe(403);
  });
});
