/*
  Usuarios del Núcleo (ADR 0027): lista blanca, rol de cada miembro y último acceso. Cada consulta filtra el
  espacio de forma explícita; RLS es la segunda barrera. Los roles de Usuarios llegan como :roles, en el orden en
  que se elige el principal de quien tuviera varios.
*/

/* @name listMembers */
-- Miembros del espacio, también los quitados. Inactivo: activo sin entrar en :inactiveDays días; quien nunca entró
-- cuenta desde que se unió.
SELECT
  m.id AS membership_id,
  pr.id AS principal_id,
  ident.display_name AS name,
  ident.email,
  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!",
  role.code AS "role?",
  m.status,
  m.created_at AS joined_at,
  m.revoked_at,
  pres.last_seen_at AS "last_seen_at?",
  (m.status = 'active'
    AND coalesce(pres.last_seen_at, m.created_at) < now() - make_interval(days => :inactiveDays!::int)) AS "inactive!"
FROM core.memberships AS m
JOIN core.workspaces AS w ON w.id = m.workspace_id
JOIN core.identities AS ident ON ident.id = m.identity_id
JOIN core.principals AS pr ON pr.workspace_id = m.workspace_id AND pr.membership_id = m.id
LEFT JOIN core.member_presence AS pres ON pres.workspace_id = m.workspace_id AND pres.membership_id = m.id
LEFT JOIN LATERAL (
  SELECT ra.role_code AS code
  FROM core.role_assignments AS ra
  WHERE ra.workspace_id = m.workspace_id AND ra.principal_id = pr.id
    AND ra.revoked_at IS NULL AND ra.valid_from <= now() AND (ra.valid_until IS NULL OR ra.valid_until > now())
    AND ra.role_code = ANY (:roles!::text[])
  ORDER BY array_position(:roles!::text[], ra.role_code)
  LIMIT 1
) AS role ON true
WHERE m.workspace_id = :workspaceId!
ORDER BY m.status, inventory.fold_text(ident.display_name), m.id;

/* @name listPendingInvitations */
SELECT i.id, i.display_name AS name, i.email, i.role_code, i.invited_at
FROM core.invitations AS i
WHERE i.workspace_id = :workspaceId! AND i.status = 'pending'
ORDER BY i.invited_at DESC, i.id;

/* @name findEmailUse */
-- ¿El correo ya es de un miembro activo o ya está pendiente? Lo pendiente repetido también lo impide el índice.
SELECT
  EXISTS (
    SELECT 1
    FROM core.memberships AS m
    JOIN core.identities AS ident ON ident.id = m.identity_id
    WHERE m.workspace_id = :workspaceId! AND m.status = 'active' AND ident.email = :email!
  ) AS "member!",
  EXISTS (
    SELECT 1 FROM core.invitations AS i
    WHERE i.workspace_id = :workspaceId! AND i.status = 'pending' AND i.email = :email!
  ) AS "pending!";

/* @name insertInvitation */
INSERT INTO core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)
VALUES (:workspaceId!, :email!, :name!, :role!, :principalId!)
RETURNING id, invited_at;

/* @name revokeInvitation */
UPDATE core.invitations
SET status = 'revoked', revoked_at = now(), revoked_by_principal_id = :principalId!
WHERE workspace_id = :workspaceId! AND id = :invitationId! AND status = 'pending'
RETURNING id, email;

/* @name lockMember */
-- Cambiar el rol o quitar: incrementa la versión de la membresía para esperar a las operaciones en curso del
-- miembro, que la leyeron con FOR SHARE, y para que las siguientes relean sus permisos (02 §6).
UPDATE core.memberships AS m
SET version = m.version + 1
FROM core.workspaces AS w, core.principals AS pr
WHERE m.workspace_id = :workspaceId! AND m.id = :membershipId!
  AND w.id = m.workspace_id
  AND pr.workspace_id = m.workspace_id AND pr.membership_id = m.id
RETURNING m.id, m.status, pr.id AS principal_id, (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!";

/* @name currentRole */
SELECT ra.role_code
FROM core.role_assignments AS ra
WHERE ra.workspace_id = :workspaceId! AND ra.principal_id = :principalId!
  AND ra.revoked_at IS NULL AND ra.valid_from <= now() AND (ra.valid_until IS NULL OR ra.valid_until > now())
  AND ra.role_code = ANY (:roles!::text[])
ORDER BY array_position(:roles!::text[], ra.role_code)
LIMIT 1;

/* @name revokeRoles */
-- Sin :roles, todas las abiertas (al quitar); con :roles, solo esas (al cambiar el rol).
UPDATE core.role_assignments
SET revoked_at = now()
WHERE workspace_id = :workspaceId! AND principal_id = :principalId! AND revoked_at IS NULL
  AND (:roles::text[] IS NULL OR role_code = ANY (:roles::text[]))
RETURNING role_code;

/* @name grantRole */
INSERT INTO core.role_assignments (workspace_id, principal_id, role_code)
VALUES (:workspaceId!, :principalId!, :role!);

/* @name revokeMembership */
UPDATE core.memberships
SET status = 'revoked', revoked_at = now()
WHERE workspace_id = :workspaceId! AND id = :membershipId! AND status = 'active';

/* @name touchPresence */
-- Último acceso al abrir el espacio, como máximo una escritura por hora (02 §12).
INSERT INTO core.member_presence (workspace_id, membership_id, last_seen_at)
VALUES (:workspaceId!, :membershipId!, now())
ON CONFLICT (workspace_id, membership_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
WHERE core.member_presence.last_seen_at < now() - interval '1 hour';

/* @name listMyInvitations */
-- Invitaciones pendientes para el correo del JWT, en espacios que todavía se ven.
SELECT i.id, i.workspace_id, w.name AS workspace_name, w.institution_name, i.role_code
FROM core.invitations AS i
JOIN core.workspaces AS w ON w.id = i.workspace_id
WHERE i.status = 'pending' AND i.email = :email!
  AND cardinality(core.workspace_axis(w.status, w.suspension_reason)) > 0
ORDER BY w.name, i.id;

/* @name admitJoin */
-- Unirse es una operación nueva del espacio: lo bloquea con FOR SHARE antes que todo lo demás (02 §6).
SELECT core.admission('new_operation', core.workspace_axis(w.status, w.suspension_reason), core.action_classes()) AS "decision!"
FROM core.workspaces AS w
WHERE w.id = :workspaceId!
FOR SHARE;

/* @name findInvitation */
SELECT i.id, i.display_name, i.role_code, i.status, i.membership_id
FROM core.invitations AS i
WHERE i.workspace_id = :workspaceId! AND i.id = :invitationId! AND i.email = :email!;

/* @name upsertIdentity */
-- La propia identidad: la crea con el nombre de la invitación o, si ya existe, solo guarda su correo.
INSERT INTO core.identities (provider, provider_subject, display_name, email)
VALUES ('supabase', :subject!, :displayName!, :email!)
ON CONFLICT (provider, provider_subject) DO UPDATE SET email = excluded.email
RETURNING id;

/* @name joinMembership */
-- La membresía propia: nueva, o la misma de antes reactivada; incrementa su versión como un cambio de estado.
INSERT INTO core.memberships (workspace_id, identity_id)
VALUES (:workspaceId!, :identityId!)
ON CONFLICT (workspace_id, identity_id)
  DO UPDATE SET status = 'active', revoked_at = NULL, version = core.memberships.version + 1
RETURNING id;

/* @name ensurePrincipal */
WITH created AS (
  INSERT INTO core.principals (workspace_id, kind, membership_id)
  VALUES (:workspaceId!, 'member', :membershipId!)
  ON CONFLICT (workspace_id, membership_id) DO NOTHING
  RETURNING id
)
SELECT id AS "id!" FROM created
UNION ALL
SELECT pr.id FROM core.principals AS pr WHERE pr.workspace_id = :workspaceId! AND pr.membership_id = :membershipId!
LIMIT 1;

/* @name acceptInvitation */
UPDATE core.invitations
SET status = 'accepted', membership_id = :membershipId!, accepted_at = now()
WHERE workspace_id = :workspaceId! AND id = :invitationId! AND status = 'pending'
RETURNING id;
