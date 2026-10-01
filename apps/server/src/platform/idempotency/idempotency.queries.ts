/** Types generated for queries found in "src/platform/idempotency/idempotency.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'ClaimIdempotencyKey' parameters type */
export interface IClaimIdempotencyKeyParams {
  key: string;
  operation: string;
  principalId: string;
  requestHash: string;
  workspaceId: string;
}

/** 'ClaimIdempotencyKey' return type */
export interface IClaimIdempotencyKeyResult {
  key: string;
}

/** 'ClaimIdempotencyKey' query type */
export interface IClaimIdempotencyKeyQuery {
  params: IClaimIdempotencyKeyParams;
  result: IClaimIdempotencyKeyResult;
}

const claimIdempotencyKeyIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true,"operation":true,"key":true,"requestHash":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":258,"b":270}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":273,"b":285}]},{"name":"operation","required":true,"transform":{"type":"scalar"},"locs":[{"a":288,"b":298}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":301,"b":305}]},{"name":"requestHash","required":true,"transform":{"type":"scalar"},"locs":[{"a":308,"b":320}]}],"statement":"-- Si otra transacción ya reclamó la clave, espera a que termine (02 §12: espera máxima de bloqueo);\n-- si esa transacción revierte, esta la reclama.\nINSERT INTO platform.idempotency_records (workspace_id, principal_id, operation, key, request_hash)\nVALUES (:workspaceId!, :principalId!, :operation!, :key!, :requestHash!)\nON CONFLICT (workspace_id, principal_id, operation, key) DO NOTHING\nRETURNING key"};

/**
 * Query generated from SQL:
 * ```
 * -- Si otra transacción ya reclamó la clave, espera a que termine (02 §12: espera máxima de bloqueo);
 * -- si esa transacción revierte, esta la reclama.
 * INSERT INTO platform.idempotency_records (workspace_id, principal_id, operation, key, request_hash)
 * VALUES (:workspaceId!, :principalId!, :operation!, :key!, :requestHash!)
 * ON CONFLICT (workspace_id, principal_id, operation, key) DO NOTHING
 * RETURNING key
 * ```
 */
export const claimIdempotencyKey = new PreparedQuery<IClaimIdempotencyKeyParams,IClaimIdempotencyKeyResult>(claimIdempotencyKeyIR);


/** 'FindIdempotencyRecord' parameters type */
export interface IFindIdempotencyRecordParams {
  key: string;
  operation: string;
  principalId: string;
  workspaceId: string;
}

/** 'FindIdempotencyRecord' return type */
export interface IFindIdempotencyRecordResult {
  request_hash: string;
  response: Json | null;
}

/** 'FindIdempotencyRecord' query type */
export interface IFindIdempotencyRecordQuery {
  params: IFindIdempotencyRecordParams;
  result: IFindIdempotencyRecordResult;
}

const findIdempotencyRecordIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true,"operation":true,"key":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":85,"b":97}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":120,"b":132}]},{"name":"operation","required":true,"transform":{"type":"scalar"},"locs":[{"a":152,"b":162}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":176,"b":180}]}],"statement":"SELECT request_hash, response\nFROM platform.idempotency_records\nWHERE workspace_id = :workspaceId!\n  AND principal_id = :principalId!\n  AND operation = :operation!\n  AND key = :key!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT request_hash, response
 * FROM platform.idempotency_records
 * WHERE workspace_id = :workspaceId!
 *   AND principal_id = :principalId!
 *   AND operation = :operation!
 *   AND key = :key!
 * ```
 */
export const findIdempotencyRecord = new PreparedQuery<IFindIdempotencyRecordParams,IFindIdempotencyRecordResult>(findIdempotencyRecordIR);


/** 'CompleteIdempotencyRecord' parameters type */
export interface ICompleteIdempotencyRecordParams {
  key: string;
  operation: string;
  principalId: string;
  response: Json;
  workspaceId: string;
}

/** 'CompleteIdempotencyRecord' return type */
export type ICompleteIdempotencyRecordResult = void;

/** 'CompleteIdempotencyRecord' query type */
export interface ICompleteIdempotencyRecordQuery {
  params: ICompleteIdempotencyRecordParams;
  result: ICompleteIdempotencyRecordResult;
}

const completeIdempotencyRecordIR: any = {"usedParamSet":{"response":true,"workspaceId":true,"principalId":true,"operation":true,"key":true},"params":[{"name":"response","required":true,"transform":{"type":"scalar"},"locs":[{"a":51,"b":60}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":83,"b":95}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":130}]},{"name":"operation","required":true,"transform":{"type":"scalar"},"locs":[{"a":150,"b":160}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":178}]}],"statement":"UPDATE platform.idempotency_records\nSET response = :response!\nWHERE workspace_id = :workspaceId!\n  AND principal_id = :principalId!\n  AND operation = :operation!\n  AND key = :key!\n  AND response IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE platform.idempotency_records
 * SET response = :response!
 * WHERE workspace_id = :workspaceId!
 *   AND principal_id = :principalId!
 *   AND operation = :operation!
 *   AND key = :key!
 *   AND response IS NULL
 * ```
 */
export const completeIdempotencyRecord = new PreparedQuery<ICompleteIdempotencyRecordParams,ICompleteIdempotencyRecordResult>(completeIdempotencyRecordIR);


