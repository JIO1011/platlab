import { beforeAll, describe, expect, it } from 'vitest';
import { asset as assetContract, assetHistory, assetList, assetTypeList, responsibleList } from '@platlab/contracts';
import { app, signer } from '../../testing/api.js';
import { addMember, revokeMembership, seedWorkspace, uniqueSuffix } from '../../testing/core-fixtures.js';
import {
  admin,
  auditsIn,
  call,
  count,
  createAsset,
  createEquipmentLab,
  createType,
  errorCode,
  type EquipmentLab,
} from './equipment.fixtures.js';

/** E-01a (ADR 0019): ficha, condición, traslados e historial de Equipos por la API. */

let lab: EquipmentLab;
let other: EquipmentLab;

beforeAll(async () => {
  lab = await createEquipmentLab();
  other = await createEquipmentLab();
});

const assetsIn = (workspaceId: string) =>
  count('select count(*) as n from equipment.assets where workspace_id = $1', [workspaceId]);

describe('tipos de equipo', () => {
  it('un nombre activo no se repite sin tildes ni mayúsculas, y uno archivado deja de ofrecerse', async () => {
    const type = await createType(lab, `Espectrofotómetro ${uniqueSuffix()}`);
    const repeated = await call(lab.adminMember.subject, `${lab.base}/asset-types`, {
      method: 'POST',
      body: { name: ` ${type.name.replace('ó', 'o').toUpperCase()} ` },
    });
    expect(repeated.status).toBe(409);
    expect(errorCode(repeated.body)).toBe('NAME_TAKEN');

    const archived = await call(lab.adminMember.subject, `${lab.base}/asset-types/${type.id}/archive`, { method: 'POST' });
    expect(archived.status).toBe(200);
    const types = assetTypeList.parse((await call(lab.operator.subject, `${lab.base}/asset-types`)).body);
    expect(types.items.map((item) => item.id)).not.toContain(type.id);

    const withArchived = await call(lab.adminMember.subject, `${lab.base}/assets`, {
      method: 'POST',
      body: { name: 'Equipo', typeId: type.id, locationId: lab.lab },
    });
    expect(withArchived.status).toBe(400);
    expect(errorCode(withArchived.body)).toBe('VALIDATION_FAILED');
  });

  it('solo el Administrador los crea', async () => {
    const response = await call(lab.operator.subject, `${lab.base}/asset-types`, { method: 'POST', body: { name: 'Balanza' } });
    expect(response.status).toBe(403);
    expect(errorCode(response.body)).toBe('ACCESS_DENIED');
  });
});

describe('alta y ficha del equipo', () => {
  it('el alta propone el código, calcula la disponibilidad, muestra los niveles y se audita', async () => {
    const audits = await auditsIn(lab.workspace.id);
    const created = await createAsset(lab, {
      name: 'Balanza analítica',
      brand: 'Ohaus',
      model: 'PX224',
      serialNumber: 'B-123',
      powerSupply: '110 V',
      locationId: lab.shelf,
      responsibleId: lab.operator.principalId,
      conservation: 'good',
      acquiredOn: '2024-03-01',
      warrantyUntil: '2026-03-01',
      usefulLifeYears: 8,
      replacementValue: '2500.50',
    });
    expect(created.code).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(created).toMatchObject({
      condition: 'operational',
      availability: 'available',
      conservation: 'good',
      responsible: { id: lab.operator.principalId, name: 'Operador' },
      location: { id: lab.shelf },
      replacementValue: '2500.5',
    });
    expect(created.location.path).toHaveLength(2);
    expect(await auditsIn(lab.workspace.id)).toBeGreaterThan(audits);
  });

  it('un código repetido sin distinguir mayúsculas responde CODE_TAKEN; uno automático añade un sufijo', async () => {
    const code = `EQ-${uniqueSuffix()}`;
    await createAsset(lab, { code });
    const repeated = await call(lab.adminMember.subject, `${lab.base}/assets`, {
      method: 'POST',
      body: { name: 'Otro', typeId: (await createType(lab)).id, locationId: lab.lab, code: code.toLowerCase() },
    });
    expect(repeated.status).toBe(409);
    expect(errorCode(repeated.body)).toBe('CODE_TAKEN');

    const name = `Microscopio ${uniqueSuffix()}`;
    const first = await createAsset(lab, { name });
    const second = await createAsset(lab, { name });
    expect(second.code).toBe(`${first.code}-2`);
  });

  it('la garantía no termina antes de la compra, en el alta ni en la edición', async () => {
    const response = await call(lab.adminMember.subject, `${lab.base}/assets`, {
      method: 'POST',
      body: { name: 'Equipo', typeId: (await createType(lab)).id, locationId: lab.lab, acquiredOn: '2026-05-01', warrantyUntil: '2026-01-01' },
    });
    expect(response.status).toBe(400);

    const asset = await createAsset(lab, { acquiredOn: '2026-05-01' });
    const edit = await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}`, {
      method: 'PATCH',
      body: { warrantyUntil: '2026-04-30' },
    });
    expect(edit.status).toBe(400);
    expect(errorCode(edit.body)).toBe('VALIDATION_FAILED');
  });

  it('la edición cambia solo lo enviado y null borra el dato', async () => {
    const asset = await createAsset(lab, { brand: 'Eppendorf', model: '5810R' });
    const edit = await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}`, {
      method: 'PATCH',
      body: { brand: null, conservation: 'fair' },
    });
    expect(edit.status).toBe(200);
    expect(assetContract.parse(edit.body)).toMatchObject({ brand: null, model: '5810R', conservation: 'fair', name: asset.name });
  });

  it('el Operador no da de alta ni edita; el Docente no consulta', async () => {
    const type = await createType(lab);
    const create = await call(lab.operator.subject, `${lab.base}/assets`, {
      method: 'POST',
      body: { name: 'Equipo', typeId: type.id, locationId: lab.lab },
    });
    expect(create.status).toBe(403);
    const asset = await createAsset(lab, { typeId: type.id });
    const edit = await call(lab.operator.subject, `${lab.base}/assets/${asset.id}`, { method: 'PATCH', body: { name: 'Otro' } });
    expect(edit.status).toBe(403);
    const read = await call(lab.teacher.subject, `${lab.base}/assets`);
    expect(read.status).toBe(403);
  });

  it('no usa tipo, ubicación ni responsable de otro espacio', async () => {
    const foreignType = await createType(other);
    const cases = [
      { typeId: foreignType.id, locationId: lab.lab },
      { typeId: (await createType(lab)).id, locationId: other.lab },
      { typeId: (await createType(lab)).id, locationId: lab.lab, responsibleId: other.operator.principalId },
    ];
    for (const body of cases) {
      const response = await call(lab.adminMember.subject, `${lab.base}/assets`, { method: 'POST', body: { name: 'Equipo', ...body } });
      expect(response.status).toBe(400);
    }
  });

  it('un equipo de otro espacio no existe para este', async () => {
    const foreign = await createAsset(other);
    const response = await call(lab.adminMember.subject, `${lab.base}/assets/${foreign.id}`);
    expect(response.status).toBe(404);
    const transfer = await call(lab.adminMember.subject, `${lab.base}/assets/${foreign.id}/transfers`, {
      method: 'POST',
      body: { locationId: lab.otherLab },
    });
    expect(transfer.status).toBe(404);
  });

  it('un reintento con la misma clave no duplica; con otro contenido se rechaza', async () => {
    const type = await createType(lab);
    const before = await assetsIn(lab.workspace.id);
    const key = `alta-${uniqueSuffix()}`;
    const body = { name: 'Agitador', typeId: type.id, locationId: lab.lab };
    const first = await call(lab.adminMember.subject, `${lab.base}/assets`, { method: 'POST', body, key });
    const retry = await call(lab.adminMember.subject, `${lab.base}/assets`, { method: 'POST', body, key });
    expect(retry.body).toEqual(first.body);
    expect(await assetsIn(lab.workspace.id)).toBe(before + 1);
    const changed = await call(lab.adminMember.subject, `${lab.base}/assets`, {
      method: 'POST',
      body: { ...body, name: 'Otro agitador' },
      key,
    });
    expect(changed.status).toBe(422);
    expect(errorCode(changed.body)).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('dos altas simultáneas con el mismo código: una gana y la otra recibe CODE_TAKEN', async () => {
    const type = await createType(lab);
    const body = { name: 'Equipo', typeId: type.id, locationId: lab.lab, code: `SIM-${uniqueSuffix()}` };
    const results = await Promise.all(
      [1, 2].map(() => call(lab.adminMember.subject, `${lab.base}/assets`, { method: 'POST', body })),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
  });
});

describe('condición, traslados e historial', () => {
  it('el Operador registra la avería y la reparación con resultado; el historial lo cuenta', async () => {
    const asset = await createAsset(lab);
    const url = `${lab.base}/assets/${asset.id}`;
    const faulted = await call(lab.operator.subject, `${url}/condition`, {
      method: 'POST',
      body: { condition: 'faulted', reason: 'No enciende' },
    });
    expect(faulted.status).toBe(201);
    expect(assetContract.parse(faulted.body)).toMatchObject({ condition: 'faulted', availability: 'unavailable' });

    const noResult = await call(lab.operator.subject, `${url}/condition`, {
      method: 'POST',
      body: { condition: 'operational', reason: 'Reparada' },
    });
    expect(noResult.status).toBe(400);

    const same = await call(lab.operator.subject, `${url}/condition`, {
      method: 'POST',
      body: { condition: 'faulted', reason: 'Sigue sin encender' },
    });
    expect(same.status).toBe(400);

    const repaired = await call(lab.operator.subject, `${url}/condition`, {
      method: 'POST',
      body: { condition: 'operational', reason: 'Reparada', result: 'Cambio de fusible; funciona' },
    });
    expect(repaired.status).toBe(201);

    const moved = await call(lab.operator.subject, `${url}/transfers`, { method: 'POST', body: { locationId: lab.otherLab, note: 'A reparación' } });
    expect(moved.status).toBe(201);
    expect(assetContract.parse(moved.body).location.id).toBe(lab.otherLab);

    const history = assetHistory.parse((await call(lab.operator.subject, `${url}/history`)).body);
    expect(history.items.map((event) => event.kind)).toEqual(['transfer', 'condition', 'condition', 'created']);
    expect(history.items[1]).toMatchObject({ from: 'faulted', to: 'operational', result: 'Cambio de fusible; funciona', actor: 'Operador' });
    expect(history.items[0]).toMatchObject({ note: 'A reparación' });
  });

  it('un traslado a la misma ubicación o a una de otro espacio se rechaza', async () => {
    const asset = await createAsset(lab);
    const url = `${lab.base}/assets/${asset.id}/transfers`;
    expect((await call(lab.operator.subject, url, { method: 'POST', body: { locationId: lab.lab } })).status).toBe(400);
    expect((await call(lab.operator.subject, url, { method: 'POST', body: { locationId: other.lab } })).status).toBe(400);
  });

  it('dar de baja es del Administrador y es definitivo', async () => {
    const asset = await createAsset(lab);
    const url = `${lab.base}/assets/${asset.id}`;
    const byOperator = await call(lab.operator.subject, `${url}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleto' },
    });
    expect(byOperator.status).toBe(403);

    const retired = await call(lab.adminMember.subject, `${url}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleto' },
    });
    expect(retired.status).toBe(201);
    for (const [path, method, body] of [
      ['/condition', 'POST', { condition: 'operational', reason: 'Volver', result: 'Revisado' }],
      ['/transfers', 'POST', { locationId: lab.otherLab }],
      ['', 'PATCH', { name: 'Otro nombre' }],
    ] as const) {
      const response = await call(lab.adminMember.subject, `${url}${path}`, { method, body });
      expect(response.status).toBe(400);
    }
    // La ficha sigue consultándose.
    expect((await call(lab.operator.subject, url)).status).toBe(200);
  });
});

/** Sube un cuerpo binario como lo hace la web: tipo de imagen y clave idempotente. */
async function putPhoto(subject: string, url: string, body: Buffer, contentType = 'image/png') {
  const response = await app.inject({
    method: 'PUT',
    url: `/v1${url}`,
    headers: {
      authorization: `Bearer ${await signer.sign(subject)}`,
      'content-type': contentType,
      'idempotency-key': `foto-${uniqueSuffix()}`,
    },
    payload: body,
  });
  return { status: response.statusCode, body: response.json() as unknown };
}

/** Un PNG mínimo: la API reconoce la imagen por su firma, no por el tipo declarado. */
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

describe('foto del equipo', () => {
  it('el Administrador sube la foto, el equipo apunta a ella y el inventario la muestra', async () => {
    const asset = await createAsset(lab);
    const uploaded = await putPhoto(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/photo`, png);
    expect(uploaded.status).toBe(200);
    const photoUrl = assetContract.parse(uploaded.body).photoUrl;
    expect(photoUrl).toMatch(new RegExp(`/${lab.workspace.id}/equipment/[0-9a-f-]{36}\\.png$`));
    const listed = assetList.parse((await call(lab.operator.subject, `${lab.base}/assets?q=${encodeURIComponent(asset.code)}`)).body);
    expect(listed.items.find((item) => item.id === asset.id)?.photoUrl).toBe(photoUrl);

    // Una foto nueva no borra la anterior: queda en el historial de fotos.
    await putPhoto(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/photo`, png);
    expect(await count('select count(*) as n from equipment.asset_photos where asset_id = $1', [asset.id])).toBe(2);
  });

  it('rechaza lo que no es imagen, al Operador y al equipo dado de baja, sin subir nada', async () => {
    const asset = await createAsset(lab);
    const url = `${lab.base}/assets/${asset.id}/photo`;
    expect((await putPhoto(lab.adminMember.subject, url, Buffer.from('%PDF-1.4 no es imagen'))).status).toBe(400);
    expect((await putPhoto(lab.operator.subject, url, png)).status).toBe(403);
    await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleto' },
    });
    expect((await putPhoto(lab.adminMember.subject, url, png)).status).toBe(400);
    expect(await count('select count(*) as n from equipment.asset_photos where asset_id = $1', [asset.id])).toBe(0);
  });
});

describe('inventario y resumen', () => {
  it('pagina por código, busca sin tildes y filtra por tipo, condición y ubicación con sus niveles', async () => {
    const tag = uniqueSuffix();
    const type = await createType(lab);
    const inShelf = await createAsset(lab, { name: `Espectrofotómetro ${tag}`, typeId: type.id, locationId: lab.shelf });
    await createAsset(lab, { name: `Espectrofotómetro ${tag} B`, typeId: type.id, locationId: lab.otherLab });
    const retired = await createAsset(lab, { name: `Espectrofotómetro ${tag} C`, typeId: type.id });
    await call(lab.adminMember.subject, `${lab.base}/assets/${retired.id}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleto' },
    });

    const list = (query: string) =>
      call(lab.operator.subject, `${lab.base}/assets?q=espectrofotometro%20${tag}${query}`).then((response) => assetList.parse(response.body));

    const first = await list('&limit=1');
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).not.toBeNull();
    const second = await list(`&limit=1&cursor=${first.nextCursor}`);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(second.items[0]!.code > first.items[0]!.code).toBe(true);

    expect((await list(`&location=${lab.lab}`)).items.map((item) => item.id)).toEqual([inShelf.id]);
    expect((await list(`&type=${type.id}&condition=retired`)).items.map((item) => item.id)).toEqual([retired.id]);

    const badCursor = await call(lab.operator.subject, `${lab.base}/assets?cursor=no-es-un-cursor`);
    expect(badCursor.status).toBe(400);
  });

  it('el resumen cuenta por condición sin los dados de baja, y el Inicio muestra la tarjeta', async () => {
    const fresh = await createEquipmentLab();
    const ok = await createAsset(fresh);
    const broken = await createAsset(fresh, { condition: 'faulted' });
    await createAsset(fresh, { condition: 'restricted' });
    expect(ok.condition).toBe('operational');
    await call(fresh.adminMember.subject, `${fresh.base}/assets/${broken.id}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Irreparable' },
    });
    const summary = await call(fresh.operator.subject, `${fresh.base}/summary`);
    expect(summary.body).toMatchObject({ summary: { assets: 2, operational: 1, restricted: 1, faulted: 0 } });
    const home = await call(fresh.operator.subject, `/workspaces/${fresh.workspace.id}/home`);
    expect(home.body).toMatchObject({ cards: [{ moduleCode: 'equipment', summary: { assets: 2 } }] });
  });

  it('los responsables son los miembros activos', async () => {
    const leaving = await addMember(admin, lab.workspace.id, { displayName: `Saliente ${uniqueSuffix()}` });
    await revokeMembership(admin, leaving.membershipId);
    const responsibles = responsibleList.parse((await call(lab.adminMember.subject, `${lab.base}/responsibles`)).body);
    const ids = responsibles.items.map((item) => item.id);
    expect(ids).toContain(lab.operator.principalId);
    expect(ids).not.toContain(leaving.principalId);
  });

  it('un espacio sin Equipos no lo admite', async () => {
    const workspace = await seedWorkspace(admin, { modules: ['reagents'] });
    const member = await addMember(admin, workspace.id, { roles: [{ role: 'admin' }] });
    const response = await call(member.subject, `/workspaces/${workspace.id}/equipment/assets`);
    expect(response.status).toBe(403);
    expect(errorCode(response.body)).toBe('MODULE_UNAVAILABLE');
  });
});
