/*
  Acceso y admisión (02 §5–§6). Cada consulta filtra el espacio de forma explícita;
  RLS es la segunda barrera, no la única. La decisión la toma siempre core.admission.
*/

/* @name findIdentity */
SELECT id, display_name
FROM core.identities
WHERE provider = 'supabase' AND provider_subject = :subject!;

/* @name listMyWorkspaces */
SELECT
  w.id,
  w.code,
  w.name,
  w.status,
  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!"
FROM core.memberships AS m
JOIN core.workspaces AS w ON w.id = m.workspace_id
WHERE m.identity_id = :identityId!
  AND m.status = 'active'
  AND cardinality(core.workspace_axis(w.status, w.suspension_reason)) > 0
ORDER BY w.name, w.id;

/* @name admitWorkspace */
-- Rutas de Core: admisión con el eje espacio (Core no tiene derecho propio). Bloquea espacio y
-- membresía con FOR SHARE en el orden fijo; una revocación o un cambio de estado esperan a que
-- esta transacción termine y, si ya se confirmaron, la relectura excluye la fila o cambia la decisión.
SELECT
  w.id AS workspace_id,
  w.code,
  w.name,
  w.status,
  w.time_zone,
  i.id AS identity_id,
  i.display_name,
  m.id AS membership_id,
  p.id AS principal_id,
  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!",
  core.workspace_axis(w.status, w.suspension_reason) AS "workspace_classes!",
  core.admission(:actionClass!, core.workspace_axis(w.status, w.suspension_reason), core.action_classes()) AS "decision!"
FROM core.workspaces AS w
JOIN core.memberships AS m ON m.workspace_id = w.id
JOIN core.identities AS i ON i.id = m.identity_id
JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
WHERE w.id = :workspaceId!
  AND m.status = 'active'
  AND i.provider = 'supabase'
  AND i.provider_subject = :subject!
FOR SHARE OF w, m;

/* @name admitModule */
-- Operaciones de un módulo: lee espacio, derecho y membresía con FOR SHARE en la misma consulta
-- que decide, en el orden fijo espacio → derecho → membresía (02 §6). Si un cambio de estado
-- confirma mientras espera, PostgreSQL relee las filas y la decisión se recalcula con ellas.
-- Sin derecho no devuelve filas: findMembershipClasses elige entonces el error.
SELECT
  w.id AS workspace_id,
  w.code,
  w.name,
  w.status,
  w.time_zone,
  i.id AS identity_id,
  i.display_name,
  m.id AS membership_id,
  p.id AS principal_id,
  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!",
  core.workspace_axis(w.status, w.suspension_reason) AS "workspace_classes!",
  core.admission(
    :actionClass!,
    core.workspace_axis(w.status, w.suspension_reason),
    core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
                     md.stage, e.contract_kind, env.data_class, now())
  ) AS "decision!"
FROM core.workspaces AS w
JOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = :moduleCode!
JOIN core.module_definitions AS md ON md.code = e.module_code
JOIN core.memberships AS m ON m.workspace_id = w.id
JOIN core.identities AS i ON i.id = m.identity_id
JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
CROSS JOIN platform.environment AS env
WHERE w.id = :workspaceId!
  AND m.status = 'active'
  AND i.provider = 'supabase'
  AND i.provider_subject = :subject!
FOR SHARE OF w, e, m;

/* @name findMembershipClasses */
-- Sin bloqueo: solo distingue «sin acceso» de «módulo no disponible» tras una denegación.
SELECT core.workspace_axis(w.status, w.suspension_reason) AS "workspace_classes!"
FROM core.workspaces AS w
JOIN core.memberships AS m ON m.workspace_id = w.id
JOIN core.identities AS i ON i.id = m.identity_id
WHERE w.id = :workspaceId!
  AND m.status = 'active'
  AND i.provider = 'supabase'
  AND i.provider_subject = :subject!;

/* @name listModuleAccess */
-- Clases que la misma función de admisión concede hoy en cada módulo con derecho, para /me y /home.
SELECT
  md.code,
  md.name,
  array(
    SELECT c
    FROM unnest(core.action_classes()) WITH ORDINALITY AS a (c, n)
    WHERE core.admission(
      c,
      core.workspace_axis(w.status, w.suspension_reason),
      core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
                       md.stage, e.contract_kind, env.data_class, now())
    ) = 'admitted'
    ORDER BY n
  ) AS "access!"
FROM core.workspace_entitlements AS e
JOIN core.workspaces AS w ON w.id = e.workspace_id
JOIN core.module_definitions AS md ON md.code = e.module_code
CROSS JOIN platform.environment AS env
WHERE e.workspace_id = :workspaceId!
ORDER BY md.code;

/* @name listPermissionCodes */
SELECT DISTINCT rp.permission_code
FROM core.role_assignments AS ra
JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code
WHERE ra.workspace_id = :workspaceId!
  AND ra.principal_id = :principalId!
  AND ra.revoked_at IS NULL
  AND ra.valid_from <= now()
  AND (ra.valid_until IS NULL OR ra.valid_until > now())
ORDER BY rp.permission_code;

/* @name hasPermissionAt */
-- Un rol aplica en la ubicación si su ámbito es todo el espacio o un ancestro de ella (03 §3).
-- Una ubicación de otro espacio no tiene ancestros aquí: solo valdría un rol de todo el espacio,
-- y la operación la rechaza después por no encontrarla.
WITH RECURSIVE ancestors (id, parent_id) AS (
  SELECT l.id, l.parent_id
  FROM core.locations AS l
  WHERE l.workspace_id = :workspaceId! AND l.id = :locationId!
  UNION
  SELECT l.id, l.parent_id
  FROM core.locations AS l
  JOIN ancestors AS a ON l.id = a.parent_id
  WHERE l.workspace_id = :workspaceId!
)
SELECT EXISTS (
  SELECT 1
  FROM core.role_assignments AS ra
  JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code
  WHERE ra.workspace_id = :workspaceId!
    AND ra.principal_id = :principalId!
    AND rp.permission_code = :permission!
    AND ra.revoked_at IS NULL
    AND ra.valid_from <= now()
    AND (ra.valid_until IS NULL OR ra.valid_until > now())
    AND (ra.location_id IS NULL OR ra.location_id IN (SELECT id FROM ancestors))
) AS "allowed!";
