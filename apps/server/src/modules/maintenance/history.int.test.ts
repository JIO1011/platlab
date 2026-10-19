import { beforeAll, describe, expect, it } from 'vitest';
import { errorResponse, maintenanceAreaList, recordCreated, recordList } from '@platlab/contracts';
import { admin, call, count, download } from '../../testing/api.js';
import { readZipEntry } from '../../testing/zip.js';
import {
  createAsset,
  createMaintenanceLab,
  createPlan,
  createProvider,
  createType,
  recordWork,
  shiftDate,
  todayIn,
  type MaintenanceLab,
} from './maintenance.fixtures.js';

/**
 * M-01d (ADR 0020): el Historial para el auditor por la API. Filtros por periodo, tipo, resultado, área y
 * proveedor, con el área y el requisito en cada registro, y el Excel del Administrador. Un espacio propio:
 * los filtros recorren todo el espacio.
 */

let lab: MaintenanceLab;
let today: string;
let ids: Record<'calibration' | 'cleaning' | 'corrective' | 'voided', string>;

const records = async (query = '', subject = lab.operator.subject) => {
  const response = await call(subject, `${lab.maintenance}/records${query ? `?${query}` : ''}`);
  expect(response.status).toBe(200);
  return recordList.parse(response.body);
};
const idsOf = async (query: string) => (await records(query)).items.map((item) => item.id).sort();

async function done(body: Record<string, unknown>) {
  const response = await recordWork(lab, lab.operator.subject, body);
  expect(response.status).toBe(201);
  return recordCreated.parse(response.body);
}

beforeAll(async () => {
  lab = await createMaintenanceLab();
  today = await todayIn(lab);
  const type = await createType(lab);
  // Un equipo en cada área: el laboratorio (con su estante) y el otro laboratorio.
  const balance = await createAsset(lab, { typeId: type.id, locationId: lab.shelf, name: 'Balanza analítica' });
  const hood = await createAsset(lab, { typeId: type.id, locationId: lab.otherLab, name: 'Campana' });
  const provider = await createProvider(lab, 'Metrología del Sur');
  const plan = await createPlan(lab, {
    kind: 'calibration',
    title: 'Calibración anual',
    assetId: balance.id,
    intervalCount: 1,
    intervalUnit: 'year',
    startsOn: shiftDate(today, -400),
    requirement: 'ISO/IEC 17025 6.4.7',
  });

  const calibration = await done({ planId: plan.id, assetId: balance.id, performedOn: shiftDate(today, -40), result: 'pass', providerId: provider.id, cost: '120.50' });
  const cleaning = await done({ assetId: hood.id, kind: 'cleaning', performedOn: shiftDate(today, -10), result: 'pass_with_observations', observations: 'Filtro sucio' });
  const corrective = await done({ assetId: hood.id, kind: 'corrective', performedOn: today, result: 'fail', observations: 'Motor sin arreglo' });
  const voided = await done({ assetId: balance.id, kind: 'cleaning', performedOn: shiftDate(today, -5), result: 'pass' });
  const annulled = await call(lab.adminMember.subject, `${lab.maintenance}/records/${voided.id}/void`, {
    method: 'POST',
    body: { reason: 'Equipo equivocado' },
    key: `anular-${voided.id}`,
  });
  expect(annulled.status).toBe(200);
  ids = { calibration: calibration.id, cleaning: cleaning.id, corrective: corrective.id, voided: voided.id };
});

describe('filtros del Historial', () => {
  it('cada registro lleva el área del equipo y el requisito de su plan', async () => {
    const { items } = await records();
    const calibration = items.find((item) => item.id === ids.calibration);
    expect(calibration?.asset.area).not.toBeNull();
    expect(calibration?.plan?.requirement).toBe('ISO/IEC 17025 6.4.7');
    expect(items.find((item) => item.id === ids.cleaning)?.plan).toBeNull();
  });

  it('las áreas del filtro son las que tienen equipos; el Docente no entra', async () => {
    const response = await call(lab.operator.subject, `${lab.maintenance}/areas`);
    expect(response.status).toBe(200);
    const areas = maintenanceAreaList.parse(response.body).items.map((area) => area.id);
    expect(areas.sort()).toEqual([lab.lab, lab.otherLab].sort());
    expect((await call(lab.teacher.subject, `${lab.maintenance}/areas`)).status).toBe(403);
  });

  it('sin filtros, todo, con los anulados a la vista', async () => {
    expect(await idsOf('')).toEqual(Object.values(ids).sort());
  });

  it('el periodo va por la fecha del trabajo, con los dos extremos incluidos', async () => {
    expect(await idsOf(`from=${shiftDate(today, -10)}&to=${shiftDate(today, -5)}`)).toEqual([ids.cleaning, ids.voided].sort());
    expect(await idsOf(`from=${today}`)).toEqual([ids.corrective]);
    expect(await idsOf(`to=${shiftDate(today, -40)}`)).toEqual([ids.calibration]);
  });

  it('un periodo al revés se rechaza', async () => {
    const response = await call(lab.operator.subject, `${lab.maintenance}/records?from=${today}&to=${shiftDate(today, -1)}`);
    expect(response.status).toBe(400);
  });

  it('tipo y resultado admiten varios valores', async () => {
    expect(await idsOf('kind=cleaning')).toEqual([ids.cleaning, ids.voided].sort());
    expect(await idsOf('kind=calibration&kind=corrective')).toEqual([ids.calibration, ids.corrective].sort());
    expect(await idsOf('result=fail&result=pass_with_observations')).toEqual([ids.cleaning, ids.corrective].sort());
  });

  it('el área incluye lo que está debajo de ella', async () => {
    expect(await idsOf(`area=${lab.lab}`)).toEqual([ids.calibration, ids.voided].sort());
    expect(await idsOf(`area=${lab.otherLab}`)).toEqual([ids.cleaning, ids.corrective].sort());
  });

  it('el proveedor, con «Interno» para el trabajo sin proveedor', async () => {
    const [calibration] = (await records('kind=calibration')).items;
    const providerId = calibration!.provider!.id;
    expect(await idsOf(`provider=${providerId}`)).toEqual([ids.calibration]);
    expect(await idsOf('provider=internal')).toEqual([ids.cleaning, ids.corrective, ids.voided].sort());
    expect(await idsOf(`provider=internal&provider=${providerId}`)).toEqual(Object.values(ids).sort());
  });

  it('los filtros se combinan y la página siguiente los conserva', async () => {
    expect(await idsOf(`kind=cleaning&area=${lab.otherLab}`)).toEqual([ids.cleaning]);
    const first = await records('provider=internal&limit=2');
    expect(first.items).toHaveLength(2);
    const second = await records(`provider=internal&limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`);
    expect([...first.items, ...second.items].map((item) => item.id).sort()).toEqual([ids.cleaning, ids.corrective, ids.voided].sort());
    expect(second.nextCursor).toBeNull();
  });
});

describe('Excel del Historial', () => {
  it('el Administrador descarga lo filtrado, con los anulados, el encabezado y en la auditoría', async () => {
    const file = await download(lab.adminMember.subject, `${lab.maintenance}/records/export?kind=cleaning&kind=calibration`);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(file.headers['content-disposition']).toMatch(/^attachment; filename="historial-mantenimiento-\d{4}-\d{2}-\d{2}\.xlsx"$/);

    const sheet = readZipEntry(file.bytes, 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('Filtros: Tipo: Limpieza, Calibración');
    expect(sheet).toContain('Generado el');
    expect(sheet).toContain('ISO/IEC 17025 6.4.7');
    expect(sheet).toContain('Metrología del Sur');
    expect(sheet).toContain('Filtro sucio');
    expect(sheet).toContain('Equipo equivocado');
    expect(sheet).not.toContain('Motor sin arreglo');
    // Seis filas de encabezado y tres registros.
    expect(sheet).toContain('<row r="9">');
    expect(sheet).not.toContain('<row r="10">');

    expect(
      await count(
        `select count(*) as n from core.audit_events
          where workspace_id = $1 and action = 'maintenance.history.export' and (changes ->> 'rows')::int = 3`,
        [lab.workspace.id],
      ),
    ).toBe(1);
  });

  it('sale por lotes: más de 500 registros llegan todos', async () => {
    const asset = await createAsset(lab, { locationId: lab.lab, name: 'Lote exportable' });
    await admin.query(
      `insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, observations, recorded_by_principal_id)
       select $1, $2, 'cleaning', $3::date, 'pass', 'LOTE-' || lpad(g::text, 4, '0'), $4 from generate_series(1, 501) as g`,
      [lab.workspace.id, asset.id, shiftDate(today, -1), lab.operator.principalId],
    );
    const file = await download(lab.adminMember.subject, `${lab.maintenance}/records/export?from=${shiftDate(today, -1)}&to=${shiftDate(today, -1)}`);
    expect(file.status).toBe(200);
    const sheet = readZipEntry(file.bytes, 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('LOTE-0001');
    expect(sheet).toContain('LOTE-0501');
    expect(sheet).toContain('<row r="507">');
    expect(sheet).not.toContain('<row r="508">');
  });

  it('el Operador filtra e imprime, pero el Excel es un reporte del Administrador', async () => {
    const file = await download(lab.operator.subject, `${lab.maintenance}/records/export`);
    expect(file.status).toBe(403);
    expect(errorResponse.parse(JSON.parse(file.bytes.toString('utf8'))).error.code).toBe('ACCESS_DENIED');
  });

  it('un filtro inválido se rechaza antes de empezar la descarga', async () => {
    const file = await download(lab.adminMember.subject, `${lab.maintenance}/records/export?result=perfecto`);
    expect(file.status).toBe(400);
  });
});
