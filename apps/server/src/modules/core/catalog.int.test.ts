import { afterAll, describe, expect, it } from 'vitest';
import { moduleRegistry, roleCodes } from '@platlab/modules';
import { createPool } from '../../platform/db/pool.js';
import { listPermissions, listRolePermissions, listRoles } from './infrastructure/catalog.queries.js';

/**
 * El catálogo fijo de SQL coincide con los manifiestos (02 §4 y §6). Si falla, falta la
 * migración que sincroniza un cambio de manifiesto. Se lee con el rol de runtime.
 */
const pool = createPool({
  connectionString:
    process.env['DATABASE_URL_API'] ??
    'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 1,
});

afterAll(async () => {
  await pool.end();
});

describe('catálogo de roles y permisos', () => {
  it('los roles de SQL son los del catálogo fijo', async () => {
    const rows = await listRoles.run(undefined, pool);
    expect(rows.map((row) => row.code)).toEqual([...roleCodes].sort());
  });

  it('los permisos de SQL son los declarados por los manifiestos, con su módulo', async () => {
    const rows = await listPermissions.run(undefined, pool);
    const expected = moduleRegistry
      .flatMap((module) => module.permissions.map((code) => ({ code, module_code: module.code })))
      .sort((x, y) => x.code.localeCompare(y.code));
    expect(rows).toEqual(expected);
  });

  it('los permisos de cada rol son los que conceden los manifiestos', async () => {
    const rows = await listRolePermissions.run(undefined, pool);
    const expected = moduleRegistry
      .flatMap((module) =>
        Object.entries(module.roleGrants).flatMap(([role_code, permissions]) =>
          (permissions ?? []).map((permission_code) => ({ role_code, permission_code })),
        ),
      )
      .sort(
        (x, y) =>
          x.role_code.localeCompare(y.role_code) || x.permission_code.localeCompare(y.permission_code),
      );
    expect(rows).toEqual(expected);
  });
});
