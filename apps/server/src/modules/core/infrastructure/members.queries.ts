/** Types generated for queries found in "src/modules/core/infrastructure/members.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

/** 'ListMembers' parameters type */
export interface IListMembersParams {
  inactiveDays: number;
  roles: stringArray;
  workspaceId: string;
}

/** 'ListMembers' return type */
export interface IListMembersResult {
  email: string | null;
  inactive: boolean;
  is_owner: boolean;
  joined_at: Date;
  last_seen_at: Date | null;
  membership_id: string;
  name: string;
  principal_id: string;
  revoked_at: Date | null;
  role: string | null;
  status: string;
}

/** 'ListMembers' query type */
export interface IListMembersQuery {
  params: IListMembersParams;
  result: IListMembersResult;
}

const listMembersIR: any = {"usedParamSet":{"inactiveDays":true,"roles":true,"workspaceId":true},"params":[{"name":"inactiveDays","required":true,"transform":{"type":"scalar"},"locs":[{"a":541,"b":554}]},{"name":"roles","required":true,"transform":{"type":"scalar"},"locs":[{"a":1206,"b":1212},{"a":1249,"b":1255}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1331,"b":1343}]}],"statement":"-- Miembros del espacio, también los quitados. Inactivo: activo sin entrar en :inactiveDays días; quien nunca entró\n-- cuenta desde que se unió.\nSELECT\n  m.id AS membership_id,\n  pr.id AS principal_id,\n  ident.display_name AS name,\n  ident.email,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\",\n  role.code AS \"role?\",\n  m.status,\n  m.created_at AS joined_at,\n  m.revoked_at,\n  pres.last_seen_at AS \"last_seen_at?\",\n  (m.status = 'active'\n    AND coalesce(pres.last_seen_at, m.created_at) < now() - make_interval(days => :inactiveDays!::int)) AS \"inactive!\"\nFROM core.memberships AS m\nJOIN core.workspaces AS w ON w.id = m.workspace_id\nJOIN core.identities AS ident ON ident.id = m.identity_id\nJOIN core.principals AS pr ON pr.workspace_id = m.workspace_id AND pr.membership_id = m.id\nLEFT JOIN core.member_presence AS pres ON pres.workspace_id = m.workspace_id AND pres.membership_id = m.id\nLEFT JOIN LATERAL (\n  SELECT ra.role_code AS code\n  FROM core.role_assignments AS ra\n  WHERE ra.workspace_id = m.workspace_id AND ra.principal_id = pr.id\n    AND ra.revoked_at IS NULL AND ra.valid_from <= now() AND (ra.valid_until IS NULL OR ra.valid_until > now())\n    AND ra.role_code = ANY (:roles!::text[])\n  ORDER BY array_position(:roles!::text[], ra.role_code)\n  LIMIT 1\n) AS role ON true\nWHERE m.workspace_id = :workspaceId!\nORDER BY m.status, inventory.fold_text(ident.display_name), m.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Miembros del espacio, también los quitados. Inactivo: activo sin entrar en :inactiveDays días; quien nunca entró
 * -- cuenta desde que se unió.
 * SELECT
 *   m.id AS membership_id,
 *   pr.id AS principal_id,
 *   ident.display_name AS name,
 *   ident.email,
 *   (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!",
 *   role.code AS "role?",
 *   m.status,
 *   m.created_at AS joined_at,
 *   m.revoked_at,
 *   pres.last_seen_at AS "last_seen_at?",
 *   (m.status = 'active'
 *     AND coalesce(pres.last_seen_at, m.created_at) < now() - make_interval(days => :inactiveDays!::int)) AS "inactive!"
 * FROM core.memberships AS m
 * JOIN core.workspaces AS w ON w.id = m.workspace_id
 * JOIN core.identities AS ident ON ident.id = m.identity_id
 * JOIN core.principals AS pr ON pr.workspace_id = m.workspace_id AND pr.membership_id = m.id
 * LEFT JOIN core.member_presence AS pres ON pres.workspace_id = m.workspace_id AND pres.membership_id = m.id
 * LEFT JOIN LATERAL (
 *   SELECT ra.role_code AS code
 *   FROM core.role_assignments AS ra
 *   WHERE ra.workspace_id = m.workspace_id AND ra.principal_id = pr.id
 *     AND ra.revoked_at IS NULL AND ra.valid_from <= now() AND (ra.valid_until IS NULL OR ra.valid_until > now())
 *     AND ra.role_code = ANY (:roles!::text[])
 *   ORDER BY array_position(:roles!::text[], ra.role_code)
 *   LIMIT 1
 * ) AS role ON true
 * WHERE m.workspace_id = :workspaceId!
 * ORDER BY m.status, inventory.fold_text(ident.display_name), m.id
 * ```
 */
export const listMembers = new PreparedQuery<IListMembersParams,IListMembersResult>(listMembersIR);


/** 'ListPendingInvitations' parameters type */
export interface IListPendingInvitationsParams {
  workspaceId: string;
}

/** 'ListPendingInvitations' return type */
export interface IListPendingInvitationsResult {
  email: string;
  id: string;
  invited_at: Date;
  name: string;
  role_code: string;
}

/** 'ListPendingInvitations' query type */
export interface IListPendingInvitationsQuery {
  params: IListPendingInvitationsParams;
  result: IListPendingInvitationsResult;
}

const listPendingInvitationsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":134}]}],"statement":"SELECT i.id, i.display_name AS name, i.email, i.role_code, i.invited_at\nFROM core.invitations AS i\nWHERE i.workspace_id = :workspaceId! AND i.status = 'pending'\nORDER BY i.invited_at DESC, i.id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT i.id, i.display_name AS name, i.email, i.role_code, i.invited_at
 * FROM core.invitations AS i
 * WHERE i.workspace_id = :workspaceId! AND i.status = 'pending'
 * ORDER BY i.invited_at DESC, i.id
 * ```
 */
export const listPendingInvitations = new PreparedQuery<IListPendingInvitationsParams,IListPendingInvitationsResult>(listPendingInvitationsIR);


/** 'FindEmailUse' parameters type */
export interface IFindEmailUseParams {
  email: string;
  workspaceId: string;
}

/** 'FindEmailUse' return type */
export interface IFindEmailUseResult {
  member: boolean;
  pending: boolean;
}

/** 'FindEmailUse' query type */
export interface IFindEmailUseQuery {
  params: IFindEmailUseParams;
  result: IFindEmailUseResult;
}

const findEmailUseIR: any = {"usedParamSet":{"workspaceId":true,"email":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":264,"b":276},{"a":424,"b":436}]},{"name":"email","required":true,"transform":{"type":"scalar"},"locs":[{"a":320,"b":326},{"a":477,"b":483}]}],"statement":"-- ¿El correo ya es de un miembro activo o ya está pendiente? Lo pendiente repetido también lo impide el índice.\nSELECT\n  EXISTS (\n    SELECT 1\n    FROM core.memberships AS m\n    JOIN core.identities AS ident ON ident.id = m.identity_id\n    WHERE m.workspace_id = :workspaceId! AND m.status = 'active' AND ident.email = :email!\n  ) AS \"member!\",\n  EXISTS (\n    SELECT 1 FROM core.invitations AS i\n    WHERE i.workspace_id = :workspaceId! AND i.status = 'pending' AND i.email = :email!\n  ) AS \"pending!\""};

/**
 * Query generated from SQL:
 * ```
 * -- ¿El correo ya es de un miembro activo o ya está pendiente? Lo pendiente repetido también lo impide el índice.
 * SELECT
 *   EXISTS (
 *     SELECT 1
 *     FROM core.memberships AS m
 *     JOIN core.identities AS ident ON ident.id = m.identity_id
 *     WHERE m.workspace_id = :workspaceId! AND m.status = 'active' AND ident.email = :email!
 *   ) AS "member!",
 *   EXISTS (
 *     SELECT 1 FROM core.invitations AS i
 *     WHERE i.workspace_id = :workspaceId! AND i.status = 'pending' AND i.email = :email!
 *   ) AS "pending!"
 * ```
 */
export const findEmailUse = new PreparedQuery<IFindEmailUseParams,IFindEmailUseResult>(findEmailUseIR);


/** 'InsertInvitation' parameters type */
export interface IInsertInvitationParams {
  email: string;
  name: string;
  principalId: string;
  role: string;
  workspaceId: string;
}

/** 'InsertInvitation' return type */
export interface IInsertInvitationResult {
  id: string;
  invited_at: Date;
}

/** 'InsertInvitation' query type */
export interface IInsertInvitationQuery {
  params: IInsertInvitationParams;
  result: IInsertInvitationResult;
}

const insertInvitationIR: any = {"usedParamSet":{"workspaceId":true,"email":true,"name":true,"role":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":109,"b":121}]},{"name":"email","required":true,"transform":{"type":"scalar"},"locs":[{"a":124,"b":130}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":138}]},{"name":"role","required":true,"transform":{"type":"scalar"},"locs":[{"a":141,"b":146}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":149,"b":161}]}],"statement":"INSERT INTO core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)\nVALUES (:workspaceId!, :email!, :name!, :role!, :principalId!)\nRETURNING id, invited_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)
 * VALUES (:workspaceId!, :email!, :name!, :role!, :principalId!)
 * RETURNING id, invited_at
 * ```
 */
export const insertInvitation = new PreparedQuery<IInsertInvitationParams,IInsertInvitationResult>(insertInvitationIR);


/** 'RevokeInvitation' parameters type */
export interface IRevokeInvitationParams {
  invitationId: string;
  principalId: string;
  workspaceId: string;
}

/** 'RevokeInvitation' return type */
export interface IRevokeInvitationResult {
  email: string;
  id: string;
}

/** 'RevokeInvitation' query type */
export interface IRevokeInvitationQuery {
  params: IRevokeInvitationParams;
  result: IRevokeInvitationResult;
}

const revokeInvitationIR: any = {"usedParamSet":{"principalId":true,"workspaceId":true,"invitationId":true},"params":[{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":94,"b":106}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":129,"b":141}]},{"name":"invitationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":152,"b":165}]}],"statement":"UPDATE core.invitations\nSET status = 'revoked', revoked_at = now(), revoked_by_principal_id = :principalId!\nWHERE workspace_id = :workspaceId! AND id = :invitationId! AND status = 'pending'\nRETURNING id, email"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE core.invitations
 * SET status = 'revoked', revoked_at = now(), revoked_by_principal_id = :principalId!
 * WHERE workspace_id = :workspaceId! AND id = :invitationId! AND status = 'pending'
 * RETURNING id, email
 * ```
 */
export const revokeInvitation = new PreparedQuery<IRevokeInvitationParams,IRevokeInvitationResult>(revokeInvitationIR);


/** 'LockMember' parameters type */
export interface ILockMemberParams {
  membershipId: string;
  workspaceId: string;
}

/** 'LockMember' return type */
export interface ILockMemberResult {
  id: string;
  is_owner: boolean;
  principal_id: string;
  status: string;
}

/** 'LockMember' query type */
export interface ILockMemberQuery {
  params: ILockMemberParams;
  result: ILockMemberResult;
}

const lockMemberIR: any = {"usedParamSet":{"workspaceId":true,"membershipId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":336,"b":348}]},{"name":"membershipId","required":true,"transform":{"type":"scalar"},"locs":[{"a":361,"b":374}]}],"statement":"-- Cambiar el rol o quitar: incrementa la versión de la membresía para esperar a las operaciones en curso del\n-- miembro, que la leyeron con FOR SHARE, y para que las siguientes relean sus permisos (02 §6).\nUPDATE core.memberships AS m\nSET version = m.version + 1\nFROM core.workspaces AS w, core.principals AS pr\nWHERE m.workspace_id = :workspaceId! AND m.id = :membershipId!\n  AND w.id = m.workspace_id\n  AND pr.workspace_id = m.workspace_id AND pr.membership_id = m.id\nRETURNING m.id, m.status, pr.id AS principal_id, (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Cambiar el rol o quitar: incrementa la versión de la membresía para esperar a las operaciones en curso del
 * -- miembro, que la leyeron con FOR SHARE, y para que las siguientes relean sus permisos (02 §6).
 * UPDATE core.memberships AS m
 * SET version = m.version + 1
 * FROM core.workspaces AS w, core.principals AS pr
 * WHERE m.workspace_id = :workspaceId! AND m.id = :membershipId!
 *   AND w.id = m.workspace_id
 *   AND pr.workspace_id = m.workspace_id AND pr.membership_id = m.id
 * RETURNING m.id, m.status, pr.id AS principal_id, (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!"
 * ```
 */
export const lockMember = new PreparedQuery<ILockMemberParams,ILockMemberResult>(lockMemberIR);


/** 'CurrentRole' parameters type */
export interface ICurrentRoleParams {
  principalId: string;
  roles: stringArray;
  workspaceId: string;
}

/** 'CurrentRole' return type */
export interface ICurrentRoleResult {
  role_code: string;
}

/** 'CurrentRole' query type */
export interface ICurrentRoleQuery {
  params: ICurrentRoleParams;
  result: ICurrentRoleResult;
}

const currentRoleIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true,"roles":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":77,"b":89}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":113,"b":125}]},{"name":"roles","required":true,"transform":{"type":"scalar"},"locs":[{"a":263,"b":269},{"a":304,"b":310}]}],"statement":"SELECT ra.role_code\nFROM core.role_assignments AS ra\nWHERE ra.workspace_id = :workspaceId! AND ra.principal_id = :principalId!\n  AND ra.revoked_at IS NULL AND ra.valid_from <= now() AND (ra.valid_until IS NULL OR ra.valid_until > now())\n  AND ra.role_code = ANY (:roles!::text[])\nORDER BY array_position(:roles!::text[], ra.role_code)\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * SELECT ra.role_code
 * FROM core.role_assignments AS ra
 * WHERE ra.workspace_id = :workspaceId! AND ra.principal_id = :principalId!
 *   AND ra.revoked_at IS NULL AND ra.valid_from <= now() AND (ra.valid_until IS NULL OR ra.valid_until > now())
 *   AND ra.role_code = ANY (:roles!::text[])
 * ORDER BY array_position(:roles!::text[], ra.role_code)
 * LIMIT 1
 * ```
 */
export const currentRole = new PreparedQuery<ICurrentRoleParams,ICurrentRoleResult>(currentRoleIR);


/** 'RevokeRoles' parameters type */
export interface IRevokeRolesParams {
  principalId: string;
  roles?: stringArray | null | void;
  workspaceId: string;
}

/** 'RevokeRoles' return type */
export interface IRevokeRolesResult {
  role_code: string;
}

/** 'RevokeRoles' query type */
export interface IRevokeRolesQuery {
  params: IRevokeRolesParams;
  result: IRevokeRolesResult;
}

const revokeRolesIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true,"roles":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":163,"b":175}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":196,"b":208}]},{"name":"roles","required":false,"transform":{"type":"scalar"},"locs":[{"a":240,"b":245},{"a":283,"b":288}]}],"statement":"-- Sin :roles, todas las abiertas (al quitar); con :roles, solo esas (al cambiar el rol).\nUPDATE core.role_assignments\nSET revoked_at = now()\nWHERE workspace_id = :workspaceId! AND principal_id = :principalId! AND revoked_at IS NULL\n  AND (:roles::text[] IS NULL OR role_code = ANY (:roles::text[]))\nRETURNING role_code"};

/**
 * Query generated from SQL:
 * ```
 * -- Sin :roles, todas las abiertas (al quitar); con :roles, solo esas (al cambiar el rol).
 * UPDATE core.role_assignments
 * SET revoked_at = now()
 * WHERE workspace_id = :workspaceId! AND principal_id = :principalId! AND revoked_at IS NULL
 *   AND (:roles::text[] IS NULL OR role_code = ANY (:roles::text[]))
 * RETURNING role_code
 * ```
 */
export const revokeRoles = new PreparedQuery<IRevokeRolesParams,IRevokeRolesResult>(revokeRolesIR);


/** 'GrantRole' parameters type */
export interface IGrantRoleParams {
  principalId: string;
  role: string;
  workspaceId: string;
}

/** 'GrantRole' return type */
export type IGrantRoleResult = void;

/** 'GrantRole' query type */
export interface IGrantRoleQuery {
  params: IGrantRoleParams;
  result: IGrantRoleResult;
}

const grantRoleIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true,"role":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":94}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":97,"b":109}]},{"name":"role","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":117}]}],"statement":"INSERT INTO core.role_assignments (workspace_id, principal_id, role_code)\nVALUES (:workspaceId!, :principalId!, :role!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO core.role_assignments (workspace_id, principal_id, role_code)
 * VALUES (:workspaceId!, :principalId!, :role!)
 * ```
 */
export const grantRole = new PreparedQuery<IGrantRoleParams,IGrantRoleResult>(grantRoleIR);


/** 'RevokeMembership' parameters type */
export interface IRevokeMembershipParams {
  membershipId: string;
  workspaceId: string;
}

/** 'RevokeMembership' return type */
export type IRevokeMembershipResult = void;

/** 'RevokeMembership' query type */
export interface IRevokeMembershipQuery {
  params: IRevokeMembershipParams;
  result: IRevokeMembershipResult;
}

const revokeMembershipIR: any = {"usedParamSet":{"workspaceId":true,"membershipId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":88,"b":100}]},{"name":"membershipId","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":124}]}],"statement":"UPDATE core.memberships\nSET status = 'revoked', revoked_at = now()\nWHERE workspace_id = :workspaceId! AND id = :membershipId! AND status = 'active'"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE core.memberships
 * SET status = 'revoked', revoked_at = now()
 * WHERE workspace_id = :workspaceId! AND id = :membershipId! AND status = 'active'
 * ```
 */
export const revokeMembership = new PreparedQuery<IRevokeMembershipParams,IRevokeMembershipResult>(revokeMembershipIR);


/** 'TouchPresence' parameters type */
export interface ITouchPresenceParams {
  membershipId: string;
  workspaceId: string;
}

/** 'TouchPresence' return type */
export type ITouchPresenceResult = void;

/** 'TouchPresence' query type */
export interface ITouchPresenceQuery {
  params: ITouchPresenceParams;
  result: ITouchPresenceResult;
}

const touchPresenceIR: any = {"usedParamSet":{"workspaceId":true,"membershipId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":180}]},{"name":"membershipId","required":true,"transform":{"type":"scalar"},"locs":[{"a":183,"b":196}]}],"statement":"-- Último acceso al abrir el espacio, como máximo una escritura por hora (02 §12).\nINSERT INTO core.member_presence (workspace_id, membership_id, last_seen_at)\nVALUES (:workspaceId!, :membershipId!, now())\nON CONFLICT (workspace_id, membership_id) DO UPDATE SET last_seen_at = excluded.last_seen_at\nWHERE core.member_presence.last_seen_at < now() - interval '1 hour'"};

/**
 * Query generated from SQL:
 * ```
 * -- Último acceso al abrir el espacio, como máximo una escritura por hora (02 §12).
 * INSERT INTO core.member_presence (workspace_id, membership_id, last_seen_at)
 * VALUES (:workspaceId!, :membershipId!, now())
 * ON CONFLICT (workspace_id, membership_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
 * WHERE core.member_presence.last_seen_at < now() - interval '1 hour'
 * ```
 */
export const touchPresence = new PreparedQuery<ITouchPresenceParams,ITouchPresenceResult>(touchPresenceIR);


/** 'ListMyInvitations' parameters type */
export interface IListMyInvitationsParams {
  email: string;
}

/** 'ListMyInvitations' return type */
export interface IListMyInvitationsResult {
  id: string;
  /** Nombre de la institución que ven los miembros (no el jurídico). Opcional; lo fija el Equipo PlatLab. */
  institution_name: string | null;
  role_code: string;
  workspace_id: string;
  workspace_name: string;
}

/** 'ListMyInvitations' query type */
export interface IListMyInvitationsQuery {
  params: IListMyInvitationsParams;
  result: IListMyInvitationsResult;
}

const listMyInvitationsIR: any = {"usedParamSet":{"email":true},"params":[{"name":"email","required":true,"transform":{"type":"scalar"},"locs":[{"a":289,"b":295}]}],"statement":"-- Invitaciones pendientes para el correo del JWT, en espacios que todavía se ven.\nSELECT i.id, i.workspace_id, w.name AS workspace_name, w.institution_name, i.role_code\nFROM core.invitations AS i\nJOIN core.workspaces AS w ON w.id = i.workspace_id\nWHERE i.status = 'pending' AND i.email = :email!\n  AND cardinality(core.workspace_axis(w.status, w.suspension_reason)) > 0\nORDER BY w.name, i.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Invitaciones pendientes para el correo del JWT, en espacios que todavía se ven.
 * SELECT i.id, i.workspace_id, w.name AS workspace_name, w.institution_name, i.role_code
 * FROM core.invitations AS i
 * JOIN core.workspaces AS w ON w.id = i.workspace_id
 * WHERE i.status = 'pending' AND i.email = :email!
 *   AND cardinality(core.workspace_axis(w.status, w.suspension_reason)) > 0
 * ORDER BY w.name, i.id
 * ```
 */
export const listMyInvitations = new PreparedQuery<IListMyInvitationsParams,IListMyInvitationsResult>(listMyInvitationsIR);


/** 'AdmitJoin' parameters type */
export interface IAdmitJoinParams {
  workspaceId: string;
}

/** 'AdmitJoin' return type */
export interface IAdmitJoinResult {
  decision: string;
}

/** 'AdmitJoin' query type */
export interface IAdmitJoinQuery {
  params: IAdmitJoinParams;
  result: IAdmitJoinResult;
}

const admitJoinIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":272,"b":284}]}],"statement":"-- Unirse es una operación nueva del espacio: lo bloquea con FOR SHARE antes que todo lo demás (02 §6).\nSELECT core.admission('new_operation', core.workspace_axis(w.status, w.suspension_reason), core.action_classes()) AS \"decision!\"\nFROM core.workspaces AS w\nWHERE w.id = :workspaceId!\nFOR SHARE"};

/**
 * Query generated from SQL:
 * ```
 * -- Unirse es una operación nueva del espacio: lo bloquea con FOR SHARE antes que todo lo demás (02 §6).
 * SELECT core.admission('new_operation', core.workspace_axis(w.status, w.suspension_reason), core.action_classes()) AS "decision!"
 * FROM core.workspaces AS w
 * WHERE w.id = :workspaceId!
 * FOR SHARE
 * ```
 */
export const admitJoin = new PreparedQuery<IAdmitJoinParams,IAdmitJoinResult>(admitJoinIR);


/** 'FindInvitation' parameters type */
export interface IFindInvitationParams {
  email: string;
  invitationId: string;
  workspaceId: string;
}

/** 'FindInvitation' return type */
export interface IFindInvitationResult {
  display_name: string;
  id: string;
  membership_id: string | null;
  role_code: string;
  status: string;
}

/** 'FindInvitation' query type */
export interface IFindInvitationQuery {
  params: IFindInvitationParams;
  result: IFindInvitationResult;
}

const findInvitationIR: any = {"usedParamSet":{"workspaceId":true,"invitationId":true,"email":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":130}]},{"name":"invitationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":156}]},{"name":"email","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":178}]}],"statement":"SELECT i.id, i.display_name, i.role_code, i.status, i.membership_id\nFROM core.invitations AS i\nWHERE i.workspace_id = :workspaceId! AND i.id = :invitationId! AND i.email = :email!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT i.id, i.display_name, i.role_code, i.status, i.membership_id
 * FROM core.invitations AS i
 * WHERE i.workspace_id = :workspaceId! AND i.id = :invitationId! AND i.email = :email!
 * ```
 */
export const findInvitation = new PreparedQuery<IFindInvitationParams,IFindInvitationResult>(findInvitationIR);


/** 'UpsertIdentity' parameters type */
export interface IUpsertIdentityParams {
  displayName: string;
  email: string;
  subject: string;
}

/** 'UpsertIdentity' return type */
export interface IUpsertIdentityResult {
  id: string;
}

/** 'UpsertIdentity' query type */
export interface IUpsertIdentityQuery {
  params: IUpsertIdentityParams;
  result: IUpsertIdentityResult;
}

const upsertIdentityIR: any = {"usedParamSet":{"subject":true,"displayName":true,"email":true},"params":[{"name":"subject","required":true,"transform":{"type":"scalar"},"locs":[{"a":201,"b":209}]},{"name":"displayName","required":true,"transform":{"type":"scalar"},"locs":[{"a":212,"b":224}]},{"name":"email","required":true,"transform":{"type":"scalar"},"locs":[{"a":227,"b":233}]}],"statement":"-- La propia identidad: la crea con el nombre de la invitación o, si ya existe, solo guarda su correo.\nINSERT INTO core.identities (provider, provider_subject, display_name, email)\nVALUES ('supabase', :subject!, :displayName!, :email!)\nON CONFLICT (provider, provider_subject) DO UPDATE SET email = excluded.email\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- La propia identidad: la crea con el nombre de la invitación o, si ya existe, solo guarda su correo.
 * INSERT INTO core.identities (provider, provider_subject, display_name, email)
 * VALUES ('supabase', :subject!, :displayName!, :email!)
 * ON CONFLICT (provider, provider_subject) DO UPDATE SET email = excluded.email
 * RETURNING id
 * ```
 */
export const upsertIdentity = new PreparedQuery<IUpsertIdentityParams,IUpsertIdentityResult>(upsertIdentityIR);


/** 'JoinMembership' parameters type */
export interface IJoinMembershipParams {
  identityId: string;
  workspaceId: string;
}

/** 'JoinMembership' return type */
export interface IJoinMembershipResult {
  id: string;
}

/** 'JoinMembership' query type */
export interface IJoinMembershipQuery {
  params: IJoinMembershipParams;
  result: IJoinMembershipResult;
}

const joinMembershipIR: any = {"usedParamSet":{"workspaceId":true,"identityId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":176,"b":188}]},{"name":"identityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":191,"b":202}]}],"statement":"-- La membresía propia: nueva, o la misma de antes reactivada; incrementa su versión como un cambio de estado.\nINSERT INTO core.memberships (workspace_id, identity_id)\nVALUES (:workspaceId!, :identityId!)\nON CONFLICT (workspace_id, identity_id)\n  DO UPDATE SET status = 'active', revoked_at = NULL, version = core.memberships.version + 1\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- La membresía propia: nueva, o la misma de antes reactivada; incrementa su versión como un cambio de estado.
 * INSERT INTO core.memberships (workspace_id, identity_id)
 * VALUES (:workspaceId!, :identityId!)
 * ON CONFLICT (workspace_id, identity_id)
 *   DO UPDATE SET status = 'active', revoked_at = NULL, version = core.memberships.version + 1
 * RETURNING id
 * ```
 */
export const joinMembership = new PreparedQuery<IJoinMembershipParams,IJoinMembershipResult>(joinMembershipIR);


/** 'EnsurePrincipal' parameters type */
export interface IEnsurePrincipalParams {
  membershipId: string;
  workspaceId: string;
}

/** 'EnsurePrincipal' return type */
export interface IEnsurePrincipalResult {
  id: string;
}

/** 'EnsurePrincipal' query type */
export interface IEnsurePrincipalQuery {
  params: IEnsurePrincipalParams;
  result: IEnsurePrincipalResult;
}

const ensurePrincipalIR: any = {"usedParamSet":{"workspaceId":true,"membershipId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":94,"b":106},{"a":313,"b":325}]},{"name":"membershipId","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":132},{"a":350,"b":363}]}],"statement":"WITH created AS (\n  INSERT INTO core.principals (workspace_id, kind, membership_id)\n  VALUES (:workspaceId!, 'member', :membershipId!)\n  ON CONFLICT (workspace_id, membership_id) DO NOTHING\n  RETURNING id\n)\nSELECT id AS \"id!\" FROM created\nUNION ALL\nSELECT pr.id FROM core.principals AS pr WHERE pr.workspace_id = :workspaceId! AND pr.membership_id = :membershipId!\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * WITH created AS (
 *   INSERT INTO core.principals (workspace_id, kind, membership_id)
 *   VALUES (:workspaceId!, 'member', :membershipId!)
 *   ON CONFLICT (workspace_id, membership_id) DO NOTHING
 *   RETURNING id
 * )
 * SELECT id AS "id!" FROM created
 * UNION ALL
 * SELECT pr.id FROM core.principals AS pr WHERE pr.workspace_id = :workspaceId! AND pr.membership_id = :membershipId!
 * LIMIT 1
 * ```
 */
export const ensurePrincipal = new PreparedQuery<IEnsurePrincipalParams,IEnsurePrincipalResult>(ensurePrincipalIR);


/** 'AcceptInvitation' parameters type */
export interface IAcceptInvitationParams {
  invitationId: string;
  membershipId: string;
  workspaceId: string;
}

/** 'AcceptInvitation' return type */
export interface IAcceptInvitationResult {
  id: string;
}

/** 'AcceptInvitation' query type */
export interface IAcceptInvitationQuery {
  params: IAcceptInvitationParams;
  result: IAcceptInvitationResult;
}

const acceptInvitationIR: any = {"usedParamSet":{"membershipId":true,"workspaceId":true,"invitationId":true},"params":[{"name":"membershipId","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":78}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":134}]},{"name":"invitationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":145,"b":158}]}],"statement":"UPDATE core.invitations\nSET status = 'accepted', membership_id = :membershipId!, accepted_at = now()\nWHERE workspace_id = :workspaceId! AND id = :invitationId! AND status = 'pending'\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE core.invitations
 * SET status = 'accepted', membership_id = :membershipId!, accepted_at = now()
 * WHERE workspace_id = :workspaceId! AND id = :invitationId! AND status = 'pending'
 * RETURNING id
 * ```
 */
export const acceptInvitation = new PreparedQuery<IAcceptInvitationParams,IAcceptInvitationResult>(acceptInvitationIR);


