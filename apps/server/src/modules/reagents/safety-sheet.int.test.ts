import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { positionList, product as productContract, productDetail } from '@platlab/contracts';
import { admin, signer, app, call, errorCode, createLab, createProduct, receive, count } from './reagents.fixtures.js';

describe('R-01B · ficha de seguridad en PDF (ADR 0017)', () => {
  const pdf = (text: string) => Buffer.from(`%PDF-1.4\n% ${text}\n%%EOF\n`, 'latin1');
  const upload = async (subject: string, url: string, file: Buffer, key?: string) => {
    const response = await app.inject({
      method: 'PUT',
      url: `/v1${url}/safety-sheet`,
      headers: {
        authorization: `Bearer ${await signer.sign(subject)}`,
        'content-type': 'application/pdf',
        ...(key ? { 'idempotency-key': key } : {}),
      },
      payload: file,
    });
    return { status: response.statusCode, body: response.json() as unknown };
  };
  const sheetsOf = (productId: string) =>
    count('select count(*) as n from reagents.safety_sheets where product_id = $1', [productId]);
  const download = async (url: string) => Buffer.from(await (await fetch(url)).arrayBuffer());

  it('el Administrador sube el PDF: queda vigente con enlace público y una ficha nueva no sobrescribe la anterior', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const productUrl = `${lab.base}/products/${product.id}`;
    await call(lab.adminMember.subject, productUrl, { method: 'PATCH', body: { sdsKind: 'digital', sdsUrl: 'https://ejemplo.org/sds.pdf' } });

    const first = await upload(lab.adminMember.subject, productUrl, pdf('primera'));
    expect(first.status).toBe(200);
    const uploaded = productContract.parse(first.body);
    // El PDF reemplaza al enlace: hay una sola ficha vigente.
    expect(uploaded).toMatchObject({ sdsKind: 'digital', sdsUrl: null });
    expect(uploaded.sdsFileUrl).toContain(`/public-files/${lab.workspace.id}/sds/`);
    expect((await download(uploaded.sdsFileUrl!)).toString('latin1')).toContain('primera');

    const second = productContract.parse((await upload(lab.adminMember.subject, productUrl, pdf('segunda'))).body);
    expect(second.sdsFileUrl).not.toBe(uploaded.sdsFileUrl);
    expect((await download(uploaded.sdsFileUrl!)).toString('latin1')).toContain('primera');
    expect(await sheetsOf(product.id)).toBe(2);

    // La ficha, la lista y las posiciones leen el PDF vigente.
    expect(productDetail.parse((await call(lab.operator.subject, productUrl)).body).sdsFileUrl).toBe(second.sdsFileUrl);
    expect((await receive(lab, product.id, '10')).status).toBe(201);
    const [position] = positionList.parse((await call(lab.operator.subject, `${lab.base}/positions?productId=${product.id}`)).body).items;
    expect(position?.product).toMatchObject({ sdsKind: 'digital', sdsUrl: null, sdsFileUrl: second.sdsFileUrl });

    const [audit] = await admin.query<{ changes: Record<string, unknown> }>(
      `select changes from core.audit_events where workspace_id = $1 and action = 'reagents.product.safety_sheet'
        order by occurred_at desc limit 1`,
      [lab.workspace.id],
    ).then((result) => result.rows);
    expect(audit?.changes).toMatchObject({ sdsFileUrl: { from: uploaded.sdsFileUrl, to: second.sdsFileUrl } });
  });

  it('el formulario reenvía el enlace vacío y el PDF sigue; un enlace o «física» lo reemplazan y queda en el historial', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const productUrl = `${lab.base}/products/${product.id}`;
    const patch = (body: Record<string, unknown>) =>
      call(lab.adminMember.subject, productUrl, { method: 'PATCH', body }).then((response) => productContract.parse(response.body));
    const { sdsFileUrl } = productContract.parse((await upload(lab.adminMember.subject, productUrl, pdf('vigente'))).body);

    expect(await patch({ controlled: true, sdsKind: 'digital', sdsUrl: null })).toMatchObject({ sdsFileUrl, controlled: true });
    expect(await patch({ sdsKind: 'digital', sdsUrl: 'https://ejemplo.org/sds.pdf' })).toMatchObject({
      sdsUrl: 'https://ejemplo.org/sds.pdf',
      sdsFileUrl: null,
    });
    await upload(lab.adminMember.subject, productUrl, pdf('otra'));
    expect(await patch({ sdsKind: 'physical', sdsUrl: null })).toMatchObject({ sdsKind: 'physical', sdsUrl: null, sdsFileUrl: null });
    expect(await sheetsOf(product.id)).toBe(2);
  });

  it('solo PDF de hasta 6 MiB, del catálogo del espacio y con el permiso de catálogo; nada de eso deja fichas', async () => {
    const lab = await createLab();
    const other = await createLab();
    const product = await createProduct(lab);
    const foreign = await createProduct(other);
    const productUrl = `${lab.base}/products/${product.id}`;

    expect((await upload(lab.adminMember.subject, productUrl, Buffer.from('<html>no es un pdf</html>'))).status).toBe(400);
    const tooLarge = Buffer.concat([pdf('grande'), Buffer.alloc(6 * 1024 * 1024)]);
    expect((await upload(lab.adminMember.subject, productUrl, tooLarge)).status).toBe(400);
    const denied = await upload(lab.operator.subject, productUrl, pdf('operador'));
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    expect((await upload(lab.adminMember.subject, `${lab.base}/products/${foreign.id}`, pdf('ajeno'))).status).toBe(404);
    expect(await sheetsOf(product.id)).toBe(0);
    expect(await sheetsOf(foreign.id)).toBe(0);
  });

  it('repetir con la misma clave devuelve la misma ficha; la misma clave con otro PDF se rechaza', async () => {
    const lab = await createLab();
    const product = await createProduct(lab);
    const productUrl = `${lab.base}/products/${product.id}`;
    const key = randomUUID();

    const first = await upload(lab.adminMember.subject, productUrl, pdf('una'), key);
    const retry = await upload(lab.adminMember.subject, productUrl, pdf('una'), key);
    expect(retry.status).toBe(200);
    expect(productContract.parse(retry.body).sdsFileUrl).toBe(productContract.parse(first.body).sdsFileUrl);
    const reused = await upload(lab.adminMember.subject, productUrl, pdf('otra'), key);
    expect(reused.status).toBe(422);
    expect(errorCode(reused.body)).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await sheetsOf(product.id)).toBe(1);
  });
});
