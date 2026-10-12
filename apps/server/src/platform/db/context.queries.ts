/** Types generated for queries found in "src/platform/db/context.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'SetRequestScope' parameters type */
export interface ISetRequestScopeParams {
  authSubject: string;
  workspaceId: string;
}

/** 'SetRequestScope' return type */
export interface ISetRequestScopeResult {
  auth_subject: string | null;
  workspace_id: string | null;
}

/** 'SetRequestScope' query type */
export interface ISetRequestScopeQuery {
  params: ISetRequestScopeParams;
  result: ISetRequestScopeResult;
}

const setRequestScopeIR: any = {"usedParamSet":{"authSubject":true,"workspaceId":true},"params":[{"name":"authSubject","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":56}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":131}]}],"statement":"SELECT\n  set_config('platlab.auth_subject', :authSubject!, true) AS auth_subject,\n  set_config('platlab.workspace_id', :workspaceId!, true) AS workspace_id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   set_config('platlab.auth_subject', :authSubject!, true) AS auth_subject,
 *   set_config('platlab.workspace_id', :workspaceId!, true) AS workspace_id
 * ```
 */
export const setRequestScope = new PreparedQuery<ISetRequestScopeParams,ISetRequestScopeResult>(setRequestScopeIR);


/** 'SetActor' parameters type */
export interface ISetActorParams {
  identityId: string;
  principalId: string;
}

/** 'SetActor' return type */
export interface ISetActorResult {
  identity_id: string | null;
  principal_id: string | null;
}

/** 'SetActor' query type */
export interface ISetActorQuery {
  params: ISetActorParams;
  result: ISetActorResult;
}

const setActorIR: any = {"usedParamSet":{"identityId":true,"principalId":true},"params":[{"name":"identityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":43,"b":54}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":116,"b":128}]}],"statement":"SELECT\n  set_config('platlab.identity_id', :identityId!, true) AS identity_id,\n  set_config('platlab.principal_id', :principalId!, true) AS principal_id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   set_config('platlab.identity_id', :identityId!, true) AS identity_id,
 *   set_config('platlab.principal_id', :principalId!, true) AS principal_id
 * ```
 */
export const setActor = new PreparedQuery<ISetActorParams,ISetActorResult>(setActorIR);


