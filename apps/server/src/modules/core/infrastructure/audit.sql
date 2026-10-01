/* @name insertAuditEvent */
-- El actor es el principal del contexto; la política de RLS rechaza cualquier otro.
INSERT INTO core.audit_events
  (workspace_id, actor_principal_id, action, entity_type, entity_id, correlation_id, reason, changes)
VALUES
  (:workspaceId!, :principalId!, :action!, :entityType!, :entityId, :correlationId!, :reason, :changes!)
RETURNING id;
