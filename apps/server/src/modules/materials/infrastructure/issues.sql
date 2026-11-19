/* Detalle de las salidas de Materiales (MA-01f): tipo y solicitante, 1:1 con la operación del libro. */

/* @name insertIssueDetail */
INSERT INTO materials.issue_details (workspace_id, operation_id, purpose, requester_principal_id)
VALUES (:workspaceId!, :operationId!, :purpose!, :requesterId);
