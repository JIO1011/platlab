/* @name claimIdempotencyKey */
-- Si otra transacción ya reclamó la clave, espera a que termine (02 §12: espera máxima de bloqueo);
-- si esa transacción revierte, esta la reclama.
INSERT INTO platform.idempotency_records (workspace_id, principal_id, operation, key, request_hash)
VALUES (:workspaceId!, :principalId!, :operation!, :key!, :requestHash!)
ON CONFLICT (workspace_id, principal_id, operation, key) DO NOTHING
RETURNING key;

/* @name findIdempotencyRecord */
SELECT request_hash, response
FROM platform.idempotency_records
WHERE workspace_id = :workspaceId!
  AND principal_id = :principalId!
  AND operation = :operation!
  AND key = :key!;

/* @name completeIdempotencyRecord */
UPDATE platform.idempotency_records
SET response = :response!
WHERE workspace_id = :workspaceId!
  AND principal_id = :principalId!
  AND operation = :operation!
  AND key = :key!
  AND response IS NULL;
