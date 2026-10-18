import { beforeAll, describe, expect, it } from 'vitest';
import { asset as assetContract, assetMaintenance, fault as faultContract, record, recordCreated, recordList } from '@platlab/contracts';
import {
  call,
  count,
  createAsset,
  createMaintenanceLab,
  createPlan,
  errorCode,
  key,
  pdf,
  recordWork,
  shiftDate,
  todayIn,
  uploadCertificate,
  type MaintenanceLab,
} from './maintenance.fixtures.js';

/** M-01b (ADR 0020): el correctivo ligado al incidente, y anular y corregir por la API. */

let lab: MaintenanceLab;
let today: string;

beforeAll(async () => {
  lab = await createMaintenanceLab();
  today = await todayIn(lab);
});

const recordsOf = (assetId: string) => count('select count(*) as n from maintenance.records where asset_id = $1', [assetId]);
const fichaOf = async (assetId: string) =>
  assetMaintenance.parse((await call(lab.operator.subject, `${lab.maintenance}/assets/${assetId}`)).body);
const faultOf = async (faultId: string) => faultContract.parse((await call(lab.operator.subject, `${lab.base}/faults/${faultId}`)).body);
const conditionOf = async (assetId: string) =>
  assetContract.parse((await call(lab.adminMember.subject, `${lab.base}/assets/${assetId}`)).body).condition;

/** El Docente reporta un incidente del equipo; sin poder usarlo, el equipo queda fuera de servicio. */
async function reportFault(assetId: string, usable = false) {
  const reported = await call(lab.teacher.subject, `${lab.base}/faults`, {
    method: 'POST',
    body: { assetId, faultType: 'electrical', description: 'No enciende', usable },
    key: key(),
  });
  expect(reported.status).toBe(201);
  return faultContract.parse(reported.body);
}

const corrective = (assetId: string, extra: Record<string, unknown> = {}) => ({
  assetId,
  kind: 'corrective',
  performedOn: today,
  result: 'pass',
  observations: 'Cambio de fusible',
  ...extra,
});

const voidRecord = (subject: string, recordId: string, reason = 'Registro duplicado', idempotencyKey = key()) =>
  call(subject, `${lab.maintenance}/records/${recordId}/void`, { method: 'POST', body: { reason }, key: idempotencyKey });

const correctRecord = (subject: string, recordId: string, body: Record<string, unknown>, idempotencyKey = key()) =>
  call(subject, `${lab.maintenance}/records/${recordId}/correction`, { method: 'POST', body, key: idempotencyKey });

describe('correctivo', () => {
  it('atiende el incidente abierto: lo soluciona con «qué se hizo» y devuelve el equipo a operativo', async () => {
    const asset = await createAsset(lab);
    const fault = await reportFault(asset.id);
    expect(await conditionOf(asset.id)).toBe('faulted');
    expect((await fichaOf(asset.id)).openFaults).toMatchObject([{ id: fault.id, status: 'open', usable: false }]);

    const done = await recordWork(lab, lab.operator.subject, corrective(asset.id, { faultId: fault.id, resolveFault: { returnToOperational: true } }));
    expect(done.status).toBe(201);
    expect(recordCreated.parse(done.body)).toMatchObject({ kind: 'corrective', plan: null, faultId: fault.id, nextDueOn: null });

    expect(await faultOf(fault.id)).toMatchObject({ status: 'resolved', resolution: 'Cambio de fusible' });
    expect(await conditionOf(asset.id)).toBe('operational');
    expect((await fichaOf(asset.id)).openFaults).toEqual([]);
  });

  it('sin «solucionar» el incidente sigue abierto; No conforme no lo soluciona; uno de otro equipo no existe', async () => {
    const asset = await createAsset(lab);
    const other = await createAsset(lab);
    const fault = await reportFault(asset.id, true);

    const linked = await recordWork(lab, lab.operator.subject, corrective(asset.id, { faultId: fault.id }));
    expect(linked.status).toBe(201);
    expect((await faultOf(fault.id)).status).toBe('open');

    const failed = await recordWork(
      lab,
      lab.operator.subject,
      corrective(asset.id, { result: 'fail', faultId: fault.id, resolveFault: { returnToOperational: false } }),
    );
    expect(failed.status).toBe(400);

    const crossed = await recordWork(lab, lab.operator.subject, corrective(other.id, { faultId: fault.id }));
    expect(crossed.status).toBe(404);
    expect(await recordsOf(other.id)).toBe(0);

    expect((await recordWork(lab, lab.operator.subject, corrective(asset.id, { observations: null }))).status).toBe(400);
    expect((await recordWork(lab, lab.operator.subject, { ...corrective(asset.id), kind: 'cleaning', faultId: fault.id })).status).toBe(400);
    expect(await recordsOf(asset.id)).toBe(1);
  });

  it('si otra persona ya lo solucionó en Equipos, REQUEST_RESOLVED y nada se registra', async () => {
    const asset = await createAsset(lab);
    const fault = await reportFault(asset.id);
    const resolved = await call(lab.adminMember.subject, `${lab.base}/faults/${fault.id}/resolve`, {
      method: 'POST',
      body: { resolution: 'Se reinició', returnToOperational: true },
      key: key(),
    });
    expect(resolved.status).toBe(200);

    const late = await recordWork(lab, lab.operator.subject, corrective(asset.id, { faultId: fault.id, resolveFault: { returnToOperational: true } }));
    expect(late.status).toBe(409);
    expect(errorCode(late.body)).toBe('REQUEST_RESOLVED');
    expect(await recordsOf(asset.id)).toBe(0);
  });
});

describe('anular', () => {
  it('solo el Administrador, con motivo, una vez; el anulado sigue a la vista y deja de contar para la próxima fecha', async () => {
    const asset = await createAsset(lab);
    const plan = await createPlan(lab, { assetId: asset.id });
    const done = record.parse(
      (await recordWork(lab, lab.operator.subject, { assetId: asset.id, planId: plan.id, performedOn: today, result: 'pass' })).body,
    );
    const dueOn = async () => (await fichaOf(asset.id)).plans.find((entry) => entry.plan.id === plan.id)?.dueOn;
    // El equipo se dio de alta hoy: sin registros, toca hoy; con el de hoy, dentro de seis meses.
    expect(await dueOn()).not.toBe(today);

    expect((await voidRecord(lab.operator.subject, done.id)).status).toBe(403);
    expect((await call(lab.adminMember.subject, `${lab.maintenance}/records/${done.id}/void`, { method: 'POST', body: {}, key: key() })).status).toBe(400);

    const voided = await voidRecord(lab.adminMember.subject, done.id, 'Equipo equivocado');
    expect(voided.status).toBe(200);
    expect(record.parse(voided.body).voided).toMatchObject({ reason: 'Equipo equivocado', by: { name: expect.any(String) }, correctedBy: null });
    expect(await dueOn()).toBe(today);

    const listed = recordList.parse((await call(lab.operator.subject, `${lab.maintenance}/records?assetId=${asset.id}`)).body);
    expect(listed.items.map((item) => [item.id, item.voided?.reason])).toEqual([[done.id, 'Equipo equivocado']]);

    const again = await voidRecord(lab.adminMember.subject, done.id);
    expect(again.status).toBe(400);
    expect((await uploadCertificate(lab, lab.adminMember.subject, done.id, pdf('tarde'))).status).toBe(400);
  });
});

describe('corregir', () => {
  it('anula y registra en un paso, del mismo equipo, y el nuevo lleva el certificado', async () => {
    const asset = await createAsset(lab);
    const done = record.parse(
      (await recordWork(lab, lab.operator.subject, { assetId: asset.id, kind: 'calibration', performedOn: today, result: 'pass' })).body,
    );
    const withCertificate = record.parse((await uploadCertificate(lab, lab.operator.subject, done.id, pdf('certificado'))).body);
    const body = {
      reason: 'Fecha equivocada',
      keepCertificate: true,
      record: { assetId: asset.id, kind: 'calibration', performedOn: shiftDate(today, -1), result: 'pass' },
    };

    expect((await correctRecord(lab.operator.subject, done.id, body)).status).toBe(403);

    const idempotencyKey = key();
    const corrected = await correctRecord(lab.adminMember.subject, done.id, body, idempotencyKey);
    expect(corrected.status).toBe(201);
    const fresh = recordCreated.parse(corrected.body);
    expect(fresh).toMatchObject({ performedOn: shiftDate(today, -1), corrects: { id: done.id, performedOn: today }, voided: null });
    expect(fresh.certificate?.url).toBe(withCertificate.certificate?.url);
    expect((await correctRecord(lab.adminMember.subject, done.id, body, idempotencyKey)).body).toEqual(corrected.body);

    const listed = recordList.parse((await call(lab.operator.subject, `${lab.maintenance}/records?assetId=${asset.id}`)).body);
    expect(listed.items.find((item) => item.id === done.id)?.voided).toMatchObject({
      reason: 'Fecha equivocada',
      correctedBy: { id: fresh.id, performedOn: shiftDate(today, -1) },
    });
    expect(await recordsOf(asset.id)).toBe(2);
    expect(
      await count('select count(*) as n from maintenance.record_certificates where record_id = $1 and carried_from_id is not null', [fresh.id]),
    ).toBe(1);

    expect((await correctRecord(lab.adminMember.subject, done.id, body)).status).toBe(400);
  });

  it('la corrección es del mismo equipo: con otro, nada se anula', async () => {
    const asset = await createAsset(lab);
    const other = await createAsset(lab);
    const done = record.parse(
      (await recordWork(lab, lab.operator.subject, { assetId: asset.id, kind: 'cleaning', performedOn: today, result: 'pass' })).body,
    );
    const crossed = await correctRecord(lab.adminMember.subject, done.id, {
      reason: 'Equipo equivocado',
      keepCertificate: false,
      record: { assetId: other.id, kind: 'cleaning', performedOn: today, result: 'pass' },
    });
    expect(crossed.status).toBe(400);
    expect(errorCode(crossed.body)).toBe('VALIDATION_FAILED');
    expect(await count('select count(*) as n from maintenance.records where id = $1 and voided_at is not null', [done.id])).toBe(0);
    expect(await recordsOf(other.id)).toBe(0);
  });
});
