import { afterAll, describe, expect, it } from 'vitest';
import { createPool } from './pool.js';
import { currentRole, sessionTimeouts, smokeArrays, smokeTypes } from './smoke.queries.js';
import { withTransaction } from './transaction.js';

/**
 * Prueba de humo de T-01: requiere la base local (`pnpm db:start && pnpm db:reset`).
 * Se conecta con el rol de runtime, no como dueño de tablas.
 */
const connectionString =
  process.env['DATABASE_URL_API'] ??
  'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres';

// Una sola conexión: obliga a reutilizarla entre transacciones.
const pool = createPool({ connectionString, max: 1 });

const contextA = {
  workspaceId: '00000000-0000-0000-0000-00000000000a',
  principalId: '00000000-0000-0000-0000-0000000000a1',
};

afterAll(async () => {
  await pool.end();
});

describe('pg + PgTyped sobre la base local', () => {
  it('se conecta con un rol sin superusuario ni BYPASSRLS', async () => {
    const [role] = await currentRole.run(undefined, pool);
    expect(role).toEqual({ role_name: 'platlab_api', is_superuser: false, bypasses_rls: false });
  });

  it('devuelve numeric y date como cadenas exactas', async () => {
    const [row] = await withTransaction(pool, contextA, (client) =>
      smokeTypes.run({ amount: '79.5', day: '2026-10-01' }, client),
    );
    expect(row?.amount).toBe('79.500000000');
    expect(typeof row?.amount).toBe('string');
    expect(row?.day).toBe('2026-10-01');
  });

  it('devuelve arreglos de numeric y date como cadenas, sin perder precisión', async () => {
    const [row] = await smokeArrays.run(undefined, pool);
    expect(row?.amounts).toEqual(['1.500000000', '79.500000001']);
    expect(row?.days).toEqual(['2026-10-01']);
  });

  it('aplica los tiempos máximos interactivos de 02 §12', async () => {
    const [row] = await sessionTimeouts.run(undefined, pool);
    expect(row).toEqual({ statement_timeout: '5s', lock_timeout: '1s' });
  });

  it('el contexto existe dentro de la transacción y no pasa a la siguiente', async () => {
    const [inside] = await withTransaction(pool, contextA, (client) =>
      smokeTypes.run({ amount: '0', day: '2026-10-01' }, client),
    );
    expect(inside?.workspace_id).toBe(contextA.workspaceId);

    // Misma y única conexión del pool, fuera de cualquier transacción con contexto.
    const [after] = await smokeTypes.run({ amount: '0', day: '2026-10-01' }, pool);
    expect(after?.workspace_id ?? '').toBe('');
  });

  it('un error revierte la transacción, libera la conexión y no deja contexto', async () => {
    await expect(
      withTransaction(pool, contextA, async () => {
        throw new Error('fallo provocado');
      }),
    ).rejects.toThrow('fallo provocado');

    const [after] = await smokeTypes.run({ amount: '0', day: '2026-10-01' }, pool);
    expect(after?.workspace_id ?? '').toBe('');
  });
});
