import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { myWorkspacesResponse } from '@platlab/contracts';
import { buildApp } from '../../app.js';
import { addMember, createAdminPool, seedWorkspace } from '../../testing/core-fixtures.js';
import { createPool } from '../db/pool.js';
import { createTokenVerifier, remoteJwks } from './jwt.js';

/**
 * Supabase Auth local con clave ES256 (`pnpm db:start`): el token real se verifica por JWKS,
 * con el emisor y la audiencia reales, y la API lo usa de punta a punta (ADR 0004).
 * La clave publicable local es pública y fija en la CLI; no es una credencial.
 */
const supabaseUrl = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const publishableKey =
  process.env['SUPABASE_PUBLISHABLE_KEY'] ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const verifyToken = createTokenVerifier({
  keys: remoteJwks(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
  issuer: `${supabaseUrl}/auth/v1`,
  audience: 'authenticated',
});
const admin = createAdminPool();
const pool = createPool({
  connectionString:
    process.env['DATABASE_URL_API'] ??
    'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 1,
});

afterAll(async () => {
  await pool.end();
  await admin.end();
});

/** Alta local con confirmación de correo desactivada (config.toml): devuelve la sesión. */
async function signUp() {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email: `auth-${randomUUID()}@platlab.test`, password: randomUUID() }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { access_token: string; user: { id: string } };
}

describe('Supabase Auth local', () => {
  it('emite JWT ES256 que se verifican por JWKS con emisor y audiencia fijados', async () => {
    const session = await signUp();
    const [header] = session.access_token.split('.');
    expect(JSON.parse(Buffer.from(header!, 'base64url').toString())).toMatchObject({
      alg: 'ES256',
      kid: expect.any(String),
    });
    await expect(verifyToken(session.access_token)).resolves.toEqual({ subject: session.user.id });
  });

  it('la API reconoce la identidad del token real y lista sus espacios', async () => {
    const session = await signUp();
    const workspace = await seedWorkspace(admin);
    await addMember(admin, workspace.id, { subject: session.user.id });
    const app = buildApp({ pool, verifyToken });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/me/workspaces',
      headers: { authorization: `Bearer ${session.access_token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(myWorkspacesResponse.parse(response.json()).workspaces.map((w) => w.id)).toEqual([
      workspace.id,
    ]);
    await app.close();
  });
});
