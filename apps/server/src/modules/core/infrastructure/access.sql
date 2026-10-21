/*
  Acceso y admisión (02 §5–§6). Cada consulta filtra el espacio de forma explícita;
  RLS es la segunda barrera, no la única. La decisión la toma siempre core.admission.
  Los permisos salen de core.effective_role_assignments: asignaciones más el rol Administrador
  implícito del propietario (ADR 0008, cambio del 02-10-2026). Los roles valen para todo el
  espacio: la ubicación es un dato del registro, no un límite de acceso (ADR 0016).
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
  w.institution_name,
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
-- Sin derecho no devuelve filas: findMembershipClasses elige entonces el error. Con :alsoModule, una
-- operación que toca dos módulos (ADR 0020) bloquea también ese derecho y decide con el primero que no
-- admita; sin él, e2 es el mismo derecho y la decisión no cambia.
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
  CASE WHEN d.owner_decision = 'admitted' THEN d.also_decision ELSE d.owner_decision END AS "decision!"
FROM core.workspaces AS w
JOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = :moduleCode!
JOIN core.module_definitions AS md ON md.code = e.module_code
JOIN core.workspace_entitlements AS e2 ON e2.workspace_id = w.id AND e2.module_code = coalesce(:alsoModule, :moduleCode!)
JOIN core.module_definitions AS md2 ON md2.code = e2.module_code
JOIN core.memberships AS m ON m.workspace_id = w.id
JOIN core.identities AS i ON i.id = m.identity_id
JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
CROSS JOIN platform.environment AS env
CROSS JOIN LATERAL (
  SELECT
    core.admission(
      :actionClass!,
      core.workspace_axis(w.status, w.suspension_reason),
      core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
                       md.stage, e.contract_kind, env.data_class, now())
    ) AS owner_decision,
    core.admission(
      :actionClass!,
      core.workspace_axis(w.status, w.suspension_reason),
      core.module_axis(e2.status, e2.valid_from, e2.valid_until, e2.closing_until, e2.read_until,
                       md2.stage, e2.contract_kind, env.data_class, now())
    ) AS also_decision
) AS d
WHERE w.id = :workspaceId!
  AND m.status = 'active'
  AND i.provider = 'supabase'
  AND i.provider_subject = :subject!
FOR SHARE OF w, e, e2, m;

/* @name admitAnyModule */
-- Áreas y departamentos (ADR 0024): Core no tiene derecho propio; los admite algún módulo que los declara
-- en su manifiesto. Una fila por derecho de :moduleCodes con su decisión; espacio, derechos y membresía
-- quedan bloqueados (FOR SHARE) en la misma consulta que decide, en orden de módulo.
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
  e.module_code,
  core.admission(
    :actionClass!,
    core.workspace_axis(w.status, w.suspension_reason),
    core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
                     md.stage, e.contract_kind, env.data_class, now())
  ) AS "decision!"
FROM core.workspaces AS w
JOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = ANY (:moduleCodes!::text[])
JOIN core.module_definitions AS md ON md.code = e.module_code
JOIN core.memberships AS m ON m.workspace_id = w.id
JOIN core.identities AS i ON i.id = m.identity_id
JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
CROSS JOIN platform.environment AS env
WHERE w.id = :workspaceId!
  AND m.status = 'active'
  AND i.provider = 'supabase'
  AND i.provider_subject = :subject!
ORDER BY e.module_code
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
FROM core.effective_role_assignments AS ra
JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code
WHERE ra.workspace_id = :workspaceId!
  AND ra.principal_id = :principalId!
  AND ra.revoked_at IS NULL
  AND ra.valid_from <= now()
  AND (ra.valid_until IS NULL OR ra.valid_until > now())
ORDER BY rp.permission_code;

/* @name listMemberRoles */
-- Nombres de los roles vigentes del miembro, solo para mostrarlos (ADR 0011, 05-10-2026): no
-- autorizan nada. Incluye el Administrador implícito del propietario.
SELECT DISTINCT r.name
FROM core.effective_role_assignments AS ra
JOIN core.roles AS r ON r.code = ra.role_code
WHERE ra.workspace_id = :workspaceId!
  AND ra.principal_id = :principalId!
  AND ra.revoked_at IS NULL
  AND ra.valid_from <= now()
  AND (ra.valid_until IS NULL OR ra.valid_until > now())
ORDER BY r.name;

/* @name listActiveMembers */
-- Miembros activos del espacio, por nombre: responsables de un equipo y encargados de un área (ADR 0019, 0024).
SELECT pr.id, ident.display_name AS name
FROM core.principals AS pr
JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
JOIN core.identities AS ident ON ident.id = m.identity_id
WHERE pr.workspace_id = :workspaceId! AND pr.kind = 'member' AND m.status = 'active'
ORDER BY inventory.fold_text(ident.display_name), pr.id;
