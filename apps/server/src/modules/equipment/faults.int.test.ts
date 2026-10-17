import { beforeAll, describe, expect, it } from 'vitest';
import { asset as assetContract, assetHistory, fault as faultContract, faultList, reportableAsset, reportableAssetList } from '@platlab/contracts';
import { call, createAsset, createEquipmentLab, errorCode, type EquipmentLab } from './equipment.fixtures.js';

/** E-01b (ADR 0019): Reportes de fallas por la API, con los permisos de Equipos. */

let lab: EquipmentLab;
let other: EquipmentLab;

beforeAll(async () => {
  lab = await createEquipmentLab();
  other = await createEquipmentLab();
});

const report = (subject: string, body: Record<string, unknown>) => call(subject, `${lab.base}/faults`, { method: 'POST', body });
const conditionOf = async (assetId: string) =>
  assetContract.parse((await call(lab.adminMember.subject, `${lab.base}/assets/${assetId}`)).body).condition;

describe('reportar', () => {
  it('el Docente reporta que no se puede usar: el equipo pasa a fuera de servicio ligado a la falla', async () => {
    const asset = await createAsset(lab);
    const reported = await report(lab.teacher.subject, {
      assetId: asset.id,
      faultType: 'electrical',
      description: 'No enciende',
      usable: false,
    });
    expect(reported.status).toBe(201);
    expect(faultContract.parse(reported.body)).toMatchObject({ status: 'open', reportedBy: { name: 'Docente' }, asset: { id: asset.id } });
    expect(await conditionOf(asset.id)).toBe('faulted');
    const history = assetHistory.parse((await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/history`)).body);
    expect(history.items[0]).toMatchObject({ kind: 'condition', from: 'operational', to: 'faulted', actor: 'Docente' });
  });

  it('si se puede seguir usando, la condición no cambia; un equipo dado de baja no se reporta', async () => {
    const asset = await createAsset(lab);
    expect((await report(lab.operator.subject, { assetId: asset.id, faultType: 'other', description: 'Ruido leve', usable: true })).status).toBe(201);
    expect(await conditionOf(asset.id)).toBe('operational');

    await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleto' },
    });
    expect((await report(lab.operator.subject, { assetId: asset.id, faultType: 'other', description: 'x', usable: true })).status).toBe(400);
  });

  it('quien solo reporta busca el equipo por nombre sin ver su ficha completa, y no ve el inventario', async () => {
    const asset = await createAsset(lab, { name: `Espectrofotómetro ${lab.workspace.code}` });
    const found = reportableAssetList.parse(
      (await call(lab.teacher.subject, `${lab.base}/faults/assets?q=${encodeURIComponent('espectrofotometro')}`)).body,
    );
    expect(found.items.map((item) => item.id)).toContain(asset.id);
    expect(Object.keys(found.items[0]!)).toEqual(['id', 'code', 'name', 'photoUrl', 'location']);
    expect((await call(lab.teacher.subject, `${lab.base}/assets`)).status).toBe(403);
  });

  it('el QR de la etiqueta da el equipo a quien solo reporta; uno dado de baja o de otro espacio no se encuentra', async () => {
    const asset = await createAsset(lab);
    const scanned = await call(lab.teacher.subject, `${lab.base}/faults/assets/${asset.id}`);
    expect(scanned.status).toBe(200);
    expect(reportableAsset.parse(scanned.body)).toMatchObject({ id: asset.id, code: asset.code, name: asset.name });
    expect(Object.keys(scanned.body as object)).toEqual(['id', 'code', 'name', 'photoUrl', 'location']);

    const foreign = await createAsset(other);
    const crossed = await call(lab.teacher.subject, `${lab.base}/faults/assets/${foreign.id}`);
    expect(crossed.status).toBe(404);
    expect(errorCode(crossed.body)).toBe('NOT_FOUND');
    expect((await call(lab.teacher.subject, `${lab.base}/faults/assets/no-es-un-id`)).status).toBe(400);

    await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleto' },
    });
    expect((await call(lab.teacher.subject, `${lab.base}/faults/assets/${asset.id}`)).status).toBe(404);
  });
});

describe('empezar la reparación y solucionar', () => {
  it('el Operador lleva el incidente de reportado a solucionado y el equipo vuelve a operativo con el resultado', async () => {
    const asset = await createAsset(lab);
    const { id } = faultContract.parse(
      (await report(lab.teacher.subject, { assetId: asset.id, faultType: 'mechanical', description: 'Vibra', usable: false })).body,
    );
    const url = `${lab.base}/faults/${id}`;

    expect((await call(lab.teacher.subject, `${url}/attend`, { method: 'POST' })).status).toBe(403);
    const attended = await call(lab.operator.subject, `${url}/attend`, { method: 'POST' });
    expect(faultContract.parse(attended.body)).toMatchObject({ status: 'in_progress', attendedBy: { name: 'Operador' } });
    const again = await call(lab.adminMember.subject, `${url}/attend`, { method: 'POST' });
    expect(again.status).toBe(409);
    expect(errorCode(again.body)).toBe('REQUEST_RESOLVED');

    const resolved = await call(lab.operator.subject, `${url}/resolve`, {
      method: 'POST',
      body: { resolution: 'Cambio de rodamiento', returnToOperational: true },
    });
    expect(faultContract.parse(resolved.body)).toMatchObject({ status: 'resolved', resolution: 'Cambio de rodamiento' });
    expect(await conditionOf(asset.id)).toBe('operational');
    const history = assetHistory.parse((await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/history`)).body);
    expect(history.items[0]).toMatchObject({ kind: 'condition', from: 'faulted', to: 'operational', result: 'Cambio de rodamiento' });

    // Solucionado es el último paso (E-01c): no se vuelve a solucionar ni existe «cerrar».
    const twice = await call(lab.operator.subject, `${url}/resolve`, {
      method: 'POST',
      body: { resolution: 'Otra vez', returnToOperational: false },
    });
    expect(twice.status).toBe(409);
    expect(errorCode(twice.body)).toBe('REQUEST_RESOLVED');
    expect((await call(lab.operator.subject, `${url}/close`, { method: 'POST' })).status).toBe(404);
  });

  it('resolver sin devolver a operativo deja la condición; resolver una abierta la da por atendida', async () => {
    const asset = await createAsset(lab);
    const { id } = faultContract.parse(
      (await report(lab.operator.subject, { assetId: asset.id, faultType: 'spare_part', description: 'Falta repuesto', usable: false })).body,
    );
    const resolved = await call(lab.operator.subject, `${lab.base}/faults/${id}/resolve`, {
      method: 'POST',
      body: { resolution: 'Repuesto pedido; queda fuera de servicio', returnToOperational: false },
    });
    expect(faultContract.parse(resolved.body)).toMatchObject({ status: 'resolved', attendedBy: { name: 'Operador' } });
    expect(await conditionOf(asset.id)).toBe('faulted');
  });
});

describe('alcance y listas', () => {
  it('quien solo reporta ve los suyos; quien atiende, todos; la lista pagina', async () => {
    const asset = await createAsset(lab);
    const mine = faultContract.parse(
      (await report(lab.teacher.subject, { assetId: asset.id, faultType: 'other', description: 'Mía', usable: true })).body,
    );
    const theirs = faultContract.parse(
      (await report(lab.operator.subject, { assetId: asset.id, faultType: 'other', description: 'Del Operador', usable: true })).body,
    );

    const teacherList = faultList.parse((await call(lab.teacher.subject, `${lab.base}/faults?asset=${asset.id}`)).body);
    expect(teacherList.items.map((item) => item.id)).toEqual([mine.id]);
    expect((await call(lab.teacher.subject, `${lab.base}/faults/${theirs.id}`)).status).toBe(404);

    const operatorList = faultList.parse((await call(lab.operator.subject, `${lab.base}/faults?asset=${asset.id}&limit=1`)).body);
    expect(operatorList.items.map((item) => item.id)).toEqual([theirs.id]);
    const next = faultList.parse(
      (await call(lab.operator.subject, `${lab.base}/faults?asset=${asset.id}&limit=1&cursor=${operatorList.nextCursor}`)).body,
    );
    expect(next.items.map((item) => item.id)).toEqual([mine.id]);
    expect(next.nextCursor).toBeNull();
  });

  it('una falla de otro espacio no existe para este', async () => {
    const foreignAsset = await createAsset(other);
    const foreign = faultContract.parse(
      (await call(other.operator.subject, `${other.base}/faults`, {
        method: 'POST',
        body: { assetId: foreignAsset.id, faultType: 'other', description: 'Ajena', usable: true },
      })).body,
    );
    expect((await call(lab.operator.subject, `${lab.base}/faults/${foreign.id}`)).status).toBe(404);
    expect((await call(lab.operator.subject, `${lab.base}/faults/${foreign.id}/attend`, { method: 'POST' })).status).toBe(404);
    expect((await report(lab.operator.subject, { assetId: foreignAsset.id, faultType: 'other', description: 'x', usable: true })).status).toBe(404);
  });

  it('lo pendiente del Inicio: quien atiende ve las que nadie atiende; quien reporta, las suyas abiertas', async () => {
    const fresh = await createEquipmentLab();
    const asset = await createAsset(fresh);
    await call(fresh.teacher.subject, `${fresh.base}/faults`, {
      method: 'POST',
      body: { assetId: asset.id, faultType: 'other', description: 'Una', usable: true },
    });
    await call(fresh.operator.subject, `${fresh.base}/faults`, {
      method: 'POST',
      body: { assetId: asset.id, faultType: 'other', description: 'Dos', usable: true },
    });
    const pending = async (subject: string) => {
      const home = (await call(subject, `/workspaces/${fresh.workspace.id}/home`)).body as {
        cards: Array<{ moduleCode: string; summary: Record<string, number> | null }>;
      };
      return home.cards.find((card) => card.moduleCode === 'equipment')?.summary;
    };
    expect(await pending(fresh.operator.subject)).toMatchObject({ openFaults: 2, pendingRequests: 2 });
    expect(await pending(fresh.teacher.subject)).toMatchObject({ openFaults: 2, pendingRequests: 1 });
  });
});
