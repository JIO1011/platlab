import { afterAll } from 'vitest';
import { errorResponse } from '@platlab/contracts';
import { buildApp } from '../app.js';
import { createPool } from '../platform/db/pool.js';
import { createAdminPool } from './core-fixtures.js';
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

export const errorCode = (body: unknown) => errorResponse.parse(body).error.code;

export const count = async (sql: string, params: unknown[]) =>
  Number((await admin.query<{ n: string }>(sql, params)).rows[0]!.n);
export const auditsIn = (workspaceId: string) =>
  count('select count(*) as n from core.audit_events where workspace_id = $1', [workspaceId]);
