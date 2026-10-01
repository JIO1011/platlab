import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { withTransaction } from './transaction.js';

const context = {
  workspaceId: '00000000-0000-0000-0000-00000000000a',
  principalId: '00000000-0000-0000-0000-0000000000a1',
};

/** Cliente simulado: solo verifica el manejo de errores, no la base (eso lo cubre la integración). */
function fakePool(options: { failRollback: boolean }) {
  const statements: string[] = [];
  const client = {
    query: vi.fn(async (text: string) => {
      statements.push(text.trim().split(/\s+/)[0] ?? '');
      if (text === 'ROLLBACK' && options.failRollback) throw new Error('conexión rota');
      return { rows: [] };
    }),
    release: vi.fn(),
  };
  const pool = { connect: vi.fn(async () => client) } as unknown as pg.Pool;
  return { pool, client, statements };
}

describe('withTransaction', () => {
  it('confirma y devuelve la conexión al pool', async () => {
    const { pool, client, statements } = fakePool({ failRollback: false });
    await expect(withTransaction(pool, context, async () => 'ok')).resolves.toBe('ok');
    expect(statements).toEqual(['BEGIN', 'SELECT', 'COMMIT']);
    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('revierte, conserva el error y devuelve la conexión si el rollback funciona', async () => {
    const { pool, client, statements } = fakePool({ failRollback: false });
    await expect(
      withTransaction(pool, context, async () => {
        throw new Error('fallo de negocio');
      }),
    ).rejects.toThrow('fallo de negocio');
    expect(statements.at(-1)).toBe('ROLLBACK');
    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('si el rollback falla, conserva el error original y destruye la conexión', async () => {
    const { pool, client } = fakePool({ failRollback: true });
    await expect(
      withTransaction(pool, context, async () => {
        throw new Error('fallo de negocio');
      }),
    ).rejects.toThrow('fallo de negocio');
    expect(client.release).toHaveBeenCalledWith(true);
  });
});
