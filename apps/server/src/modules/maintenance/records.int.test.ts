import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { asset as assetContract, assetMaintenance, dueList, nextDueList, record, recordCreated, recordList } from '@platlab/contracts';
import { setModuleStatus } from '../../testing/core-fixtures.js';
import {
  admin,
  call,
  count,
  createAsset,
  createMaintenanceLab,
  createPlan,
  createProvider,
  createType,
  errorCode,
  key,
  pdf,
  recordWork,
  shiftDate,
  todayIn,
  uploadCertificate,
  type MaintenanceLab,
} from './maintenance.fixtures.js';

/** M-01a (ADR 0020): «Por hacer», el registro de lo hecho y su certificado por la API. */

let lab: MaintenanceLab;
let other: MaintenanceLab;
let today: string;

beforeAll(async () => {
  lab = await createMaintenanceLab();
  other = await createMaintenanceLab();
  today = await todayIn(lab);
});

const recordsOf = (assetId: string) => count('select count(*) as n from maintenance.records where asset_id = $1', [assetId]);
const dueOf = async (assetId: string) =>
  dueList.parse((await call(lab.operator.subject, `${lab.maintenance}/due`)).body).items.filter((item) => item.asset.id === assetId);

describe('Por hacer', () => {
  it('sin registros toca en el inicio del plan o, si el equipo se registró después, en su alta', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const future = await createPlan(lab, { assetTypeId: type.id, startsOn: shiftDate(today, 5) });
    // El plan empezó antes del alta del equipo, que es hoy.
    const past = await createPlan(lab, { assetTypeId: type.id, startsOn: '2026-01-01' });

    const due = await dueOf(asset.id);
    expect(due.find((item) => item.plan.id === future.id)).toMatchObject({ dueOn: shiftDate(today, 5), lastRecord: null });
    expect(due.find((item) => item.plan.id === past.id)).toMatchObject({ dueOn: today, asset: { code: asset.code } });
    // Lo que vence después de 30 días no está en «Por hacer».
    const later = await createPlan(lab, { assetTypeId: type.id, startsOn: shiftDate(today, 31) });
    expect((await dueOf(asset.id)).map((item) => item.plan.id)).not.toContain(later.id);
  });

  it('después toca en su fecha más la frecuencia o, con «válida hasta», en esa fecha', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const monthly = await createPlan(lab, { assetTypeId: type.id, intervalCount: 1, intervalUnit: 'month' });
    const calibration = await createPlan(lab, { kind: 'calibration', assetTypeId: type.id, intervalCount: 1, intervalUnit: 'year' });

    const done = await recordWork(lab, lab.operator.subject, { assetId: asset.id, planId: monthly.id, performedOn: '2026-03-31', result: 'pass' });
    expect(done.status).toBe(201);
    expect(recordCreated.parse(done.body).nextDueOn).toBe('2026-04-30');

    const validUntil = shiftDate(today, 10);
    const calibrated = await recordWork(lab, lab.operator.subject, {
      assetId: asset.id,
      planId: calibration.id,
      performedOn: shiftDate(today, -1),
      result: 'pass',
      validUntil,
    });
    expect(recordCreated.parse(calibrated.body)).toMatchObject({ kind: 'calibration', validUntil, nextDueOn: validUntil });

    const due = await dueOf(asset.id);
    expect(due.find((item) => item.plan.id === monthly.id)).toMatchObject({
      dueOn: '2026-04-30',
      lastRecord: { id: recordCreated.parse(done.body).id, performedOn: '2026-03-31' },
    });
    expect(due.find((item) => item.plan.id === calibration.id)?.dueOn).toBe(validUntil);
  });

  it('el Resumen cuenta vencidos y próximos 30 días', async () => {
    const before = await call(lab.operator.subject, `${lab.maintenance}/summary`);
    const type = await createType(lab);
    await createAsset(lab, { typeId: type.id });
    await createPlan(lab, { assetTypeId: type.id, startsOn: shiftDate(today, 3) });
    const after = await call(lab.operator.subject, `${lab.maintenance}/summary`);
    expect(after.body).toMatchObject({ today, next30: (before.body as { next30: number }).next30 + 1 });
  });
});

describe('registrar', () => {
  it('rechaza un plan que no cubre al equipo, una fecha futura, «válida hasta» fuera de calibración y una lista desalineada', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const covering = await createPlan(lab, { assetTypeId: type.id, checklist: ['Limpiar', 'Ajustar'] });
    const foreignPlan = await createPlan(lab, { assetTypeId: (await createType(lab)).id });
    const base = { assetId: asset.id, performedOn: today, result: 'pass' };

    const rejected = [
      await recordWork(lab, lab.operator.subject, { ...base, planId: foreignPlan.id }),
      await recordWork(lab, lab.operator.subject, { ...base, planId: covering.id, checklist: [true, true], performedOn: shiftDate(today, 1) }),
      await recordWork(lab, lab.operator.subject, { ...base, planId: covering.id, checklist: [true, true], validUntil: shiftDate(today, 30) }),
      await recordWork(lab, lab.operator.subject, { ...base, planId: covering.id, checklist: [true] }),
      await recordWork(lab, lab.operator.subject, { ...base, kind: 'calibration', planId: covering.id, checklist: [true, false] }),
      // Sin plan hace falta el tipo de trabajo; con observaciones, el texto.
      await recordWork(lab, lab.operator.subject, base),
      await recordWork(lab, lab.operator.subject, { ...base, kind: 'cleaning', result: 'fail' }),
    ];
    for (const response of rejected) {
      expect(response.status).toBe(400);
      expect(errorCode(response.body)).toBe('VALIDATION_FAILED');
    }
    expect(await recordsOf(asset.id)).toBe(0);

    const done = await recordWork(lab, lab.operator.subject, { ...base, planId: covering.id, checklist: [true, false], cost: '35.50' });
    expect(done.status).toBe(201);
    expect(record.parse(done.body)).toMatchObject({
      kind: 'preventive',
      checklist: [
        { item: 'Limpiar', done: true },
        { item: 'Ajustar', done: false },
      ],
      cost: '35.5',
      provider: null,
      recordedBy: { name: 'Operador' },
    });
  });

  it('un equipo dado de baja no recibe registros', async () => {
    const asset = await createAsset(lab);
    await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/condition`, { method: 'POST', body: { condition: 'retired', reason: 'Obsoleto' } });
    const response = await recordWork(lab, lab.operator.subject, { assetId: asset.id, kind: 'cleaning', performedOn: today, result: 'pass' });
    expect(response.status).toBe(400);
    expect(await recordsOf(asset.id)).toBe(0);
  });

  it('el estado físico lo aplica Equipos con su historial; un proveedor archivado no se elige', async () => {
    const asset = await createAsset(lab);
    const provider = await createProvider(lab);
    const done = await recordWork(lab, lab.operator.subject, {
      assetId: asset.id,
      kind: 'verification',
      performedOn: today,
      result: 'pass_with_observations',
      observations: 'Golpe en la carcasa',
      providerId: provider.id,
      conservation: 'poor',
    });
    expect(done.status).toBe(201);
    expect(record.parse(done.body)).toMatchObject({ conservation: 'poor', provider: { id: provider.id, name: provider.name }, plan: null });
    const card = assetContract.parse((await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}`)).body);
    expect(card.conservation).toBe('poor');
    expect(
      await count(
        `select count(*) as n from equipment.conservation_changes where asset_id = $1 and to_conservation = 'poor'`,
        [asset.id],
      ),
    ).toBe(1);

    await call(lab.adminMember.subject, `${lab.maintenance}/providers/${provider.id}/archive`, { method: 'POST', key: key() });
    const archived = await recordWork(lab, lab.operator.subject, { assetId: asset.id, kind: 'cleaning', performedOn: today, result: 'pass', providerId: provider.id });
    expect(archived.status).toBe(400);
  });

  it('un reintento con la misma clave no duplica; con otro contenido se rechaza', async () => {
    const asset = await createAsset(lab);
    const idempotencyKey = key();
    const body = { assetId: asset.id, kind: 'cleaning', performedOn: today, result: 'pass' };
    const first = await recordWork(lab, lab.operator.subject, body, idempotencyKey);
    const retry = await recordWork(lab, lab.operator.subject, body, idempotencyKey);
    expect(retry.body).toEqual(first.body);
    expect(await recordsOf(asset.id)).toBe(1);
    const changed = await recordWork(lab, lab.operator.subject, { ...body, kind: 'preventive' }, idempotencyKey);
    expect(changed.status).toBe(422);
    expect(errorCode(changed.body)).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('admisión doble: con Equipos en solo lectura no se registra, y los planes siguen', async () => {
    const own = await createMaintenanceLab();
    const type = await createType(own);
    const asset = await createAsset(own, { typeId: type.id });
    await setModuleStatus(admin, own.workspace.id, 'equipment', 'read_only');

    const denied = await recordWork(own, own.operator.subject, { assetId: asset.id, kind: 'cleaning', performedOn: today, result: 'pass' });
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('MODULE_READ_ONLY');
    expect(await recordsOf(asset.id)).toBe(0);

    expect((await call(own.operator.subject, `${own.maintenance}/plans`)).status).toBe(200);
    expect((await createPlan(own, { assetTypeId: type.id })).assetCount).toBe(1);
  });
});

describe('Completados y la ficha', () => {
  it('lista del más reciente al más antiguo, por páginas, con el filtro por equipo', async () => {
    const asset = await createAsset(lab);
    for (const performedOn of ['2026-01-05', '2026-03-05', '2026-02-05']) {
      expect((await recordWork(lab, lab.operator.subject, { assetId: asset.id, kind: 'cleaning', performedOn, result: 'pass' })).status).toBe(201);
    }
    const url = `${lab.maintenance}/records?assetId=${asset.id}&limit=2`;
    const first = recordList.parse((await call(lab.operator.subject, url)).body);
    expect(first.items.map((item) => item.performedOn)).toEqual(['2026-03-05', '2026-02-05']);
    const second = recordList.parse((await call(lab.operator.subject, `${url}&cursor=${first.nextCursor}`)).body);
    expect(second.items.map((item) => item.performedOn)).toEqual(['2026-01-05']);
    expect(second.nextCursor).toBeNull();
  });

  it('la ficha muestra sus planes con la próxima fecha, sus exclusiones y sus registros', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const covering = await createPlan(lab, { assetTypeId: type.id });
    const excluding = await createPlan(lab, { assetTypeId: type.id });
    await call(lab.adminMember.subject, `${lab.maintenance}/plans/${excluding.id}/exclusions`, {
      method: 'POST',
      body: { assetId: asset.id, reason: 'Lo atiende el fabricante' },
      key: key(),
    });
    await recordWork(lab, lab.operator.subject, { assetId: asset.id, planId: covering.id, performedOn: '2026-02-01', result: 'pass' });

    const detail = assetMaintenance.parse((await call(lab.operator.subject, `${lab.maintenance}/assets/${asset.id}`)).body);
    expect(detail.plans).toMatchObject([{ plan: { id: covering.id }, dueOn: '2026-08-01', lastPerformedOn: '2026-02-01' }]);
    expect(detail.exclusions).toMatchObject([{ plan: { id: excluding.id }, reason: 'Lo atiende el fabricante' }]);
    expect(detail.records.map((item) => item.plan?.id)).toEqual([covering.id]);
  });

  it('next-due da la fecha más cercana de cada equipo con plan, solo del espacio', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const loose = await createAsset(lab);
    const near = await createPlan(lab, { assetTypeId: type.id, startsOn: shiftDate(today, 2) });
    await createPlan(lab, { assetTypeId: type.id, startsOn: shiftDate(today, 40) });
    const foreign = await createAsset(other, { typeId: (await createType(other)).id });

    const response = await call(lab.operator.subject, `${lab.maintenance}/next-due?assetIds=${asset.id},${loose.id},${foreign.id}`);
    expect(nextDueList.parse(response.body).items).toEqual([
      { assetId: asset.id, dueOn: shiftDate(today, 2), plan: { id: near.id, title: near.title, kind: 'preventive' } },
    ]);
    const tooMany = Array.from({ length: 101 }, () => randomUUID()).join(',');
    expect((await call(lab.operator.subject, `${lab.maintenance}/next-due?assetIds=${tooMany}`)).status).toBe(400);
  });
});

describe('certificado', () => {
  it('solo PDF; uno por registro: el segundo se rechaza', async () => {
    const asset = await createAsset(lab);
    const done = record.parse(
      (await recordWork(lab, lab.operator.subject, { assetId: asset.id, kind: 'calibration', performedOn: today, result: 'pass' })).body,
    );
    const certificates = () => count('select count(*) as n from maintenance.record_certificates where record_id = $1', [done.id]);

    expect((await uploadCertificate(lab, lab.operator.subject, done.id, Buffer.from('<html>no</html>'))).status).toBe(400);
    expect(await certificates()).toBe(0);

    const first = await uploadCertificate(lab, lab.operator.subject, done.id, pdf('certificado'));
    expect(first.status).toBe(201);
    expect(record.parse(first.body).certificate?.url).toMatch(new RegExp(`/${lab.workspace.id}/maintenance/certificates/[0-9a-f-]+\\.pdf$`));

    const second = await uploadCertificate(lab, lab.operator.subject, done.id, pdf('otro'));
    expect(second.status).toBe(409);
    expect(errorCode(second.body)).toBe('VALIDATION_FAILED');
    expect(await certificates()).toBe(1);
    expect((await uploadCertificate(lab, lab.teacher.subject, done.id, pdf('docente'))).status).toBe(403);
  });
});

describe('aislamiento', () => {
  it('un equipo o un registro de otro espacio no existe', async () => {
    const foreign = await createAsset(other);
    const foreignRecord = record.parse(
      (await recordWork(other, other.operator.subject, { assetId: foreign.id, kind: 'cleaning', performedOn: today, result: 'pass' })).body,
    );
    expect((await recordWork(lab, lab.operator.subject, { assetId: foreign.id, kind: 'cleaning', performedOn: today, result: 'pass' })).status).toBe(404);
    expect((await call(lab.operator.subject, `${lab.maintenance}/assets/${foreign.id}`)).status).toBe(404);
    expect((await uploadCertificate(lab, lab.operator.subject, foreignRecord.id, pdf('ajeno'))).status).toBe(404);
    const listed = recordList.parse((await call(lab.operator.subject, `${lab.maintenance}/records?assetId=${foreign.id}`)).body);
    expect(listed.items).toEqual([]);
    const search = await call(lab.operator.subject, `${lab.maintenance}/assets?code=${encodeURIComponent(foreign.code)}`);
    expect((search.body as { items: { id: string }[] }).items.map((item) => item.id)).not.toContain(foreign.id);
  });
});
