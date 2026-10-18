import { beforeAll, describe, expect, it } from 'vitest';
import { plan as planContract, planList, provider as providerContract, providerList } from '@platlab/contracts';
import {
  call,
  count,
  createAsset,
  createMaintenanceLab,
  createPlan,
  createProvider,
  createType,
  errorCode,
  key,
  recordWork,
  todayIn,
  type MaintenanceLab,
} from './maintenance.fixtures.js';

/** M-01a (ADR 0020): proveedores, planes y exclusiones por la API, con sus roles. */

let lab: MaintenanceLab;
let other: MaintenanceLab;

beforeAll(async () => {
  lab = await createMaintenanceLab();
  other = await createMaintenanceLab();
});

const plans = async (target: MaintenanceLab = lab) =>
  planList.parse((await call(target.operator.subject, `${target.maintenance}/plans`)).body);
const planIn = async (planId: string) => (await plans()).items.find((item) => item.id === planId);

describe('roles', () => {
  it('el Docente y el Estudiante no entran a Mantenimiento', async () => {
    const asset = await createAsset(lab);
    for (const member of [lab.teacher, lab.student]) {
      for (const path of ['/plans', '/due', '/summary', '/providers', '/records', `/assets/${asset.id}`]) {
        const response = await call(member.subject, `${lab.maintenance}${path}`);
        expect(response.status).toBe(403);
        expect(errorCode(response.body)).toBe('ACCESS_DENIED');
      }
      const recorded = await recordWork(lab, member.subject, { assetId: asset.id, kind: 'cleaning', performedOn: '2026-01-10', result: 'pass' });
      expect(recorded.status).toBe(403);
    }
  });

  it('el Operador consulta planes y proveedores y registra, pero no los administra', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const created = await createPlan(lab, { assetTypeId: type.id });
    const provider = await createProvider(lab);

    expect((await call(lab.operator.subject, `${lab.maintenance}/plans`)).status).toBe(200);
    expect(providerList.parse((await call(lab.operator.subject, `${lab.maintenance}/providers`)).body).items.map((item) => item.id)).toContain(
      provider.id,
    );
    const denied = [
      await call(lab.operator.subject, `${lab.maintenance}/plans`, {
        method: 'POST',
        body: { kind: 'cleaning', title: 'Limpieza', assetTypeId: type.id, intervalCount: 1, intervalUnit: 'week', startsOn: '2026-01-01' },
      }),
      await call(lab.operator.subject, `${lab.maintenance}/plans/${created.id}`, { method: 'PATCH', body: { title: 'Otro', expectedVersion: 1 } }),
      await call(lab.operator.subject, `${lab.maintenance}/plans/${created.id}/archive`, { method: 'POST' }),
      await call(lab.operator.subject, `${lab.maintenance}/plans/${created.id}/exclusions`, {
        method: 'POST',
        body: { assetId: asset.id, reason: 'Sin uso' },
      }),
      await call(lab.operator.subject, `${lab.maintenance}/providers`, { method: 'POST', body: { name: 'Otro proveedor' } }),
      await call(lab.operator.subject, `${lab.maintenance}/providers/${provider.id}/archive`, { method: 'POST' }),
    ];
    for (const response of denied) {
      expect(response.status).toBe(403);
      expect(errorCode(response.body)).toBe('ACCESS_DENIED');
    }

    const recorded = await recordWork(lab, lab.operator.subject, {
      assetId: asset.id,
      planId: created.id,
      performedOn: '2026-02-01',
      result: 'pass',
      providerId: provider.id,
    });
    expect(recorded.status).toBe(201);
  });
});

describe('proveedores', () => {
  it('un nombre activo repetido, sin tildes ni mayúsculas, es NAME_TAKEN; archivado deja de listarse', async () => {
    const name = `Metrología ${key()}`;
    const first = await createProvider(lab, name);
    const repeated = await call(lab.adminMember.subject, `${lab.maintenance}/providers`, {
      method: 'POST',
      body: { name: ` ${name.toUpperCase().replace('Í', 'I')} ` },
    });
    expect(repeated.status).toBe(409);
    expect(errorCode(repeated.body)).toBe('NAME_TAKEN');

    const archived = await call(lab.adminMember.subject, `${lab.maintenance}/providers/${first.id}/archive`, { method: 'POST', key: key() });
    expect(providerContract.parse(archived.body).archivedAt).not.toBeNull();
    const listed = providerList.parse((await call(lab.adminMember.subject, `${lab.maintenance}/providers`)).body).items;
    expect(listed.map((item) => item.id)).not.toContain(first.id);
    expect((await createProvider(lab, name)).id).not.toBe(first.id);
  });

  it('editar exige la versión vista: con otra, VERSION_CONFLICT y nada cambia', async () => {
    const created = await createProvider(lab);
    const url = `${lab.maintenance}/providers/${created.id}`;
    const edited = await call(lab.adminMember.subject, url, { method: 'PATCH', body: { contact: 'lab@ejemplo.ec', expectedVersion: 1 } });
    expect(edited.status).toBe(200);
    expect(providerContract.parse(edited.body)).toMatchObject({ name: created.name, contact: 'lab@ejemplo.ec', version: 2 });

    const stale = await call(lab.adminMember.subject, url, { method: 'PATCH', body: { contact: null, expectedVersion: 1 } });
    expect(stale.status).toBe(409);
    expect(errorCode(stale.body)).toBe('VERSION_CONFLICT');
    const listed = providerList.parse((await call(lab.adminMember.subject, `${lab.maintenance}/providers`)).body).items;
    expect(listed.find((item) => item.id === created.id)?.contact).toBe('lab@ejemplo.ec');
  });
});

describe('planes', () => {
  it('el plan del tipo cubre sus equipos no dados de baja y los nuevos; la cobertura cuenta los que no tienen plan', async () => {
    const type = await createType(lab);
    const first = await createAsset(lab, { typeId: type.id });
    const created = await createPlan(lab, { assetTypeId: type.id, checklist: ['Limpiar rotor', 'Revisar tapa'] });
    expect(created).toMatchObject({ assetType: { id: type.id, name: type.name }, asset: null, assetCount: 1, version: 1 });

    await createAsset(lab, { typeId: type.id });
    expect((await planIn(created.id))?.assetCount).toBe(2);
    await call(lab.adminMember.subject, `${lab.base}/assets/${first.id}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleto' },
    });
    expect((await planIn(created.id))?.assetCount).toBe(1);

    const loose = await createAsset(lab);
    const { uncovered } = await plans();
    expect(uncovered.items.map((item) => item.id)).toContain(loose.id);
    expect(uncovered.total).toBeGreaterThanOrEqual(1);
  });

  it('el plan propio excluye al equipo del plan de su tipo con motivo «Plan propio»; el reemplazado debe ser de su tipo', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const sibling = await createAsset(lab, { typeId: type.id });
    const typePlan = await createPlan(lab, { assetTypeId: type.id });
    const otherTypePlan = await createPlan(lab, { assetTypeId: (await createType(lab)).id });

    const wrong = await call(lab.adminMember.subject, `${lab.maintenance}/plans`, {
      method: 'POST',
      body: { kind: 'calibration', title: 'Calibración', assetId: asset.id, replacesPlanId: otherTypePlan.id, intervalCount: 1, intervalUnit: 'year', startsOn: '2026-01-01' },
    });
    expect(wrong.status).toBe(400);
    expect((await planIn(typePlan.id))?.exclusions).toEqual([]);

    const own = await createPlan(lab, { kind: 'calibration', assetId: asset.id, replacesPlanId: typePlan.id, intervalUnit: 'year', intervalCount: 1 });
    expect(own).toMatchObject({ asset: { id: asset.id, code: asset.code }, assetType: null, assetCount: 1 });
    const replaced = await planIn(typePlan.id);
    expect(replaced?.assetCount).toBe(1);
    expect(replaced?.exclusions).toMatchObject([{ asset: { id: asset.id }, reason: 'Plan propio' }]);

    // Un registro con el plan del tipo ya no vale para el equipo excluido; con el hermano, sí.
    const excluded = await recordWork(lab, lab.operator.subject, { assetId: asset.id, planId: typePlan.id, performedOn: '2026-02-01', result: 'pass' });
    expect(excluded.status).toBe(400);
    expect(
      (await recordWork(lab, lab.operator.subject, { assetId: sibling.id, planId: typePlan.id, performedOn: '2026-02-01', result: 'pass' })).status,
    ).toBe(201);

    // Archivar la exclusión lo devuelve al plan del tipo; otra vez no la encuentra.
    const restore = `${lab.maintenance}/plans/${typePlan.id}/exclusions/${asset.id}/archive`;
    const restored = await call(lab.adminMember.subject, restore, { method: 'POST', key: key() });
    expect(restored.status).toBe(200);
    expect(planContract.parse(restored.body)).toMatchObject({ assetCount: 2, exclusions: [] });
    expect((await call(lab.adminMember.subject, restore, { method: 'POST', key: key() })).status).toBe(404);
  });

  it('archivar el plan propio devuelve el equipo al plan de su tipo; sin replacesPlanId no lo excluye', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const sibling = await createAsset(lab, { typeId: type.id });
    const typePlan = await createPlan(lab, { assetTypeId: type.id });

    // Un plan propio que no reemplaza: el equipo sigue también en el del tipo.
    await createPlan(lab, { kind: 'cleaning', assetId: sibling.id });
    expect(await planIn(typePlan.id)).toMatchObject({ assetCount: 2, exclusions: [] });

    const own = await createPlan(lab, { kind: 'calibration', assetId: asset.id, replacesPlanId: typePlan.id, intervalUnit: 'year', intervalCount: 1 });
    expect(await planIn(typePlan.id)).toMatchObject({ assetCount: 1, exclusions: [{ asset: { id: asset.id }, reason: 'Plan propio' }] });

    const archived = await call(lab.adminMember.subject, `${lab.maintenance}/plans/${own.id}/archive`, { method: 'POST', key: key() });
    expect(archived.status).toBe(200);
    expect(await planIn(typePlan.id)).toMatchObject({ assetCount: 2, exclusions: [] });
    expect(
      await count(`select count(*) as n from maintenance.plan_exclusions where replaced_by_plan_id = $1 and archived_at is not null`, [own.id]),
    ).toBe(1);
  });

  it('cada plan da su próxima fecha más cercana y cuántos trabajos están vencidos o no conformes', async () => {
    const type = await createType(lab);
    const late = await createAsset(lab, { typeId: type.id });
    const failed = await createAsset(lab, { typeId: type.id });
    await createAsset(lab, { typeId: type.id });
    const monthly = await createPlan(lab, { assetTypeId: type.id, intervalCount: 1, intervalUnit: 'month' });
    const today = await todayIn(lab);

    expect(await planIn(monthly.id)).toMatchObject({ nextDueOn: today, overdueCount: 0 });
    await recordWork(lab, lab.operator.subject, { assetId: late.id, planId: monthly.id, performedOn: '2026-01-05', result: 'pass' });
    await recordWork(lab, lab.operator.subject, {
      assetId: failed.id,
      planId: monthly.id,
      performedOn: today,
      result: 'fail',
      observations: 'No enciende',
    });
    expect(await planIn(monthly.id)).toMatchObject({ assetCount: 3, nextDueOn: '2026-02-05', overdueCount: 2 });
  });

  it('excluir pide un equipo del tipo del plan y no repite la exclusión vigente', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const typePlan = await createPlan(lab, { assetTypeId: type.id });
    const url = `${lab.maintenance}/plans/${typePlan.id}/exclusions`;

    const foreignType = await call(lab.adminMember.subject, url, { method: 'POST', body: { assetId: (await createAsset(lab)).id, reason: 'Otro tipo' } });
    expect(foreignType.status).toBe(400);
    const first = await call(lab.adminMember.subject, url, { method: 'POST', body: { assetId: asset.id, reason: 'En préstamo' }, key: key() });
    expect(first.status).toBe(201);
    expect(planContract.parse(first.body)).toMatchObject({ assetCount: 0, exclusions: [{ reason: 'En préstamo' }] });
    expect((await call(lab.adminMember.subject, url, { method: 'POST', body: { assetId: asset.id, reason: 'Otra vez' }, key: key() })).status).toBe(400);
  });

  it('editar exige la versión vista; archivar lo saca de la lista y ya no se edita', async () => {
    const created = await createPlan(lab, { assetTypeId: (await createType(lab)).id });
    const url = `${lab.maintenance}/plans/${created.id}`;
    const edited = await call(lab.adminMember.subject, url, {
      method: 'PATCH',
      body: { title: 'Preventivo anual', intervalCount: 1, intervalUnit: 'year', checklist: ['Lubricar'], expectedVersion: 1 },
    });
    expect(edited.status).toBe(200);
    expect(planContract.parse(edited.body)).toMatchObject({ title: 'Preventivo anual', intervalUnit: 'year', checklist: ['Lubricar'], version: 2 });

    const stale = await call(lab.adminMember.subject, url, { method: 'PATCH', body: { title: 'Viejo', expectedVersion: 1 } });
    expect(stale.status).toBe(409);
    expect(errorCode(stale.body)).toBe('VERSION_CONFLICT');
    expect((await planIn(created.id))?.title).toBe('Preventivo anual');

    const archived = await call(lab.adminMember.subject, `${url}/archive`, { method: 'POST', key: key() });
    expect(planContract.parse(archived.body).archivedAt).not.toBeNull();
    expect(await planIn(created.id)).toBeUndefined();
    expect((await call(lab.adminMember.subject, url, { method: 'PATCH', body: { title: 'Tarde', expectedVersion: 3 } })).status).toBe(400);
  });

  it('el plan es de un tipo o de un equipo, nunca de los dos ni de uno dado de baja', async () => {
    const type = await createType(lab);
    const asset = await createAsset(lab, { typeId: type.id });
    const base = { kind: 'preventive', title: 'Plan', intervalCount: 1, intervalUnit: 'month', startsOn: '2026-01-01' };
    const both = await call(lab.adminMember.subject, `${lab.maintenance}/plans`, { method: 'POST', body: { ...base, assetTypeId: type.id, assetId: asset.id } });
    expect(both.status).toBe(400);
    await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/condition`, { method: 'POST', body: { condition: 'retired', reason: 'Obsoleto' } });
    const retired = await call(lab.adminMember.subject, `${lab.maintenance}/plans`, { method: 'POST', body: { ...base, assetId: asset.id } });
    expect(retired.status).toBe(400);
  });
});

describe('aislamiento', () => {
  it('los planes, proveedores y equipos de otro espacio no existen', async () => {
    const foreignType = await createType(other);
    const foreignAsset = await createAsset(other, { typeId: foreignType.id });
    const foreignPlan = await createPlan(other, { assetTypeId: foreignType.id });
    const foreignProvider = await createProvider(other);

    expect((await plans()).items.map((item) => item.id)).not.toContain(foreignPlan.id);
    const base = { kind: 'preventive', title: 'Plan', intervalCount: 1, intervalUnit: 'month', startsOn: '2026-01-01' };
    expect((await call(lab.adminMember.subject, `${lab.maintenance}/plans`, { method: 'POST', body: { ...base, assetTypeId: foreignType.id } })).status).toBe(404);
    expect((await call(lab.adminMember.subject, `${lab.maintenance}/plans`, { method: 'POST', body: { ...base, assetId: foreignAsset.id } })).status).toBe(404);
    expect((await call(lab.adminMember.subject, `${lab.maintenance}/plans/${foreignPlan.id}/archive`, { method: 'POST' })).status).toBe(404);
    expect((await call(lab.adminMember.subject, `${lab.maintenance}/providers/${foreignProvider.id}`, { method: 'PATCH', body: { name: 'Mío', expectedVersion: 1 } })).status).toBe(404);
    // Un miembro de otro espacio no entra a este.
    expect((await call(other.adminMember.subject, `${lab.maintenance}/plans`)).status).toBe(403);
  });
});
