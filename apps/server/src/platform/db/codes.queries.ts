/** Types generated for queries found in "src/platform/db/codes.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'LockCodes' parameters type */
export interface ILockCodesParams {
  key: string;
}

/** 'LockCodes' return type */
export interface ILockCodesResult {
  locked: string | null;
}

/** 'LockCodes' query type */
export interface ILockCodesQuery {
  params: ILockCodesParams;
  result: ILockCodesResult;
}

const lockCodesIR: any = {"usedParamSet":{"key":true},"params":[{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":185}]}],"statement":"-- Hasta el final de la transacción. Va en su propia sentencia: la siguiente consulta ya ve lo que\n-- confirmó quien tenía el bloqueo.\nSELECT pg_advisory_xact_lock(hashtextextended(:key!, 0))::text AS locked"};

/**
 * Query generated from SQL:
 * ```
 * -- Hasta el final de la transacción. Va en su propia sentencia: la siguiente consulta ya ve lo que
 * -- confirmó quien tenía el bloqueo.
 * SELECT pg_advisory_xact_lock(hashtextextended(:key!, 0))::text AS locked
 * ```
 */
export const lockCodes = new PreparedQuery<ILockCodesParams,ILockCodesResult>(lockCodesIR);


