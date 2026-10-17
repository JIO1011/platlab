import { beforeAll, describe, expect, it } from 'vitest';
import { areaList, areaManager, areaTypeList, assetHistory, assetList, assetTotals, errorResponse, locationList } from '@platlab/contracts';
import { todayIn } from './application/filters.js';
import { addLocation, addMember, revokeMembership } from '../../testing/core-fixtures.js';
import { readZipEntry } from '../../testing/zip.js';
import {
  admin,
  auditsIn,
  call,
  count,
  createAsset,
  createEquipmentLab,
  createType,
  download,
  errorCode,
  type EquipmentLab,
} from './equipment.fixtures.js';

/** E-01c (ADR 0019): Inventario por áreas con encargado, nombres de ubicación plegados y Excel del Informe. */

let lab: EquipmentLab;
let other: EquipmentLab;

beforeAll(async () => {
  lab = await createEquipmentLab();
  other = await createEquipmentLab();
});

const areas = async (subject = lab.adminMember.subject) => areaList.parse((await call(subject, `${lab.base}/areas`)).body).items;
const assign = (subject: string, areaId: string, managerId: string | null) =>
  call(subject, `${lab.base}/areas/${areaId}/manager`, { method: 'PUT', body: { managerId } });
const setCondition = (assetId: string, condition: string) =>
  call(lab.adminMember.subject, `${lab.base}/assets/${assetId}/condition`, { method: 'POST', body: { condition, reason: 'Prueba' } });

describe('tarjetas de área', () => {
  it('cuentan los equipos de todos los niveles del área, sin los dados de baja, en orden alfabético', async () => {
    await createAsset(lab, { locationId: lab.lab });
    await createAsset(lab, { locationId: lab.shelf });
    const faulted = await createAsset(lab, { locationId: lab.otherLab });
    expect((await setCondition(faulted.id, 'faulted')).status).toBe(201);
    const retired = await createAsset(lab, { locationId: lab.otherLab });
    expect((await setCondition(retired.id, 'retired')).status).toBe(201);
    // Un área cuyo único equipo está dado de baja no aparece.
    const emptied = await addLocation(admin, lab.workspace.id, { kind: 'room' });
    const gone = await createAsset(lab, { locationId: emptied });
    expect((await setCondition(gone.id, 'retired')).status).toBe(201);

    const items = await areas();
    expect(items.map((item) => item.id).sort()).toEqual([lab.lab, lab.otherLab].sort());
    expect(items.map((item) => item.name)).toEqual([...items.map((item) => item.name)].sort((a, b) => a.localeCompare(b)));
    expect(items.find((item) => item.id === lab.lab)).toMatchObject({ total: 2, faulted: 0, restricted: 0, manager: null });
    expect(items.find((item) => item.id === lab.otherLab)).toMatchObject({ total: 1, faulted: 1, restricted: 0, retired: 1 });
    expect(items[0]?.parentName).not.toBeNull();
  });

  it('el área se agrupa por tipo con sus cifras, y cada equipo dice su área', async () => {
    const fresh = await createEquipmentLab();
    const scope = (url: string) => call(fresh.adminMember.subject, `${fresh.base}${url}`);
    const microscope = await createType(fresh, 'Microscopio óptico');
    const balance = await createType(fresh, 'Balanza');
    const inShelf = await createAsset(fresh, { typeId: microscope.id, locationId: fresh.shelf });
    await createAsset(fresh, { typeId: microscope.id, locationId: fresh.lab });
    const limited = await createAsset(fresh, { typeId: balance.id, locationId: fresh.lab });
    await call(fresh.adminMember.subject, `${fresh.base}/assets/${limited.id}/condition`, {
      method: 'POST',
      body: { condition: 'restricted', reason: 'Sin calibrar' },
    });
    const gone = await createAsset(fresh, { typeId: balance.id, locationId: fresh.lab });
    await call(fresh.adminMember.subject, `${fresh.base}/assets/${gone.id}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleta' },
    });

    const types = areaTypeList.parse((await scope(`/areas/${fresh.lab}/types`)).body).items;
    expect(types).toEqual([
      { type: { id: balance.id, name: 'Balanza' }, total: 1, operational: 0, restricted: 1, faulted: 0, photoUrl: null },
      { type: { id: microscope.id, name: 'Microscopio óptico' }, total: 2, operational: 2, restricted: 0, faulted: 0, photoUrl: null },
    ]);
    // Un estante no es un área: no agrupa nada.
    expect(areaTypeList.parse((await scope(`/areas/${fresh.shelf}/types`)).body).items).toEqual([]);
    expect(inShelf.location.areaId).toBe(fresh.lab);
  });

  it('el Operador las ve; el Docente, que solo reporta incidentes, no', async () => {
    expect((await call(lab.operator.subject, `${lab.base}/areas`)).status).toBe(200);
    const teacher = await call(lab.teacher.subject, `${lab.base}/areas`);
    expect(teacher.status).toBe(403);
    expect(errorCode(teacher.body)).toBe('ACCESS_DENIED');
  });
});

describe('encargado del área', () => {
  it('el Administrador lo asigna y lo quita; queda en la auditoría y en las ubicaciones', async () => {
    const audits = await auditsIn(lab.workspace.id);
    const assigned = await assign(lab.adminMember.subject, lab.lab, lab.operator.principalId);
    expect(assigned.status).toBe(200);
    expect(areaManager.parse(assigned.body)).toEqual({ areaId: lab.lab, managerId: lab.operator.principalId });
    expect((await areas()).find((item) => item.id === lab.lab)?.manager).toEqual({ id: lab.operator.principalId, name: 'Operador' });
    expect(await auditsIn(lab.workspace.id)).toBe(audits + 1);

    // Asignar el mismo no escribe ni audita otra vez.
    expect((await assign(lab.adminMember.subject, lab.lab, lab.operator.principalId)).status).toBe(200);
    expect(await auditsIn(lab.workspace.id)).toBe(audits + 1);

    // Las ubicaciones dicen su área y, la del área, su encargado: con eso el alta propone al responsable.
    const locations = locationList.parse((await call(lab.adminMember.subject, `${lab.base}/locations`)).body).items;
    expect(locations.find((location) => location.id === lab.lab)).toMatchObject({ areaId: lab.lab, managerId: lab.operator.principalId });
    expect(locations.find((location) => location.id === lab.shelf)).toMatchObject({ areaId: lab.lab, managerId: null });

    expect((await assign(lab.adminMember.subject, lab.lab, null)).status).toBe(200);
    expect((await areas()).find((item) => item.id === lab.lab)?.manager).toBeNull();
  });

  it('solo el Administrador lo asigna, solo en un área y solo a un miembro activo del espacio', async () => {
    const byOperator = await assign(lab.operator.subject, lab.lab, lab.operator.principalId);
    expect(byOperator.status).toBe(403);
    expect(errorCode(byOperator.body)).toBe('ACCESS_DENIED');

    // Un estante está dentro del área: no es un área.
    expect(errorCode((await assign(lab.adminMember.subject, lab.shelf, lab.operator.principalId)).body)).toBe('NOT_FOUND');
    // El área de otro espacio no existe para este.
    expect(errorCode((await assign(lab.adminMember.subject, other.lab, lab.operator.principalId)).body)).toBe('NOT_FOUND');

    const outsider = await assign(lab.adminMember.subject, lab.lab, other.operator.principalId);
    expect(outsider.status).toBe(400);
    expect(errorCode(outsider.body)).toBe('VALIDATION_FAILED');

    const leaving = await addMember(admin, lab.workspace.id, { roles: [{ role: 'operator' }], displayName: 'Saliente' });
    await revokeMembership(admin, leaving.membershipId);
    expect(errorCode((await assign(lab.adminMember.subject, lab.lab, leaving.principalId)).body)).toBe('VALIDATION_FAILED');
  });
});

describe('estado físico', () => {
  it('cambiarlo desde la ficha deja un hecho en el historial; editar otro dato, no', async () => {
    const asset = await createAsset(lab, { conservation: 'good' });
    const url = `${lab.base}/assets/${asset.id}`;
    const history = async () => assetHistory.parse((await call(lab.adminMember.subject, `${url}/history`)).body).items;

    expect((await call(lab.adminMember.subject, url, { method: 'PATCH', body: { brand: 'Olympus' } })).status).toBe(200);
    expect((await history()).some((event) => event.kind === 'conservation')).toBe(false);

    expect((await call(lab.adminMember.subject, url, { method: 'PATCH', body: { conservation: 'fair' } })).status).toBe(200);
    expect((await history())[0]).toMatchObject({ kind: 'conservation', from: 'good', to: 'fair', actor: 'Administradora' });

    // Quitar el dato también es un cambio: de regular a «sin dato».
    expect((await call(lab.adminMember.subject, url, { method: 'PATCH', body: { conservation: null } })).status).toBe(200);
    expect((await history())[0]).toMatchObject({ kind: 'conservation', from: 'fair', to: null });
  });
});

describe('nombres de ubicación', () => {
  it('no se repiten en el mismo nivel sin distinguir tildes ni mayúsculas, pero sí en otra área', async () => {
    const create = async (name: string, parentId: string) => {
      const created = await call(lab.adminMember.subject, `${lab.base}/locations`, { method: 'POST', body: { name, parentId } });
      expect(created.status).toBe(201);
      return (created.body as { id: string }).id;
    };
    const first = await create('Mesón 2', lab.lab);
    expect(await create('  meson   2 ', lab.lab)).toBe(first);
    expect(await create('Mesón 2', lab.otherLab)).not.toBe(first);
  });
});

describe('filtros e indicadores del Informe', () => {
  it('filtran por responsable, estado físico, garantía y vida útil, y los indicadores coinciden con la lista', async () => {
    const fresh = await createEquipmentLab();
    // Los espacios de prueba están en America/Guayaquil (core-fixtures).
    const today = todayIn('America/Guayaquil');
    const shift = (days: number, years = 0) => {
      const [y = 0, m = 1, d = 1] = today.split('-').map(Number);
      return new Date(Date.UTC(y + years, m - 1, d + days)).toISOString().slice(0, 10);
    };
    // Garantía: vencida ayer, vence hoy (por vencer), a 120 días (vigente) y sin dato.
    const expired = await createAsset(fresh, { acquiredOn: shift(0, -12), warrantyUntil: shift(-1), usefulLifeYears: 10, replacementValue: '1000.50', responsibleId: fresh.operator.principalId, conservation: 'fair' });
    const expiring = await createAsset(fresh, { acquiredOn: shift(0, -2), warrantyUntil: today, usefulLifeYears: 10, replacementValue: '200.25', conservation: 'good' });
    const active = await createAsset(fresh, { acquiredOn: shift(0, -1), warrantyUntil: shift(120), usefulLifeYears: 1 });
    const unknown = await createAsset(fresh, {});

    const ids = async (search: string) =>
      (assetList.parse((await call(fresh.adminMember.subject, `${fresh.base}/assets?${search}`)).body).items.map((item) => item.id)).sort();
    const totals = async (search: string) => assetTotals.parse((await call(fresh.adminMember.subject, `${fresh.base}/assets/totals?${search}`)).body);

    expect(await ids(`responsible=${fresh.operator.principalId}`)).toEqual([expired.id]);
    expect(await ids('responsible=none')).toEqual([expiring.id, active.id, unknown.id].sort());
    expect(await ids('conservation=fair&conservation=none')).toEqual([expired.id, active.id, unknown.id].sort());
    expect(await ids('warranty=expired')).toEqual([expired.id]);
    expect(await ids('warranty=expiring')).toEqual([expiring.id]);
    expect(await ids('warranty=active')).toEqual([active.id]);
    expect(await ids('warranty=none')).toEqual([unknown.id]);
    // Vida útil: cumplida el día en que se cumple (comprado hace un año con 1 año de vida).
    expect(await ids('usefulLife=reached')).toEqual([expired.id, active.id].sort());
    expect(await ids('usefulLife=current')).toEqual([expiring.id]);
    expect(await ids('usefulLife=none')).toEqual([unknown.id]);

    expect(await totals('')).toEqual({
      count: 4,
      replacementValue: '1200.75',
      withReplacementValue: 2,
      withoutResponsible: 3,
      warrantyExpiring: 1,
      usefulLifeReached: 2,
    });
    // Los indicadores se recalculan con los filtros.
    expect(await totals('warranty=expired&warranty=expiring')).toMatchObject({ count: 2, replacementValue: '1200.75', withReplacementValue: 2, withoutResponsible: 1 });
    expect((await call(fresh.teacher.subject, `${fresh.base}/assets/totals`)).status).toBe(403);
  });
});

describe('Excel del Informe', () => {
  it('el Administrador descarga lo filtrado, con el encabezado y en la auditoría', async () => {
    const shown = await createAsset(lab, { locationId: lab.lab, name: 'Espectrofotómetro & UV' });
    expect((await setCondition(shown.id, 'restricted')).status).toBe(201);
    const hidden = await createAsset(lab, { locationId: lab.lab });

    const file = await download(lab.adminMember.subject, `${lab.base}/assets/export?condition=restricted`);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(file.headers['content-disposition']).toMatch(/^attachment; filename="informe-equipos-\d{4}-\d{2}-\d{2}\.xlsx"$/);

    const sheet = readZipEntry(file.bytes, 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('Filtros: Estado: Uso limitado');
    expect(sheet).toContain('Generado el');
    expect(sheet).toContain(shown.code);
    expect(sheet).toContain('Espectrofotómetro &amp; UV');
    expect(sheet).not.toContain(`>${hidden.code}<`);

    expect(
      await count(
        `select count(*) as n from core.audit_events
          where workspace_id = $1 and action = 'equipment.report.export' and (changes ->> 'rows')::int = 1`,
        [lab.workspace.id],
      ),
    ).toBe(1);
  });

  it('sale por lotes: más de 500 equipos llegan todos', async () => {
    const type = await createType(lab);
    await admin.query(
      `insert into equipment.assets (workspace_id, type_id, code, name, location_id, created_by_principal_id)
       select $1, $2, 'LOTE-' || lpad(g::text, 4, '0'), 'Lote exportable ' || g, $3, $4 from generate_series(1, 501) as g`,
      [lab.workspace.id, type.id, lab.otherLab, lab.adminMember.principalId],
    );
    const file = await download(lab.adminMember.subject, `${lab.base}/assets/export?q=exportable`);
    expect(file.status).toBe(200);
    const sheet = readZipEntry(file.bytes, 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('LOTE-0001');
    expect(sheet).toContain('LOTE-0501');
    // Seis filas de encabezado y una por equipo.
    expect(sheet).toContain('<row r="507">');
    expect(sheet).not.toContain('<row r="508">');
  });

  it('el Operador ve el Informe, pero exportar es un reporte del Administrador', async () => {
    const file = await download(lab.operator.subject, `${lab.base}/assets/export`);
    expect(file.status).toBe(403);
    expect(errorResponse.parse(JSON.parse(file.bytes.toString('utf8'))).error.code).toBe('ACCESS_DENIED');
  });
});
