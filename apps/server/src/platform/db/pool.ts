import pg from 'pg';

// OIDs estables de PostgreSQL.
const NUMERIC_OID = 1700;
const DATE_OID = 1082;

/**
 * Parsers alineados con los tipos de PgTyped (ADR 0006):
 * `numeric` y `date` llegan como cadenas, nunca como `number` ni `Date`.
 */
const typeParsers = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === NUMERIC_OID || oid === DATE_OID) {
      return (value: string) => value;
    }
    return pg.types.getTypeParser(oid, format);
  },
};

export interface PoolOptions {
  connectionString: string;
  max?: number;
}

/** Pool pequeño por proceso; el tamaño inicial vive en 02 §12. */
export function createPool({ connectionString, max = 5 }: PoolOptions): pg.Pool {
  return new pg.Pool({ connectionString, max, types: typeParsers });
}
