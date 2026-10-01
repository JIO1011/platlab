/** Types generated for queries found in "src/modules/core/infrastructure/access.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'FindIdentity' parameters type */
export interface IFindIdentityParams {
  subject: string;
}

/** 'FindIdentity' return type */
export interface IFindIdentityResult {
  display_name: string;
  id: string;
}

/** 'FindIdentity' query type */
export interface IFindIdentityQuery {
  params: IFindIdentityParams;
  result: IFindIdentityResult;
}

const findIdentityIR: any = {"usedParamSet":{"subject":true},"params":[{"name":"subject","required":true,"transform":{"type":"scalar"},"locs":[{"a":96,"b":104}]}],"statement":"SELECT id, display_name\nFROM core.identities\nWHERE provider = 'supabase' AND provider_subject = :subject!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, display_name
 * FROM core.identities
 * WHERE provider = 'supabase' AND provider_subject = :subject!
 * ```
 */
export const findIdentity = new PreparedQuery<IFindIdentityParams,IFindIdentityResult>(findIdentityIR);


/** 'ListMyWorkspaces' parameters type */
export interface IListMyWorkspacesParams {
  identityId: string;
}

/** 'ListMyWorkspaces' return type */
export interface IListMyWorkspacesResult {
  code: string;
  id: string;
  is_owner: boolean;
  name: string;
  status: string;
}

/** 'ListMyWorkspaces' query type */
export interface IListMyWorkspacesQuery {
  params: IListMyWorkspacesParams;
  result: IListMyWorkspacesResult;
}

const listMyWorkspacesIR: any = {"usedParamSet":{"identityId":true},"params":[{"name":"identityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":214,"b":225}]}],"statement":"SELECT\n  w.id,\n  w.code,\n  w.name,\n  w.status,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\"\nFROM core.memberships AS m\nJOIN core.workspaces AS w ON w.id = m.workspace_id\nWHERE m.identity_id = :identityId!\n  AND m.status = 'active'\n  AND w.status IN ('trial', 'active', 'suspended', 'closing')\nORDER BY w.name, w.id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   w.id,
 *   w.code,
 *   w.name,
 *   w.status,
 *   (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!"
 * FROM core.memberships AS m
 * JOIN core.workspaces AS w ON w.id = m.workspace_id
 * WHERE m.identity_id = :identityId!
 *   AND m.status = 'active'
 *   AND w.status IN ('trial', 'active', 'suspended', 'closing')
 * ORDER BY w.name, w.id
 * ```
 */
export const listMyWorkspaces = new PreparedQuery<IListMyWorkspacesParams,IListMyWorkspacesResult>(listMyWorkspacesIR);


/** 'LockMembership' parameters type */
export interface ILockMembershipParams {
  subject: string;
  workspaceId: string;
}

/** 'LockMembership' return type */
export interface ILockMembershipResult {
  code: string;
  display_name: string;
  identity_id: string;
  is_owner: boolean;
  membership_id: string;
  name: string;
  principal_id: string;
  status: string;
  time_zone: string;
  workspace_id: string;
}

/** 'LockMembership' query type */
export interface ILockMembershipQuery {
  params: ILockMembershipParams;
  result: ILockMembershipResult;
}

const lockMembershipIR: any = {"usedParamSet":{"workspaceId":true,"subject":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":824,"b":836}]},{"name":"subject","required":true,"transform":{"type":"scalar"},"locs":[{"a":983,"b":991}]}],"statement":"-- Lee espacio y membresía con bloqueo compartido en la misma consulta que decide (02 §6),\n-- en el orden fijo espacio → membresía. Una revocación o un cambio de estado esperan a que esta\n-- transacción termine; si ya se confirmaron, la relectura de FOR SHARE excluye la fila.\n-- T-04 la sustituye por la admisión de dos ejes, que añade el derecho del módulo.\nSELECT\n  w.id AS workspace_id,\n  w.code,\n  w.name,\n  w.status,\n  w.time_zone,\n  i.id AS identity_id,\n  i.display_name,\n  m.id AS membership_id,\n  p.id AS principal_id,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\"\nFROM core.workspaces AS w\nJOIN core.memberships AS m ON m.workspace_id = w.id\nJOIN core.identities AS i ON i.id = m.identity_id\nJOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id\nWHERE w.id = :workspaceId!\n  AND w.status IN ('trial', 'active', 'suspended', 'closing')\n  AND m.status = 'active'\n  AND i.provider = 'supabase'\n  AND i.provider_subject = :subject!\nFOR SHARE OF w, m"};

/**
 * Query generated from SQL:
 * ```
 * -- Lee espacio y membresía con bloqueo compartido en la misma consulta que decide (02 §6),
 * -- en el orden fijo espacio → membresía. Una revocación o un cambio de estado esperan a que esta
 * -- transacción termine; si ya se confirmaron, la relectura de FOR SHARE excluye la fila.
 * -- T-04 la sustituye por la admisión de dos ejes, que añade el derecho del módulo.
 * SELECT
 *   w.id AS workspace_id,
 *   w.code,
 *   w.name,
 *   w.status,
 *   w.time_zone,
 *   i.id AS identity_id,
 *   i.display_name,
 *   m.id AS membership_id,
 *   p.id AS principal_id,
 *   (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!"
 * FROM core.workspaces AS w
 * JOIN core.memberships AS m ON m.workspace_id = w.id
 * JOIN core.identities AS i ON i.id = m.identity_id
 * JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
 * WHERE w.id = :workspaceId!
 *   AND w.status IN ('trial', 'active', 'suspended', 'closing')
 *   AND m.status = 'active'
 *   AND i.provider = 'supabase'
 *   AND i.provider_subject = :subject!
 * FOR SHARE OF w, m
 * ```
 */
export const lockMembership = new PreparedQuery<ILockMembershipParams,ILockMembershipResult>(lockMembershipIR);


/** 'ListPermissionCodes' parameters type */
export interface IListPermissionCodesParams {
  principalId: string;
  workspaceId: string;
}

/** 'ListPermissionCodes' return type */
export interface IListPermissionCodesResult {
  permission_code: string;
}

/** 'ListPermissionCodes' query type */
export interface IListPermissionCodesQuery {
  params: IListPermissionCodesParams;
  result: IListPermissionCodesResult;
}

const listPermissionCodesIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":156,"b":168}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":194,"b":206}]}],"statement":"SELECT DISTINCT rp.permission_code\nFROM core.role_assignments AS ra\nJOIN core.role_permissions AS rp ON rp.role_code = ra.role_code\nWHERE ra.workspace_id = :workspaceId!\n  AND ra.principal_id = :principalId!\n  AND ra.revoked_at IS NULL\n  AND ra.valid_from <= now()\n  AND (ra.valid_until IS NULL OR ra.valid_until > now())\nORDER BY rp.permission_code"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT rp.permission_code
 * FROM core.role_assignments AS ra
 * JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code
 * WHERE ra.workspace_id = :workspaceId!
 *   AND ra.principal_id = :principalId!
 *   AND ra.revoked_at IS NULL
 *   AND ra.valid_from <= now()
 *   AND (ra.valid_until IS NULL OR ra.valid_until > now())
 * ORDER BY rp.permission_code
 * ```
 */
export const listPermissionCodes = new PreparedQuery<IListPermissionCodesParams,IListPermissionCodesResult>(listPermissionCodesIR);


/** 'HasPermissionAt' parameters type */
export interface IHasPermissionAtParams {
  locationId: string;
  permission: string;
  principalId: string;
  workspaceId: string;
}

/** 'HasPermissionAt' return type */
export interface IHasPermissionAtResult {
  allowed: boolean;
}

/** 'HasPermissionAt' query type */
export interface IHasPermissionAtQuery {
  params: IHasPermissionAtParams;
  result: IHasPermissionAtResult;
}

const hasPermissionAtIR: any = {"usedParamSet":{"workspaceId":true,"locationId":true,"principalId":true,"permission":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":376,"b":388},{"a":545,"b":557},{"a":715,"b":727}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":401,"b":412}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":755,"b":767}]},{"name":"permission","required":true,"transform":{"type":"scalar"},"locs":[{"a":798,"b":809}]}],"statement":"-- Un rol aplica en la ubicación si su ámbito es todo el espacio o un ancestro de ella (03 §3).\n-- Una ubicación de otro espacio no tiene ancestros aquí: solo valdría un rol de todo el espacio,\n-- y la operación la rechaza después por no encontrarla.\nWITH RECURSIVE ancestors (id, parent_id) AS (\n  SELECT l.id, l.parent_id\n  FROM core.locations AS l\n  WHERE l.workspace_id = :workspaceId! AND l.id = :locationId!\n  UNION\n  SELECT l.id, l.parent_id\n  FROM core.locations AS l\n  JOIN ancestors AS a ON l.id = a.parent_id\n  WHERE l.workspace_id = :workspaceId!\n)\nSELECT EXISTS (\n  SELECT 1\n  FROM core.role_assignments AS ra\n  JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code\n  WHERE ra.workspace_id = :workspaceId!\n    AND ra.principal_id = :principalId!\n    AND rp.permission_code = :permission!\n    AND ra.revoked_at IS NULL\n    AND ra.valid_from <= now()\n    AND (ra.valid_until IS NULL OR ra.valid_until > now())\n    AND (ra.location_id IS NULL OR ra.location_id IN (SELECT id FROM ancestors))\n) AS \"allowed!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Un rol aplica en la ubicación si su ámbito es todo el espacio o un ancestro de ella (03 §3).
 * -- Una ubicación de otro espacio no tiene ancestros aquí: solo valdría un rol de todo el espacio,
 * -- y la operación la rechaza después por no encontrarla.
 * WITH RECURSIVE ancestors (id, parent_id) AS (
 *   SELECT l.id, l.parent_id
 *   FROM core.locations AS l
 *   WHERE l.workspace_id = :workspaceId! AND l.id = :locationId!
 *   UNION
 *   SELECT l.id, l.parent_id
 *   FROM core.locations AS l
 *   JOIN ancestors AS a ON l.id = a.parent_id
 *   WHERE l.workspace_id = :workspaceId!
 * )
 * SELECT EXISTS (
 *   SELECT 1
 *   FROM core.role_assignments AS ra
 *   JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code
 *   WHERE ra.workspace_id = :workspaceId!
 *     AND ra.principal_id = :principalId!
 *     AND rp.permission_code = :permission!
 *     AND ra.revoked_at IS NULL
 *     AND ra.valid_from <= now()
 *     AND (ra.valid_until IS NULL OR ra.valid_until > now())
 *     AND (ra.location_id IS NULL OR ra.location_id IN (SELECT id FROM ancestors))
 * ) AS "allowed!"
 * ```
 */
export const hasPermissionAt = new PreparedQuery<IHasPermissionAtParams,IHasPermissionAtResult>(hasPermissionAtIR);


