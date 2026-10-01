/** Types generated for queries found in "src/platform/db/context.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'SetRequestContext' parameters type */
export interface ISetRequestContextParams {
  principalId: string;
  workspaceId: string;
}

/** 'SetRequestContext' return type */
export interface ISetRequestContextResult {
  principal_id: string | null;
  workspace_id: string | null;
}

/** 'SetRequestContext' query type */
export interface ISetRequestContextQuery {
  params: ISetRequestContextParams;
  result: ISetRequestContextResult;
}

const setRequestContextIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":56}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":131}]}],"statement":"SELECT\n  set_config('platlab.workspace_id', :workspaceId!, true) AS workspace_id,\n  set_config('platlab.principal_id', :principalId!, true) AS principal_id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   set_config('platlab.workspace_id', :workspaceId!, true) AS workspace_id,
 *   set_config('platlab.principal_id', :principalId!, true) AS principal_id
 * ```
 */
export const setRequestContext = new PreparedQuery<ISetRequestContextParams,ISetRequestContextResult>(setRequestContextIR);


