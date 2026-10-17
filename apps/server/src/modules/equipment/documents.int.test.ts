import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { assetDocument, assetDocumentList } from '@platlab/contracts';
import {
  admin,
  call,
  count,
  createAsset,
  createEquipmentLab,
  errorCode,
  pdf,
  uploadDocument,
  type EquipmentLab,
} from './equipment.fixtures.js';

/** E-01e (ADR 0019): documentos del equipo por la API, con las reglas de la ficha de seguridad (ADR 0017). */

let lab: EquipmentLab;
let other: EquipmentLab;

beforeAll(async () => {
  lab = await createEquipmentLab();
  other = await createEquipmentLab();
});

const documentsOf = (assetId: string) =>
  count('select count(*) as n from equipment.asset_documents where asset_id = $1', [assetId]);
const listed = async (subject: string, assetId: string) =>
  assetDocumentList.parse((await call(subject, `${lab.base}/assets/${assetId}/documents`)).body).items;
const archive = (subject: string, assetId: string, documentId: string) =>
  call(subject, `${lab.base}/assets/${assetId}/documents/${documentId}/archive`, { method: 'POST', key: randomUUID() });
const download = async (url: string) => Buffer.from(await (await fetch(url)).arrayBuffer());

describe('subir y listar', () => {
  it('el Administrador sube PDF con tipo y nombre; el Operador los lista del más reciente al más antiguo', async () => {
    const asset = await createAsset(lab);
    const manual = await uploadDocument(lab, lab.adminMember.subject, asset.id, pdf('manual'), { kind: 'manual', title: '  Manual de uso ' });
    expect(manual.status).toBe(201);
    const first = assetDocument.parse(manual.body);
    expect(first).toMatchObject({ kind: 'manual', title: 'Manual de uso', uploadedBy: { name: 'Administradora' } });
    expect(first.url).toMatch(new RegExp(`/public-files/${lab.workspace.id}/equipment/documents/${first.id}\\.pdf$`));
    expect(first.byteSize).toBe(pdf('manual').byteLength);
    expect((await download(first.url)).toString('latin1')).toContain('manual');

    const warranty = assetDocument.parse(
      (await uploadDocument(lab, lab.adminMember.subject, asset.id, pdf('garantía'), { kind: 'warranty', title: 'Garantía' })).body,
    );
    expect((await listed(lab.operator.subject, asset.id)).map((item) => item.id)).toEqual([warranty.id, first.id]);
  });

  it('solo PDF, no vacío y de hasta 20 MiB; nada de eso deja documentos', async () => {
    const asset = await createAsset(lab);
    for (const file of [
      Buffer.from('<html>no es un pdf</html>'),
      Buffer.alloc(0),
      Buffer.concat([pdf('grande'), Buffer.alloc(20 * 1024 * 1024)]),
    ]) {
      const response = await uploadDocument(lab, lab.adminMember.subject, asset.id, file);
      expect(response.status).toBe(400);
    }
    expect(await documentsOf(asset.id)).toBe(0);
  });

  it('el Operador no sube ni quita pero lista; el Docente no lista', async () => {
    const asset = await createAsset(lab);
    const denied = await uploadDocument(lab, lab.operator.subject, asset.id, pdf('operador'));
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    expect(await documentsOf(asset.id)).toBe(0);

    const uploaded = assetDocument.parse((await uploadDocument(lab, lab.adminMember.subject, asset.id, pdf('vigente'))).body);
    expect((await archive(lab.operator.subject, asset.id, uploaded.id)).status).toBe(403);
    expect((await call(lab.operator.subject, `${lab.base}/assets/${asset.id}/documents`)).status).toBe(200);
    expect((await call(lab.teacher.subject, `${lab.base}/assets/${asset.id}/documents`)).status).toBe(403);
  });

  it('un equipo de otro espacio no existe; uno dado de baja no recibe ni pierde documentos y sigue listando los suyos', async () => {
    const foreign = await createAsset(other);
    expect((await uploadDocument(lab, lab.adminMember.subject, foreign.id, pdf('ajeno'))).status).toBe(404);
    expect((await call(lab.adminMember.subject, `${lab.base}/assets/${foreign.id}/documents`)).status).toBe(404);
    expect(await documentsOf(foreign.id)).toBe(0);

    const asset = await createAsset(lab);
    const kept = assetDocument.parse((await uploadDocument(lab, lab.adminMember.subject, asset.id, pdf('antes de la baja'))).body);
    await call(lab.adminMember.subject, `${lab.base}/assets/${asset.id}/condition`, {
      method: 'POST',
      body: { condition: 'retired', reason: 'Obsoleto' },
    });
    expect((await uploadDocument(lab, lab.adminMember.subject, asset.id, pdf('después'))).status).toBe(400);
    expect((await archive(lab.adminMember.subject, asset.id, kept.id)).status).toBe(400);
    expect((await listed(lab.operator.subject, asset.id)).map((item) => item.id)).toEqual([kept.id]);
  });
});

describe('quitar', () => {
  it('archivar lo oculta y conserva el archivo; otra vez, o desde otro equipo, no lo encuentra', async () => {
    const asset = await createAsset(lab);
    const another = await createAsset(lab);
    const uploaded = assetDocument.parse((await uploadDocument(lab, lab.adminMember.subject, asset.id, pdf('quitar'))).body);

    expect((await archive(lab.adminMember.subject, another.id, uploaded.id)).status).toBe(404);
    const archived = await archive(lab.adminMember.subject, asset.id, uploaded.id);
    expect(archived.status).toBe(200);
    expect(assetDocument.parse(archived.body).id).toBe(uploaded.id);
    expect(await listed(lab.operator.subject, asset.id)).toEqual([]);
    expect((await download(uploaded.url)).toString('latin1')).toContain('quitar');

    const again = await archive(lab.adminMember.subject, asset.id, uploaded.id);
    expect(again.status).toBe(404);
    expect(errorCode(again.body)).toBe('NOT_FOUND');
    expect(await documentsOf(asset.id)).toBe(1);
  });

  it('subir y archivar quedan en la auditoría', async () => {
    const asset = await createAsset(lab);
    const uploaded = assetDocument.parse(
      (await uploadDocument(lab, lab.adminMember.subject, asset.id, pdf('auditoría'), { kind: 'invoice', title: 'Factura' })).body,
    );
    await archive(lab.adminMember.subject, asset.id, uploaded.id);
    const { rows } = await admin.query<{ action: string; changes: Record<string, unknown> }>(
      `select action, changes from core.audit_events
        where workspace_id = $1 and entity_type = 'equipment.asset_document' and entity_id = $2
        order by occurred_at, action`,
      [lab.workspace.id, uploaded.id],
    );
    expect(rows).toMatchObject([
      { action: 'equipment.asset.document.add', changes: { assetId: asset.id, kind: 'invoice', title: 'Factura' } },
      { action: 'equipment.asset.document.archive', changes: { assetId: asset.id, archived: true } },
    ]);
  });
});
