import type pg from 'pg';
import { codeFromName, firstFreeCode } from '@platlab/contracts';
import { lockCodes } from './codes.queries.js';

/**
 * Código automático y libre a partir de un nombre (ADR 0015), para un reactivo o una ubicación:
 * bloquea `lockKey` hasta el final de la transacción, así dos altas simultáneas no eligen el mismo;
 * después pide a `takenLike` los códigos que empiezan como el propuesto y, si está ocupado, añade
 * `-2`, `-3`…
 */
export async function freeCodeFor(
  client: pg.PoolClient,
  options: { lockKey: string; name: string; fallback: string; takenLike: (base: string) => Promise<string[]> },
): Promise<string> {
  await lockCodes.run({ key: options.lockKey }, client);
  const base = codeFromName(options.name, options.fallback);
  return firstFreeCode(base, await options.takenLike(base));
}
