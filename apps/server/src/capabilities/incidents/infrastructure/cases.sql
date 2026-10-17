/* Capacidad incidencias (ADR 0019): fallas de los recursos de cada módulo. Solo esta capacidad escribe en su esquema. */

/* @name insertCase */
INSERT INTO incidents.cases
  (workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id)
VALUES (:workspaceId!, :moduleCode!, :assetId, :faultType!, :description!, :usable!, :reportedBy!)
RETURNING id;

/* @name lockCase */
-- La falla del módulo que la pide, bloqueada antes que su recurso (02 §6).
SELECT id, status, asset_id
FROM incidents.cases
WHERE workspace_id = :workspaceId! AND id = :caseId! AND module_code = :moduleCode!
FOR UPDATE;

/* @name attendCase */
UPDATE incidents.cases
SET status = 'in_progress', attended_by_principal_id = :actorId!, attended_at = now(), version = version + 1
WHERE workspace_id = :workspaceId! AND id = :caseId! AND status = 'open'
RETURNING id;

/* @name resolveCase */
-- Solucionar un incidente reportado lo da por atendido por quien lo soluciona; es el último paso.
UPDATE incidents.cases
SET status = 'resolved', resolution = :resolution!, resolved_by_principal_id = :actorId!, resolved_at = now(),
    attended_by_principal_id = coalesce(attended_by_principal_id, :actorId!),
    attended_at = coalesce(attended_at, now()), version = version + 1
WHERE workspace_id = :workspaceId! AND id = :caseId! AND status IN ('open', 'in_progress')
RETURNING id;
