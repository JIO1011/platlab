/** Types generated for queries found in "src/platform/db/smoke.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'SmokeTypes' parameters type */
export interface ISmokeTypesParams {
  amount: string;
  day: string;
}

/** 'SmokeTypes' return type */
export interface ISmokeTypesResult {
  amount: string | null;
  day: string | null;
  workspace_id: string | null;
}

/** 'SmokeTypes' query type */
export interface ISmokeTypesQuery {
  params: ISmokeTypesParams;
  result: ISmokeTypesResult;
}

const smokeTypesIR: any = {"usedParamSet":{"amount":true,"day":true},"params":[{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":10,"b":17}]},{"name":"day","required":true,"transform":{"type":"scalar"},"locs":[{"a":50,"b":54}]}],"statement":"SELECT\n  (:amount!)::numeric(24, 9) AS amount,\n  (:day!)::date AS day,\n  current_setting('platlab.workspace_id', true) AS workspace_id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   (:amount!)::numeric(24, 9) AS amount,
 *   (:day!)::date AS day,
 *   current_setting('platlab.workspace_id', true) AS workspace_id
 * ```
 */
export const smokeTypes = new PreparedQuery<ISmokeTypesParams,ISmokeTypesResult>(smokeTypesIR);


/** 'CurrentRole' parameters type */
export type ICurrentRoleParams = void;

/** 'CurrentRole' return type */
export interface ICurrentRoleResult {
  bypasses_rls: boolean | null;
  is_superuser: boolean | null;
  role_name: string | null;
}

/** 'CurrentRole' query type */
export interface ICurrentRoleQuery {
  params: ICurrentRoleParams;
  result: ICurrentRoleResult;
}

const currentRoleIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT current_user AS role_name, r.rolsuper AS is_superuser, r.rolbypassrls AS bypasses_rls\nFROM pg_roles AS r\nWHERE r.rolname = current_user"};

/**
 * Query generated from SQL:
 * ```
 * SELECT current_user AS role_name, r.rolsuper AS is_superuser, r.rolbypassrls AS bypasses_rls
 * FROM pg_roles AS r
 * WHERE r.rolname = current_user
 * ```
 */
export const currentRole = new PreparedQuery<ICurrentRoleParams,ICurrentRoleResult>(currentRoleIR);


