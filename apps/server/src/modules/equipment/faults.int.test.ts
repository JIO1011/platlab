import { beforeAll, describe, expect, it } from 'vitest';
import {
  asset as assetContract,
  assetDocument,
  assetHistory,
  fault as faultContract,
  faultCounts,
  faultList,
  faultStats,
  reportableAsset,
  reportableAssetList,
} from '@platlab/contracts';
import {
  admin,
  call,
  createAsset,
  createEquipmentLab,
  errorCode,
  pdf,
  uploadDocument,
  type EquipmentLab,
} from './equipment.fixtures.js';

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

describe('Resumen e Incidentes (ADR 0019, 17-10-2026)', () => {
  const DAY = 86_400;
  /** Cada paso se espera con unos segundos de holgura: el reloj corre entre la petición y la cuenta. */
  const near = (value: number, expected: number) => expect(Math.abs(value - expected)).toBeLessThan(120);

  it('las pestañas cuentan cada paso con el alcance de la lista: quien reporta, solo lo suyo', async () => {
    const fresh = await createEquipmentLab();
    const asset = await createAsset(fresh);
    const reportBy = async (subject: string, description: string) =>
      faultContract.parse(
        (await call(subject, `${fresh.base}/faults`, { method: 'POST', body: { assetId: asset.id, faultType: 'other', description, usable: true } }))
          .body,
      );
    await reportBy(fresh.teacher.subject, 'Reportada');
    const attended = await reportBy(fresh.teacher.subject, 'En reparación');
    const solved = await reportBy(fresh.operator.subject, 'Solucionada');
    await call(fresh.operator.subject, `${fresh.base}/faults/${attended.id}/attend`, { method: 'POST' });
    await call(fresh.operator.subject, `${fresh.base}/faults/${solved.id}/resolve`, {
      method: 'POST',
      body: { resolution: 'Listo', returnToOperational: false },
    });

    const counts = async (subject: string) => faultCounts.parse((await call(subject, `${fresh.base}/faults/counts`)).body);
    expect(await counts(fresh.operator.subject)).toEqual({ open: 1, inProgress: 1, resolved: 1 });
    expect(await counts(fresh.teacher.subject)).toEqual({ open: 1, inProgress: 1, resolved: 0 });
  });

  it('«Incidentes en 12 meses»: los meses del espacio, la reparación promedio y los días fuera de servicio recortados al período', async () => {
    const fresh = await createEquipmentLab();
    const statsOf = async () => faultStats.parse((await call(fresh.operator.subject, `${fresh.base}/faults/stats`)).body);
    // El período empieza el primer día del mes de hace 11 meses, en la zona del espacio.
    const { rows } = await admin.query<{ current: string; first: string; since_seconds: string }>(
      `select to_char(now() at time zone w.time_zone, 'YYYY-MM') as current,
              to_char(date_trunc('month', now() at time zone w.time_zone) - interval '11 months', 'YYYY-MM') as first,
              extract(epoch from now() - ((date_trunc('month', now() at time zone w.time_zone) - interval '11 months') at time zone w.time_zone)) as since_seconds
         from core.workspaces as w where w.id = $1`,
      [fresh.workspace.id],
    );
    const period = rows[0]!;

    const empty = await statsOf();
    expect(empty.months).toHaveLength(12);
    expect(empty.months[0]!.month).toBe(period.first);
    expect(empty.months[11]!.month).toBe(period.current);
    expect(empty.months.every((month) => month.reported === 0 && month.resolved === 0)).toBe(true);
    expect(empty).toMatchObject({ meanRepairSeconds: null, outOfService: { seconds: 0, assets: 0 } });

    const backdate = (sql: string, id: string, days: number) => admin.query(sql, [id, `${days} days`]);
    const reportCase = `update incidents.cases set reported_at = now() - $2::interval where id = $1`;
    const toFaulted = `update equipment.condition_changes set occurred_at = now() - $2::interval where asset_id = $1 and to_condition = 'faulted'`;
    const toRetired = `update equipment.condition_changes set occurred_at = now() - $2::interval where asset_id = $1 and to_condition = 'retired'`;

    // Reportado hace 3 días sin poder usarse y solucionado ahora: 3 días de reparación y 3 fuera de servicio.
    const repaired = await createAsset(fresh);
    const fault = faultContract.parse(
      (await call(fresh.teacher.subject, `${fresh.base}/faults`, {
        method: 'POST',
        body: { assetId: repaired.id, faultType: 'electrical', description: 'No enciende', usable: false },
      })).body,
    );
    await backdate(reportCase, fault.id, 3);
    await backdate(toFaulted, repaired.id, 3);
    await call(fresh.operator.subject, `${fresh.base}/faults/${fault.id}/resolve`, {
      method: 'POST',
      body: { resolution: 'Fusible cambiado', returnToOperational: true },
    });

    // Fuera de servicio desde hace 14 meses y todavía: cuenta solo desde el inicio del período. Su incidente,
    // reportado antes del período, no cuenta entre los reportados.
    const stale = await createAsset(fresh);
    const old = faultContract.parse(
      (await call(fresh.operator.subject, `${fresh.base}/faults`, {
        method: 'POST',
        body: { assetId: stale.id, faultType: 'spare_part', description: 'Sin repuesto', usable: false },
      })).body,
    );
    await backdate(reportCase, old.id, 425);
    await backdate(toFaulted, stale.id, 425);

    // Fuera de servicio hace 10 días y dado de baja hace 5: cuentan los 5 días anteriores a la baja.
    const retired = await createAsset(fresh);
    const change = (condition: string, reason: string) =>
      call(fresh.adminMember.subject, `${fresh.base}/assets/${retired.id}/condition`, { method: 'POST', body: { condition, reason } });
    await change('faulted', 'Se quemó la resistencia');
    await backdate(toFaulted, retired.id, 10);
    await change('retired', 'Irreparable');
    await backdate(toRetired, retired.id, 5);

    const stats = await statsOf();
    expect(stats.months.reduce((sum, month) => sum + month.reported, 0)).toBe(1);
    expect(stats.months.reduce((sum, month) => sum + month.resolved, 0)).toBe(1);
    expect(stats.months[11]!.resolved).toBe(1);
    near(stats.meanRepairSeconds!, 3 * DAY);
    expect(stats.outOfService.assets).toBe(3);
    near(stats.outOfService.seconds, 3 * DAY + Number(period.since_seconds) + 5 * DAY);

    // Las cifras de todo el espacio son de quien atiende: quien solo reporta no las ve.
    expect((await call(fresh.teacher.subject, `${fresh.base}/faults/stats`)).status).toBe(403);
  });
});

describe('garantía en el incidente (E-01e)', () => {
  it('reportado con la garantía vigente trae su fecha, el proveedor y la garantía en PDF; vencida, nada', async () => {
    const covered = await createAsset(lab, { supplier: 'Proveedor Andino', warrantyUntil: '2099-12-31' });
    const warranty = assetDocument.parse(
      (await uploadDocument(lab, lab.adminMember.subject, covered.id, pdf('garantía'), { kind: 'warranty', title: 'Garantía' })).body,
    );
    await uploadDocument(lab, lab.adminMember.subject, covered.id, pdf('manual'), { kind: 'manual', title: 'Manual' });
    const reported = await report(lab.teacher.subject, { assetId: covered.id, faultType: 'other', description: 'Ruido', usable: true });
    const fault = faultContract.parse(reported.body);
    expect(fault.warranty).toEqual({ until: '2099-12-31', supplier: 'Proveedor Andino', documentUrl: warranty.url });
    expect(faultContract.parse((await call(lab.operator.subject, `${lab.base}/faults/${fault.id}`)).body).warranty).toEqual(fault.warranty);

    const expired = await createAsset(lab, { supplier: 'Proveedor Andino', warrantyUntil: '2020-01-01' });
    const late = await report(lab.teacher.subject, { assetId: expired.id, faultType: 'other', description: 'Ruido', usable: true });
    expect(faultContract.parse(late.body).warranty).toBeNull();
  });
});
