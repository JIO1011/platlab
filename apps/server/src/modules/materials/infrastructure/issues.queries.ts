/** Types generated for queries found in "src/modules/materials/infrastructure/issues.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'InsertIssueDetail' parameters type */
export interface IInsertIssueDetailParams {
  operationId: string;
  purpose: string;
  requesterId?: string | null | void;
  workspaceId: string;
}

/** 'InsertIssueDetail' return type */
export type IInsertIssueDetailResult = void;

/** 'InsertIssueDetail' query type */
export interface IInsertIssueDetailQuery {
  params: IInsertIssueDetailParams;
  result: IInsertIssueDetailResult;
}

const insertIssueDetailIR: any = {"usedParamSet":{"workspaceId":true,"operationId":true,"purpose":true,"requesterId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":118}]},{"name":"operationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":133}]},{"name":"purpose","required":true,"transform":{"type":"scalar"},"locs":[{"a":136,"b":144}]},{"name":"requesterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":147,"b":158}]}],"statement":"INSERT INTO materials.issue_details (workspace_id, operation_id, purpose, requester_principal_id)\nVALUES (:workspaceId!, :operationId!, :purpose!, :requesterId)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO materials.issue_details (workspace_id, operation_id, purpose, requester_principal_id)
 * VALUES (:workspaceId!, :operationId!, :purpose!, :requesterId)
 * ```
 */
export const insertIssueDetail = new PreparedQuery<IInsertIssueDetailParams,IInsertIssueDetailResult>(insertIssueDetailIR);


