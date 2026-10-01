import { createHash } from 'node:crypto';
import type pg from 'pg';
import { AppError } from '../errors.js';
import {
  claimIdempotencyKey,
  completeIdempotencyRecord,
  findIdempotencyRecord,
} from './idempotency.queries.js';

/** JSON con claves ordenadas: dos entradas con el mismo contenido producen el mismo texto. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Número no representable en JSON');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  throw new TypeError(`Valor no representable en JSON: ${typeof value}`);
}

/** Hash canónico de la entrada de un comando (primer incremento, paso 3). */
export function requestHash(input: unknown): string {
  return createHash('sha256').update(canonicalJson(input)).digest('hex');
}

export interface IdempotentCommand {
  workspaceId: string;
  principalId: string;
  /** Operación con el prefijo de su módulo; la clave es única por espacio, actor y operación. */
  operation: string;
  /** Valor de Idempotency-Key; sin clave, el comando se ejecuta sin protección de reintentos. */
  key: string | undefined;
  input: unknown;
}

/**
 * Reclama la clave antes de ejecutar y guarda el resultado al final, en la misma transacción
 * (02 §7). Un reintento con el mismo contenido devuelve el resultado confirmado sin repetir
 * efectos; con otro contenido se rechaza. Un duplicado simultáneo espera al primero, y si el
 * primero revierte, la clave queda libre. El resultado debe poder guardarse como JSON.
 */
export async function withIdempotency<T>(
  client: pg.PoolClient,
  command: IdempotentCommand,
  work: () => Promise<T>,
): Promise<T> {
  if (command.key === undefined) return work();
  const scope = {
    workspaceId: command.workspaceId,
    principalId: command.principalId,
    operation: command.operation,
    key: command.key,
  };
  const hash = requestHash(command.input);

  const [claimed] = await claimIdempotencyKey.run({ ...scope, requestHash: hash }, client);
  if (!claimed) {
    const [record] = await findIdempotencyRecord.run(scope, client);
    if (!record || record.request_hash !== hash) {
      throw new AppError(
        'IDEMPOTENCY_KEY_REUSED',
        'La clave idempotente ya se usó con otro contenido',
      );
    }
    if (record.response === null) {
      throw new AppError('TRANSIENT_CONFLICT', 'Conflicto transitorio; vuelve a intentarlo');
    }
    return record.response as T;
  }

  const result = await work();
  await completeIdempotencyRecord.run({ ...scope, response: JSON.stringify(result) }, client);
  return result;
}
