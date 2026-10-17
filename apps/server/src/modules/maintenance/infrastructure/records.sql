/* Registro de lo hecho en Mantenimiento (ADR 0020): inmutable, con un certificado PDF como mucho. */

/* @name sharePlan */
-- El plan elegido al registrar, compartido para que nadie lo archive ni lo cambie mientras tanto. Va antes
-- que el equipo, como en los comandos de planes, que bloquean el plan y después referencian al equipo.
SELECT kind, checklist, archived_at
FROM maintenance.plans
WHERE workspace_id = :workspaceId! AND id = :planId!
FOR SHARE;

/* @name shareProvider */
-- El proveedor elegido al registrar, compartido para que nadie lo archive mientras tanto.
SELECT archived_at
FROM maintenance.providers
WHERE workspace_id = :workspaceId! AND id = :providerId!
FOR SHARE;

/* @name insertRecord */
-- La lista marcada llega como texto JSON (pg enviaría un arreglo como arreglo de PostgreSQL).
INSERT INTO maintenance.records (
  workspace_id, asset_id, plan_id, kind, performed_on, provider_id, result, observations, checklist, cost,
  valid_until, conservation, recorded_by_principal_id
)
VALUES (
  :workspaceId!, :assetId!, :planId, :kind!, :performedOn!::date, :providerId, :result!, :observations,
  :checklist!::jsonb, :cost::numeric, :validUntil::date, :conservation, :recordedBy!
)
RETURNING id;

/* @name nextDueOn */
-- La próxima fecha del plan para el equipo (plan_assets); sin fila, el plan no lo cubre.
SELECT due_on AS "due_on!"
FROM maintenance.plan_assets
WHERE workspace_id = :workspaceId! AND plan_id = :planId! AND asset_id = :assetId!;

/* @name listRecords */
-- Del más reciente al más antiguo: por la fecha del trabajo y después por cuándo se registró. Con
-- :recordId, uno; con :assetId, los de un equipo (índice records_asset). Con el equipo, el plan, el
-- proveedor, quién registró y el certificado. `recorded_key` lleva la hora exacta para el cursor.
SELECT
  r.id, r.asset_id, a.code AS "asset_code!", a.name AS "asset_name!", r.plan_id, p.title AS "plan_title?",
  r.kind, r.performed_on, r.provider_id, pv.name AS "provider_name?", r.result, r.observations, r.checklist,
  trim_scale(r.cost) AS cost, r.valid_until, r.conservation, ident.display_name AS "recorded_by_name?",
  r.recorded_at, r.recorded_at::text AS "recorded_key!",
  c.url AS "certificate_url?", c.byte_size AS "certificate_byte_size?", c.uploaded_at AS "certificate_uploaded_at?"
FROM maintenance.records AS r
JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id
LEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id
LEFT JOIN maintenance.providers AS pv ON pv.workspace_id = r.workspace_id AND pv.id = r.provider_id
LEFT JOIN maintenance.record_certificates AS c ON c.workspace_id = r.workspace_id AND c.record_id = r.id
LEFT JOIN core.principals AS pr ON pr.workspace_id = r.workspace_id AND pr.id = r.recorded_by_principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
WHERE r.workspace_id = :workspaceId!
  AND (:recordId::uuid IS NULL OR r.id = :recordId::uuid)
  AND (:assetId::uuid IS NULL OR r.asset_id = :assetId::uuid)
  AND (:afterOn::date IS NULL
       OR (r.performed_on, r.recorded_at, r.id) < (:afterOn::date, :afterAt::timestamptz, :afterId::uuid))
ORDER BY r.performed_on DESC, r.recorded_at DESC, r.id DESC
LIMIT :limit!;

/* @name recordExists */
-- Antes de subir un certificado: el registro es del espacio.
SELECT id FROM maintenance.records WHERE workspace_id = :workspaceId! AND id = :recordId!;

/* @name insertCertificate */
-- Un registro con certificado (record_certificates único por registro) no inserta nada: el comando
-- responde CONFLICT.
INSERT INTO maintenance.record_certificates (
  id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id
)
VALUES (:id!, :workspaceId!, :recordId!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)
ON CONFLICT (workspace_id, record_id) DO NOTHING
RETURNING id;
