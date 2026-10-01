/*
  Acceso mínimo de T-03 (02 §5–§6). Cada consulta filtra el espacio de forma explícita;
  RLS es la segunda barrera, no la única.
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
  AND w.status IN ('trial', 'active', 'suspended', 'closing')
ORDER BY w.name, w.id;

/* @name lockMembership */
-- Lee espacio y membresía con bloqueo compartido en la misma consulta que decide (02 §6),
-- en el orden fijo espacio → membresía. Una revocación o un cambio de estado esperan a que esta
-- transacción termine; si ya se confirmaron, la relectura de FOR SHARE excluye la fila.
-- T-04 la sustituye por la admisión de dos ejes, que añade el derecho del módulo.
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
  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!"
FROM core.workspaces AS w
JOIN core.memberships AS m ON m.workspace_id = w.id
JOIN core.identities AS i ON i.id = m.identity_id
JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
WHERE w.id = :workspaceId!
  AND w.status IN ('trial', 'active', 'suspended', 'closing')
  AND m.status = 'active'
  AND i.provider = 'supabase'
  AND i.provider_subject = :subject!
FOR SHARE OF w, m;

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
