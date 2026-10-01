import pg from 'pg';

// OIDs estables de PostgreSQL.
const NUMERIC_OID = 1700;
const DATE_OID = 1082;
const NUMERIC_ARRAY_OID = 1231;
const DATE_ARRAY_OID = 1182;
// `pg.types.TypeId` solo enumera tipos escalares; text[] (1009) es un OID válido.
const TEXT_ARRAY_OID = 1009 as Parameters<typeof pg.types.getTypeParser>[0];

const asString = (value: string) => value;
// El parser de text[] devuelve un arreglo de cadenas sin convertir cada elemento.
const asStringArray = pg.types.getTypeParser(TEXT_ARRAY_OID, 'text');

/**
 * Parsers alineados con los tipos de PgTyped (ADR 0006): `numeric`, `date` y sus
 * arreglos llegan como cadenas. Por defecto `pg` convierte `numeric[]` en `number`
 * (pierde precisión) y `date[]` en `Date`.
 */
const typeParsers = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === NUMERIC_OID || oid === DATE_OID) return asString;
    if (oid === NUMERIC_ARRAY_OID || oid === DATE_ARRAY_OID) return asStringArray;
    return pg.types.getTypeParser(oid, format);
  },
};

export interface PoolOptions {
  connectionString: string;
  max?: number;
  /** Tiempo máximo por sentencia; 5 s interactivo, 30 s el worker (02 §12). */
  statementTimeoutMs?: number;
  /** Espera máxima por un bloqueo antes de responder conflicto transitorio (02 §6, §12). */
  lockTimeoutMs?: number;
}

/** Pool pequeño por proceso; tamaños y tiempos iniciales viven en 02 §12. */
export function createPool({
  connectionString,
  max = 5,
  statementTimeoutMs = 5_000,
  lockTimeoutMs = 1_000,
}: PoolOptions): pg.Pool {
  return new pg.Pool({
    connectionString,
    max,
    types: typeParsers,
    statement_timeout: statementTimeoutMs,
    lock_timeout: lockTimeoutMs,
  });
}
