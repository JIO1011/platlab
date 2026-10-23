import { afterAll } from 'vitest';
import { errorResponse } from '@platlab/contracts';
import { buildApp } from '../app.js';
import { createPool } from '../platform/db/pool.js';
import { createAdminPool, uniqueSuffix } from './core-fixtures.js';
import { localPublicFiles } from './storage.js';
import { createTestSigner } from './tokens.js';

/**
 * La API por HTTP contra la base local, con el rol de runtime y conexiones reales (ADR 0006): el
 * arnés común de las pruebas de integración de los módulos.
 */
export const admin = createAdminPool();
const pool = createPool({
  connectionString:
    process.env['DATABASE_URL_API'] ??
    'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 4,
});
export const signer = await createTestSigner();
export const app = buildApp({ pool, verifyToken: signer.verifier, publicFiles: localPublicFiles });

afterAll(async () => {
  await app.close();
  await pool.end();
  await admin.end();
});

interface Call {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: unknown;
  key?: string;
}

export async function call(subject: string, url: string, { method = 'GET', body, key }: Call = {}) {
  const response = await app.inject({
    method,
    url: `/v1${url}`,
    headers: {
      authorization: `Bearer ${await signer.sign(subject)}`,
      ...(key ? { 'idempotency-key': key } : {}),
    },
    ...(body === undefined ? {} : { payload: body as Record<string, unknown> }),
  });
  return { status: response.statusCode, body: response.json() as unknown };
}

/** Un PUT con cuerpo binario (una foto o un logo), con su tipo declarado y una clave de idempotencia nueva. */
export async function putBinary(subject: string, url: string, body: Buffer, contentType = 'image/png') {
  const response = await app.inject({
    method: 'PUT',
    url: `/v1${url}`,
    headers: { authorization: `Bearer ${await signer.sign(subject)}`, 'content-type': contentType, 'idempotency-key': `bin-${uniqueSuffix()}` },
    payload: body,
  });
  return { status: response.statusCode, body: response.json() as unknown };
}

/** Un PNG mínimo: la API reconoce la imagen por su firma, no por el tipo declarado. */
export const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

/** Una descarga (el Excel del Informe): estado, cabeceras y bytes, sin leerla como JSON. */
export async function download(subject: string, url: string) {
  const response = await app.inject({ method: 'GET', url: `/v1${url}`, headers: { authorization: `Bearer ${await signer.sign(subject)}` } });
  return { status: response.statusCode, headers: response.headers, bytes: response.rawPayload };
}

export const errorCode = (body: unknown) => errorResponse.parse(body).error.code;

export const count = async (sql: string, params: unknown[]) =>
  Number((await admin.query<{ n: string }>(sql, params)).rows[0]!.n);
export const auditsIn = (workspaceId: string) =>
  count('select count(*) as n from core.audit_events where workspace_id = $1', [workspaceId]);
