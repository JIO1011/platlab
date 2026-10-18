/*
 * Registro de lo hecho en Mantenimiento (ADR 0020): inmutable, con un certificado PDF como mucho. Solo se
 * anula, una vez; la corrección es un registro nuevo que apunta al anulado (M-01b).
 */

/* @name sharePlan */
-- El plan elegido al registrar, compartido para que nadie lo archive ni lo cambie mientras tanto. Va antes
-- que el equipo, como en los comandos de planes, que bloquean el plan y después referencian al equipo.
SELECT kind, checklist, acceptance_criteria, archived_at, version
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
-- La lista marcada llega como texto JSON (pg enviaría un arreglo como arreglo de PostgreSQL). Con plan,
-- la versión con que se llenó y la copia de su criterio de aceptación; un correctivo, el incidente que
-- atiende; una corrección, el registro anulado.
INSERT INTO maintenance.records (
  workspace_id, asset_id, plan_id, plan_version, acceptance_criteria, kind, performed_on, provider_id, result,
  observations, checklist, cost, valid_until, recorded_by_principal_id, fault_id, corrects_record_id
)
VALUES (
  :workspaceId!, :assetId!, :planId, :planVersion, :acceptanceCriteria, :kind!, :performedOn!::date, :providerId,
  :result!, :observations, :checklist!::jsonb, :cost::numeric, :validUntil::date, :recordedBy!, :faultId,
  :correctsRecordId
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
-- proveedor, quién registró, el certificado y, si se anuló o corrige a otro, quién, cuándo y cuál. Los
-- anulados siguen a la vista. `recorded_key` lleva la hora exacta para el cursor.
SELECT
  r.id, r.asset_id, a.code AS "asset_code!", a.name AS "asset_name!", r.plan_id, p.title AS "plan_title?",
  r.kind, r.performed_on, r.provider_id, pv.name AS "provider_name?", r.result, r.observations, r.checklist,
  trim_scale(r.cost) AS cost, r.valid_until, r.acceptance_criteria, ident.display_name AS "recorded_by_name?",
  r.recorded_at, r.recorded_at::text AS "recorded_key!",
  c.url AS "certificate_url?", c.byte_size AS "certificate_byte_size?", c.uploaded_at AS "certificate_uploaded_at?",
  r.fault_id, r.corrects_record_id, corrected.performed_on AS "corrects_performed_on?",
  r.voided_at, r.void_reason, voider.display_name AS "voided_by_name?",
  correction.id AS "corrected_by_id?", correction.performed_on AS "corrected_by_performed_on?"
FROM maintenance.records AS r
JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id
LEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id
LEFT JOIN maintenance.providers AS pv ON pv.workspace_id = r.workspace_id AND pv.id = r.provider_id
LEFT JOIN maintenance.record_certificates AS c ON c.workspace_id = r.workspace_id AND c.record_id = r.id
LEFT JOIN core.principals AS pr ON pr.workspace_id = r.workspace_id AND pr.id = r.recorded_by_principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
LEFT JOIN maintenance.records AS corrected ON corrected.workspace_id = r.workspace_id AND corrected.id = r.corrects_record_id
LEFT JOIN maintenance.records AS correction ON correction.workspace_id = r.workspace_id AND correction.corrects_record_id = r.id
LEFT JOIN core.principals AS vpr ON vpr.workspace_id = r.workspace_id AND vpr.id = r.voided_by_principal_id
LEFT JOIN core.memberships AS vm ON vm.workspace_id = vpr.workspace_id AND vm.id = vpr.membership_id
LEFT JOIN core.identities AS voider ON voider.id = vm.identity_id
WHERE r.workspace_id = :workspaceId!
  AND (:recordId::uuid IS NULL OR r.id = :recordId::uuid)
  AND (:assetId::uuid IS NULL OR r.asset_id = :assetId::uuid)
  AND (:afterOn::date IS NULL
       OR (r.performed_on, r.recorded_at, r.id) < (:afterOn::date, :afterAt::timestamptz, :afterId::uuid))
ORDER BY r.performed_on DESC, r.recorded_at DESC, r.id DESC
LIMIT :limit!;

/* @name recordExists */
-- Antes de subir un certificado: el registro es del espacio y no está anulado.
SELECT voided_at FROM maintenance.records WHERE workspace_id = :workspaceId! AND id = :recordId!;

/* @name insertCertificate */
-- Un registro con certificado (record_certificates único por registro) no inserta nada: el comando
-- responde CONFLICT.
INSERT INTO maintenance.record_certificates (
  id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id
)
VALUES (:id!, :workspaceId!, :recordId!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)
ON CONFLICT (workspace_id, record_id) DO NOTHING
RETURNING id;

/* @name lockRecord */
-- El registro vigente que se anula, se corrige o recibe su certificado, bloqueado: dos anulaciones a la vez no
-- pasan las dos, y un certificado no llega a un registro recién anulado. Al bloquear, la política records_void
-- oculta los anulados: sin fila, el registro no existe o ya está anulado.
SELECT asset_id
FROM maintenance.records
WHERE workspace_id = :workspaceId! AND id = :recordId!
FOR UPDATE;

/* @name voidRecord */
-- Una sola vez: un anulado no vuelve a anularse (y la política records_void no lo deja ver al actualizar).
UPDATE maintenance.records
SET voided_at = now(), voided_by_principal_id = :actorId!, void_reason = :reason!
WHERE workspace_id = :workspaceId! AND id = :recordId! AND voided_at IS NULL
RETURNING id;

/* @name carryCertificate */
-- La corrección lleva el certificado del anulado: una fila nueva que apunta al mismo archivo y, para no
-- encadenar, al certificado subido de origen. Sin certificado en el anulado no inserta nada.
INSERT INTO maintenance.record_certificates (
  workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id, carried_from_id
)
SELECT workspace_id, :recordId!, object_path, url, byte_size, sha256, :uploadedBy!, coalesce(carried_from_id, id)
FROM maintenance.record_certificates
WHERE workspace_id = :workspaceId! AND record_id = :fromRecordId!
RETURNING id;
