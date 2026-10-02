import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { errorResponse, myWorkspacesResponse, workspaceMeResponse } from '@platlab/contracts';
import { buildApp } from '../../app.js';
import { createPool } from '../../platform/db/pool.js';
import {
  addLocation,
  addMember,
  createAdminPool,
  revokeMembership,
  seedWorkspace,
  uniqueSuffix,
  type Member,
  type Workspace,
} from '../../testing/core-fixtures.js';
import { createTestSigner } from '../../testing/tokens.js';
import { hasPermissionAt, withWorkspaceAccess } from './index.js';

/**
 * T-02/T-03 contra la base local, con el rol de runtime (requiere `pnpm db:start`).
 * Una sola conexión en el pool de la API obliga a reutilizarla entre peticiones y espacios.
 */
const admin = createAdminPool();
const pool = createPool({
  connectionString:
    process.env['DATABASE_URL_API'] ??
    'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 1,
});
const signer = await createTestSigner();
const app = buildApp({ pool, verifyToken: signer.verifier });

const permission = 'reagents.catalog.read';

let a: Workspace;
let b: Workspace;
let provisioning: Workspace;
let shared: Member; // Administrador de todo A y Operador con ámbito en B
let operatorA: Member; // Operador solo en el laboratorio 1 de A
let siteA: string;
let lab1A: string;
let storeA: string;
let lab2A: string;
let siteB: string;

async function get(url: string, subject: string) {
  return app.inject({
    method: 'GET',
    url,
    headers: { authorization: `Bearer ${await signer.sign(subject)}` },
  });
}

const access = <T>(subject: string, workspaceId: string, work: Parameters<typeof withWorkspaceAccess<T>>[2]) =>
  withWorkspaceAccess(pool, { subject, workspaceId, actionClass: 'read_export' }, work);

beforeAll(async () => {
  a = await seedWorkspace(admin, { modules: ['reagents'] });
  b = await seedWorkspace(admin, { modules: ['reagents'] });
  provisioning = await seedWorkspace(admin, { status: 'provisioning' });

  siteA = await addLocation(admin, a.id, { kind: 'site' });
  lab1A = await addLocation(admin, a.id, { kind: 'room', parentId: siteA });
  storeA = await addLocation(admin, a.id, { kind: 'storage', parentId: lab1A });
  lab2A = await addLocation(admin, a.id, { kind: 'room', parentId: siteA });
  siteB = await addLocation(admin, b.id, { kind: 'site' });

  const sharedSubject = `sub-shared-${uniqueSuffix()}`;
  shared = await addMember(admin, a.id, { subject: sharedSubject, roles: [{ role: 'admin' }] });
  await addMember(admin, b.id, {
    subject: sharedSubject,
    roles: [{ role: 'operator', locationId: siteB }],
  });
  operatorA = await addMember(admin, a.id, { roles: [{ role: 'operator', locationId: lab1A }] });
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await admin.end();
});

describe('GET /v1/me/workspaces', () => {
  it('lista solo los espacios con membresía activa, sin los que están en alta', async () => {
    await addMember(admin, provisioning.id, { subject: shared.subject });
    const response = await get('/v1/me/workspaces', shared.subject);

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const ids = myWorkspacesResponse.parse(response.json()).workspaces.map((w) => w.id);
    expect(ids.sort()).toEqual([a.id, b.id].sort());
  });

  it('marca como propietario solo a quien lo es', async () => {
    const body = myWorkspacesResponse.parse((await get('/v1/me/workspaces', a.owner.subject)).json());
    expect(body.workspaces).toEqual([
      expect.objectContaining({ id: a.id, code: a.code, status: 'active', isOwner: true }),
    ]);
    const sharedBody = myWorkspacesResponse.parse(
      (await get('/v1/me/workspaces', shared.subject)).json(),
    );
    expect(sharedBody.workspaces.every((w) => !w.isOwner)).toBe(true);
  });

  it('un JWT válido sin identidad de PlatLab no ve espacios', async () => {
    const response = await get('/v1/me/workspaces', `sub-desconocido-${uniqueSuffix()}`);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ workspaces: [] });
  });
});

describe('GET /v1/workspaces/:workspaceId/me', () => {
  it('devuelve el espacio, el miembro y sus permisos efectivos', async () => {
    const response = await get(`/v1/workspaces/${a.id}/me`, shared.subject);

    expect(response.statusCode).toBe(200);
    const body = workspaceMeResponse.parse(response.json());
    expect(body.workspace).toMatchObject({ id: a.id, code: a.code, timeZone: 'America/Guayaquil' });
    expect(body.member.isOwner).toBe(false);
    // Rol de Administrador en todo A: los permisos de Reactivos de su manifiesto (01 §5).
    expect(body.permissions).toEqual([
      'reagents.adjustment.create',
      'reagents.catalog.manage',
      'reagents.catalog.read',
      'reagents.issue.create',
      'reagents.receipt.create',
    ]);
    expect(body.modules).toEqual([
      {
        code: 'reagents',
        name: 'Reactivos',
        access: ['new_operation', 'resolve_pending', 'read_export'],
        nav: [
          {
            path: 'reactivos',
            label: 'Reactivos',
            sections: [
              { path: '', label: 'Resumen' },
              { path: 'inventario', label: 'Inventario' },
              { path: 'movimientos', label: 'Movimientos' },
            ],
          },
        ],
      },
    ]);
  });

  it('el propietario recibe los permisos del Administrador sin asignación (ADR 0008, 02-10-2026)', async () => {
    const body = workspaceMeResponse.parse(
      (await get(`/v1/workspaces/${a.id}/me`, a.owner.subject)).json(),
    );
    expect(body.member.isOwner).toBe(true);
    expect(body.permissions).toEqual([
      'reagents.adjustment.create',
      'reagents.catalog.manage',
      'reagents.catalog.read',
      'reagents.issue.create',
      'reagents.receipt.create',
    ]);
  });

  it('un miembro sin rol no recibe permisos', async () => {
    const member = await addMember(admin, a.id);
    const body = workspaceMeResponse.parse((await get(`/v1/workspaces/${a.id}/me`, member.subject)).json());
    expect(body.member.isOwner).toBe(false);
    expect(body.permissions).toEqual([]);
  });

  it('niega igual un espacio ajeno, uno inexistente y uno en alta', async () => {
    const foreign = await get(`/v1/workspaces/${b.id}/me`, operatorA.subject);
    const missing = await get(`/v1/workspaces/${randomUUID()}/me`, operatorA.subject);
    const inProvisioning = await get(`/v1/workspaces/${provisioning.id}/me`, provisioning.owner.subject);

    for (const response of [foreign, missing, inProvisioning]) {
      expect(response.statusCode).toBe(403);
      expect(errorResponse.parse(response.json()).error.code).toBe('ACCESS_DENIED');
    }
    expect(foreign.body).toBe(missing.body);
  });

  it('la revocación de la membresía se aplica en la siguiente petición', async () => {
    const member = await addMember(admin, a.id, { roles: [{ role: 'operator' }] });
    expect((await get(`/v1/workspaces/${a.id}/me`, member.subject)).statusCode).toBe(200);

    await revokeMembership(admin, member.membershipId);

    const after = await get(`/v1/workspaces/${a.id}/me`, member.subject);
    expect(after.statusCode).toBe(403);
    expect(errorResponse.parse(after.json()).error.code).toBe('ACCESS_DENIED');
    const list = myWorkspacesResponse.parse((await get('/v1/me/workspaces', member.subject)).json());
    expect(list.workspaces).toEqual([]);
  });
});

describe('roles con ámbito', () => {
  it('un rol con ámbito aplica en su ubicación y su descendencia, no en el resto', async () => {
    const allowed = await access(operatorA.subject, a.id, async (ctx) => ({
      lab1: await hasPermissionAt(ctx, permission, lab1A),
      store: await hasPermissionAt(ctx, permission, storeA),
      site: await hasPermissionAt(ctx, permission, siteA),
      lab2: await hasPermissionAt(ctx, permission, lab2A),
    }));
    expect(allowed).toEqual({ lab1: true, store: true, site: false, lab2: false });
  });

  it('un rol de todo el espacio aplica en cualquier ubicación del espacio', async () => {
    await expect(
      access(shared.subject, a.id, (ctx) => hasPermissionAt(ctx, permission, lab2A)),
    ).resolves.toBe(true);
  });

  it('la misma identidad tiene en B solo el rol y el ámbito de B', async () => {
    const result = await access(shared.subject, b.id, async (ctx) => ({
      siteB: await hasPermissionAt(ctx, permission, siteB),
      locationOfA: await hasPermissionAt(ctx, permission, storeA),
    }));
    expect(result).toEqual({ siteB: true, locationOfA: false });
  });

  it('el propietario tiene los permisos en todas las ubicaciones; un miembro sin rol, en ninguna', async () => {
    await expect(
      access(a.owner.subject, a.id, (ctx) => hasPermissionAt(ctx, permission, storeA)),
    ).resolves.toBe(true);
    const member = await addMember(admin, a.id);
    await expect(
      access(member.subject, a.id, (ctx) => hasPermissionAt(ctx, permission, siteA)),
    ).resolves.toBe(false);
  });

  it('ignora asignaciones revocadas, vencidas o todavía no vigentes', async () => {
    const day = 24 * 3600 * 1000;
    const iso = (offset: number) => new Date(Date.now() + offset).toISOString();
    const subjects = await Promise.all(
      [
        { role: 'operator', revoked: true },
        { role: 'operator', validFrom: iso(-2 * day), validUntil: iso(-day) },
        { role: 'operator', validFrom: iso(day) },
      ].map(async (grant) => (await addMember(admin, a.id, { roles: [grant] })).subject),
    );
    for (const subject of subjects) {
      await expect(
        access(subject, a.id, (ctx) => hasPermissionAt(ctx, permission, siteA)),
      ).resolves.toBe(false);
      const body = workspaceMeResponse.parse((await get(`/v1/workspaces/${a.id}/me`, subject)).json());
      expect(body.permissions).toEqual([]);
    }
  });
});

describe('pool, contexto y bloqueo', () => {
  const currentContext = async () => {
    const { rows } = await pool.query<{ workspace_id: string; principal_id: string }>(
      `select current_setting('platlab.workspace_id', true) as workspace_id,
              current_setting('platlab.principal_id', true) as principal_id`,
    );
    return rows[0];
  };

  it('la conexión reutilizada no transfiere el contexto de A a la petición de B', async () => {
    const inA = await access(shared.subject, a.id, async (ctx) => ctx.workspace.id);
    expect(inA).toBe(a.id);
    expect(await currentContext()).toEqual({ workspace_id: '', principal_id: '' });

    const inB = await access(shared.subject, b.id, async (ctx) => {
      const { rows } = await ctx.client.query<{ workspace_id: string }>(
        'select distinct workspace_id from core.locations',
      );
      return rows.map((row) => row.workspace_id);
    });
    expect(inB).toEqual([b.id]);
    expect(await currentContext()).toEqual({ workspace_id: '', principal_id: '' });
  });

  it('una denegación revierte la transacción y no deja contexto', async () => {
    await expect(access(operatorA.subject, b.id, async () => 'no debía ejecutarse')).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
    expect(await currentContext()).toEqual({ workspace_id: '', principal_id: '' });
  });

  it.each([
    ['revocar la membresía', `update core.memberships set status = 'revoked', revoked_at = now() where id = $1`, 'membership'],
    ['cambiar el estado del espacio', `update core.workspaces set version = version + 1 where id = $1`, 'workspace'],
  ] as const)('%s espera a que termine la operación en curso', async (_case, sql, target) => {
    const member = await addMember(admin, a.id, { roles: [{ role: 'operator' }] });
    const other = await admin.connect();
    try {
      await access(member.subject, a.id, async () => {
        await other.query('BEGIN');
        await other.query(`SET LOCAL lock_timeout = '300ms'`);
        await expect(
          other.query(sql, [target === 'membership' ? member.membershipId : a.id]),
        ).rejects.toMatchObject({ code: '55P03' });
        await other.query('ROLLBACK');
      });
    } finally {
      await other.query('ROLLBACK').catch(() => undefined);
      other.release();
    }
  });
});
