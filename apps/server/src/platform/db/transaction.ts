import type pg from 'pg';

/**
 * Ejecuta un caso de uso en una sola conexión y transacción (02 §5, ADR 0006).
 * Quien llama fija el contexto local dentro de `work`; el contexto desaparece al confirmar
 * o revertir, aunque el pool reutilice la conexión.
 */
export async function withTransaction<T>(
  pool: pg.Pool,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  // Si el ROLLBACK falla, la conexión queda en estado desconocido: se destruye
  // en lugar de devolverla al pool, y se conserva el error original.
  let destroyConnection = false;
  try {
    await client.query('BEGIN');
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
