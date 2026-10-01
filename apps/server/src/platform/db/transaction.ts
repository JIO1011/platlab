import type pg from 'pg';
import { setRequestContext } from './context.queries.js';

export interface RequestContext {
  workspaceId: string;
  principalId: string;
}

/**
 * Ejecuta un caso de uso en una sola conexión y transacción (02 §5, ADR 0006).
 * El contexto se fija con `set_config(..., true)`: es local a la transacción
 * y desaparece al confirmar o revertir, aunque el pool reutilice la conexión.
 */
export async function withTransaction<T>(
  pool: pg.Pool,
  context: RequestContext,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  // Si el ROLLBACK falla, la conexión queda en estado desconocido: se destruye
  // en lugar de devolverla al pool, y se conserva el error original.
  let destroyConnection = false;
  try {
    await client.query('BEGIN');
    await setRequestContext.run(context, client);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      destroyConnection = true;
    }
    throw error;
  } finally {
    client.release(destroyConnection);
  }
}
