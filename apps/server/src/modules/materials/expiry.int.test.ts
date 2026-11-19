import { beforeAll, describe, expect, it } from 'vitest';
import { materialDetail, materialList, materialMovementResponse, materialsDashboard, materialsSummary } from '@platlab/contracts';
import { addDays, todayIn } from '../../platform/dates.js';
import { admin, call, count, createMaterial, createMaterialsLab, errorCode, stockOf, type MaterialsLab } from './materials.fixtures.js';

/** MA-01f (ADR 0025): vencimiento por lote de los insumos que vencen y salida con tipo y solicitante. */

let lab: MaterialsLab;
let other: MaterialsLab;

// Márgenes amplios: la zona del espacio no cambia el resultado aunque el día civil difiera de UTC.
const today = todayIn('UTC');
const soon = addDays(today, 30);
const later = addDays(today, 60);
const far = addDays(today, 400);
const past = addDays(today, -10);

const receiveLot = (productId: string, quantity: string, extra: Record<string, unknown>, locationId = lab.shelf) =>
  call(lab.operator.subject, `${lab.base}/receipts`, { method: 'POST', body: { productId, locationId, quantity, unit: 'u', ...extra } });

const expiringMaterial = (name: string) => createMaterial(lab, { name, tracksExpiry: true });

beforeAll(async () => {
  lab = await createMaterialsLab();
  other = await createMaterialsLab();
});

describe('el insumo dice si vence', () => {
  it('solo un consumible vence, al crearlo y al editarlo', async () => {
    expect((await expiringMaterial('Agujas cortas 30G')).tracksExpiry).toBe(true);
    const reusable = await call(lab.adminMember.subject, `${lab.base}/products`, {
      method: 'POST',
      body: { name: 'Pinzas', class: 'reusable_counted', tracksExpiry: true },
    });
    expect(reusable.status).toBe(400);

    const gauze = await createMaterial(lab, { name: 'Gasa en paquetes' });
    expect(gauze.tracksExpiry).toBe(false);
    const patched = await call(lab.adminMember.subject, `${lab.base}/products/${gauze.id}`, { method: 'PATCH', body: { tracksExpiry: true } });
    expect(patched.status).toBe(200);
    expect(materialDetail.parse((await call(lab.operator.subject, `${lab.base}/products/${gauze.id}`)).body).tracksExpiry).toBe(true);

    const pliers = await createMaterial(lab, { name: 'Espejos bucales', class: 'reusable_counted' });
    const bad = await call(lab.adminMember.subject, `${lab.base}/products/${pliers.id}`, { method: 'PATCH', body: { tracksExpiry: true } });
    expect(bad.status).toBe(400);
    expect(errorCode(bad.body)).toBe('VALIDATION_FAILED');
  });
});

describe('ingreso por lote', () => {
  it('pide la fecha si el insumo vence y la rechaza si no vence', async () => {
    const needles = await expiringMaterial('Agujas largas 27G');
    const missing = await receiveLot(needles.id, '10', {});
    expect(missing.status).toBe(400);
    expect(errorCode(missing.body)).toBe('VALIDATION_FAILED');
    // El lote sin fecha lo rechaza el contrato.
    expect((await receiveLot(needles.id, '10', { lot: 'D321' })).status).toBe(400);

    const cotton = await createMaterial(lab, { name: 'Rollos de algodón' });
    const dated = await receiveLot(cotton.id, '10', { expiresOn: soon });
    expect(dated.status).toBe(400);
    expect(errorCode(dated.body)).toBe('VALIDATION_FAILED');
  });

  it('el mismo lote suma; otra fecha abre otro lote en la misma ubicación; el lote no cambia de fecha', async () => {
    const sutures = await expiringMaterial('Sutura reabsorbible 4/0');
    const first = materialMovementResponse.parse((await receiveLot(sutures.id, '5', { lot: '17705-01', expiresOn: later })).body);
    // Otra grafía del mismo lote del proveedor: mismo lote, misma posición.
    const again = materialMovementResponse.parse((await receiveLot(sutures.id, '3', { lot: '17705-01'.toLowerCase(), expiresOn: later })).body);
    expect(again.positionId).toBe(first.positionId);
    expect(again.balance).toBe('8');

    const mismatch = await receiveLot(sutures.id, '1', { lot: '17705-01', expiresOn: far });
    expect(mismatch.status).toBe(400);
    expect(errorCode(mismatch.body)).toBe('VALIDATION_FAILED');

    const unlabeled = materialMovementResponse.parse((await receiveLot(sutures.id, '4', { expiresOn: soon })).body);
    expect(unlabeled.positionId).not.toBe(first.positionId);
    expect(await count('select count(*) as n from inventory.lots where item_id = $1', [sutures.id])).toBe(2);

    const stock = await stockOf(lab, sutures.id);
    expect(stock.map(({ lot, expiresOn, balance }) => ({ lot, expiresOn, balance })).sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!))).toEqual([
      { lot: null, expiresOn: soon, balance: '4' },
      { lot: '17705-01', expiresOn: later, balance: '8' },
    ]);
    const detail = materialDetail.parse((await call(lab.operator.subject, `${lab.base}/products/${sutures.id}`)).body);
    // Dos lotes en un estante: una sola ubicación con existencia.
    expect(detail).toMatchObject({ balance: '12', locationsWithStock: 1, nextExpiry: soon });
    expect(detail.locationNames).toHaveLength(1);
  });

  it('ingresos simultáneos de un lote nuevo abren un solo lote', async () => {
    const gloves = await expiringMaterial('Guantes estériles 7');
    const responses = await Promise.all(Array.from({ length: 5 }, () => receiveLot(gloves.id, '2', { lot: 'SH23099', expiresOn: far })));
    expect(responses.map((response) => response.status)).toEqual(Array(5).fill(201));
    expect(await count('select count(*) as n from inventory.lots where item_id = $1', [gloves.id])).toBe(1);
    expect((await stockOf(lab, gloves.id))[0]?.balance).toBe('10');
  });
});

describe('por vencer', () => {
  it('filtra, cuenta y avisa los lotes vencidos o que vencen en 180 días; lo lejano no', async () => {
    const fresh = await createMaterialsLab();
    const make = (name: string) => createMaterial(fresh, { name, tracksExpiry: true });
    const receipt = (productId: string, expiresOn: string, lot: string) =>
      call(fresh.operator.subject, `${fresh.base}/receipts`, {
        method: 'POST',
        body: { productId, locationId: fresh.shelf, quantity: '6', unit: 'u', expiresOn, lot },
      });
    const varnish = await make('Barniz de flúor');
    const dam = await make('Dique de goma');
    const resin = await make('Resina A2');
    expect((await receipt(varnish.id, past, 'V-1')).status).toBe(201);
    expect((await receipt(dam.id, soon, 'D-1')).status).toBe(201);
    expect((await receipt(resin.id, far, 'R-1')).status).toBe(201);

    const listed = materialList.parse((await call(fresh.operator.subject, `${fresh.base}/products?stock=expiring`)).body);
    expect(listed.items.map((item) => item.name).sort()).toEqual(['Barniz de flúor', 'Dique de goma']);
    expect(materialsSummary.parse((await call(fresh.operator.subject, `${fresh.base}/summary`)).body).expiring).toBe(2);

    const dashboard = materialsDashboard.parse((await call(fresh.operator.subject, `${fresh.base}/dashboard`)).body);
    expect(dashboard.attention.expiring).toEqual([
      { productId: varnish.id, name: 'Barniz de flúor', baseUnit: 'u', lot: 'V-1', expiresOn: past, balance: '6' },
      { productId: dam.id, name: 'Dique de goma', baseUnit: 'u', lot: 'D-1', expiresOn: soon, balance: '6' },
    ]);
  });
});

describe('salida con tipo y solicitante', () => {
  it('guarda el tipo y quién la pidió; el detalle y el tipo quedan en el libro', async () => {
    const product = await createMaterial(lab, { name: 'Microaplicadores' });
    const positionId = materialMovementResponse.parse((await receiveLot(product.id, '50', {})).body).positionId;
    const issued = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId, quantity: '5', unit: 'u', purpose: 'clinic', requesterId: lab.teacher.principalId, detail: 'Profilaxis, Periodoncia I' },
    });
    expect(issued.status).toBe(201);
    const { operationId } = materialMovementResponse.parse(issued.body);
    const stored = await admin.query<{ purpose: string; requester: string; reason: string; destination: string }>(
      `select d.purpose, d.requester_principal_id as requester, o.reason, o.destination
         from materials.issue_details as d join inventory.operations as o on o.id = d.operation_id
        where d.operation_id = $1`,
      [operationId],
    );
    expect(stored.rows).toEqual([{ purpose: 'clinic', requester: lab.teacher.principalId, reason: 'Profilaxis, Periodoncia I', destination: 'Clínica' }]);

    const anonymous = await call(lab.operator.subject, `${lab.base}/issues`, {
      method: 'POST',
      body: { positionId, quantity: '1', unit: 'u', purpose: 'general', detail: 'Reposición del botiquín' },
    });
    expect(anonymous.status).toBe(201);
  });

  it('rechaza un solicitante de otro espacio y un tipo desconocido, sin mover el saldo', async () => {
    const product = await createMaterial(lab, { name: 'Papel articular' });
    const positionId = materialMovementResponse.parse((await receiveLot(product.id, '10', {})).body).positionId;
    const issue = (body: Record<string, unknown>) =>
      call(lab.operator.subject, `${lab.base}/issues`, { method: 'POST', body: { positionId, quantity: '1', unit: 'u', detail: 'Práctica 3', ...body } });
    const stranger = await issue({ purpose: 'practice', requesterId: other.teacher.principalId });
    expect(stranger.status).toBe(400);
    expect(errorCode(stranger.body)).toBe('VALIDATION_FAILED');
    expect((await issue({ purpose: 'patient' })).status).toBe(400);
    expect((await stockOf(lab, product.id))[0]?.balance).toBe('10');
  });
});
