import type pg from 'pg';

/** Tipo de ítem del módulo dueño (02 §4): Reactivos solo opera ítems `reagent`. */
type ItemKind = 'reagent' | 'material';

/**
 * Lo que la capacidad necesita del caso de uso que la invoca: la transacción ya admitida,
 * el actor verificado y el tipo de ítem del módulo. La capacidad no decide permisos.
 */
export interface InventoryContext {
  client: pg.PoolClient;
  workspaceId: string;
  principalId: string;
  correlationId: string;
  kind: ItemKind;
}

/** SQLSTATE y restricción de un error de PostgreSQL, si lo es. */
export function pgViolation(error: unknown): { code: string; constraint: string | undefined } | null {
  const candidate = error as { code?: unknown; constraint?: unknown } | null;
  if (typeof candidate?.code !== 'string') return null;
  return {
    code: candidate.code,
    constraint: typeof candidate.constraint === 'string' ? candidate.constraint : undefined,
  };
}
