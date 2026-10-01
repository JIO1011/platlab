/** Types generated for queries found in "src/modules/core/infrastructure/audit.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'InsertAuditEvent' parameters type */
export interface IInsertAuditEventParams {
  action: string;
  changes: Json;
  correlationId: string;
  entityId?: string | null | void;
  entityType: string;
  principalId: string;
  reason?: string | null | void;
  workspaceId: string;
}

/** 'InsertAuditEvent' return type */
export interface IInsertAuditEventResult {
  id: string;
}

/** 'InsertAuditEvent' query type */
export interface IInsertAuditEventQuery {
  params: IInsertAuditEventParams;
  result: IInsertAuditEventResult;
}

const insertAuditEventIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true,"action":true,"entityType":true,"entityId":true,"correlationId":true,"reason":true,"changes":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":227,"b":239}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":242,"b":254}]},{"name":"action","required":true,"transform":{"type":"scalar"},"locs":[{"a":257,"b":264}]},{"name":"entityType","required":true,"transform":{"type":"scalar"},"locs":[{"a":267,"b":278}]},{"name":"entityId","required":false,"transform":{"type":"scalar"},"locs":[{"a":281,"b":289}]},{"name":"correlationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":292,"b":306}]},{"name":"reason","required":false,"transform":{"type":"scalar"},"locs":[{"a":309,"b":315}]},{"name":"changes","required":true,"transform":{"type":"scalar"},"locs":[{"a":318,"b":326}]}],"statement":"-- El actor es el principal del contexto; la política de RLS rechaza cualquier otro.\nINSERT INTO core.audit_events\n  (workspace_id, actor_principal_id, action, entity_type, entity_id, correlation_id, reason, changes)\nVALUES\n  (:workspaceId!, :principalId!, :action!, :entityType!, :entityId, :correlationId!, :reason, :changes!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- El actor es el principal del contexto; la política de RLS rechaza cualquier otro.
 * INSERT INTO core.audit_events
 *   (workspace_id, actor_principal_id, action, entity_type, entity_id, correlation_id, reason, changes)
 * VALUES
 *   (:workspaceId!, :principalId!, :action!, :entityType!, :entityId, :correlationId!, :reason, :changes!)
 * RETURNING id
 * ```
 */
export const insertAuditEvent = new PreparedQuery<IInsertAuditEventParams,IInsertAuditEventResult>(insertAuditEventIR);


