/** Types generated for queries found in "src/modules/core/infrastructure/access.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

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

const listMyWorkspacesIR: any = {"usedParamSet":{"identityId":true},"params":[{"name":"identityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":214,"b":225}]}],"statement":"SELECT\n  w.id,\n  w.code,\n  w.name,\n  w.status,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\"\nFROM core.memberships AS m\nJOIN core.workspaces AS w ON w.id = m.workspace_id\nWHERE m.identity_id = :identityId!\n  AND m.status = 'active'\n  AND cardinality(core.workspace_axis(w.status, w.suspension_reason)) > 0\nORDER BY w.name, w.id"};

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
 *   AND cardinality(core.workspace_axis(w.status, w.suspension_reason)) > 0
 * ORDER BY w.name, w.id
 * ```
 */
export const listMyWorkspaces = new PreparedQuery<IListMyWorkspacesParams,IListMyWorkspacesResult>(listMyWorkspacesIR);


/** 'AdmitWorkspace' parameters type */
export interface IAdmitWorkspaceParams {
  actionClass: string;
  subject: string;
  workspaceId: string;
}

/** 'AdmitWorkspace' return type */
export interface IAdmitWorkspaceResult {
  code: string;
  decision: string;
  display_name: string;
  identity_id: string;
  is_owner: boolean;
  membership_id: string;
  name: string;
  principal_id: string;
  status: string;
  time_zone: string;
  workspace_classes: stringArray;
  workspace_id: string;
}

/** 'AdmitWorkspace' query type */
export interface IAdmitWorkspaceQuery {
  params: IAdmitWorkspaceParams;
  result: IAdmitWorkspaceResult;
}

const admitWorkspaceIR: any = {"usedParamSet":{"actionClass":true,"workspaceId":true,"subject":true},"params":[{"name":"actionClass","required":true,"transform":{"type":"scalar"},"locs":[{"a":627,"b":639}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":961,"b":973}]},{"name":"subject","required":true,"transform":{"type":"scalar"},"locs":[{"a":1058,"b":1066}]}],"statement":"-- Rutas de Core: admisión con el eje espacio (Core no tiene derecho propio). Bloquea espacio y\n-- membresía con FOR SHARE en el orden fijo; una revocación o un cambio de estado esperan a que\n-- esta transacción termine y, si ya se confirmaron, la relectura excluye la fila o cambia la decisión.\nSELECT\n  w.id AS workspace_id,\n  w.code,\n  w.name,\n  w.status,\n  w.time_zone,\n  i.id AS identity_id,\n  i.display_name,\n  m.id AS membership_id,\n  p.id AS principal_id,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\",\n  core.workspace_axis(w.status, w.suspension_reason) AS \"workspace_classes!\",\n  core.admission(:actionClass!, core.workspace_axis(w.status, w.suspension_reason), core.action_classes()) AS \"decision!\"\nFROM core.workspaces AS w\nJOIN core.memberships AS m ON m.workspace_id = w.id\nJOIN core.identities AS i ON i.id = m.identity_id\nJOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id\nWHERE w.id = :workspaceId!\n  AND m.status = 'active'\n  AND i.provider = 'supabase'\n  AND i.provider_subject = :subject!\nFOR SHARE OF w, m"};

/**
 * Query generated from SQL:
 * ```
 * -- Rutas de Core: admisión con el eje espacio (Core no tiene derecho propio). Bloquea espacio y
 * -- membresía con FOR SHARE en el orden fijo; una revocación o un cambio de estado esperan a que
 * -- esta transacción termine y, si ya se confirmaron, la relectura excluye la fila o cambia la decisión.
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
 *   (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!",
 *   core.workspace_axis(w.status, w.suspension_reason) AS "workspace_classes!",
 *   core.admission(:actionClass!, core.workspace_axis(w.status, w.suspension_reason), core.action_classes()) AS "decision!"
 * FROM core.workspaces AS w
 * JOIN core.memberships AS m ON m.workspace_id = w.id
 * JOIN core.identities AS i ON i.id = m.identity_id
 * JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
 * WHERE w.id = :workspaceId!
 *   AND m.status = 'active'
 *   AND i.provider = 'supabase'
 *   AND i.provider_subject = :subject!
 * FOR SHARE OF w, m
 * ```
 */
export const admitWorkspace = new PreparedQuery<IAdmitWorkspaceParams,IAdmitWorkspaceResult>(admitWorkspaceIR);


/** 'AdmitModule' parameters type */
export interface IAdmitModuleParams {
  actionClass: string;
  moduleCode: string;
  subject: string;
  workspaceId: string;
}

/** 'AdmitModule' return type */
export interface IAdmitModuleResult {
  code: string;
  decision: string;
  display_name: string;
  identity_id: string;
  is_owner: boolean;
  membership_id: string;
  name: string;
  principal_id: string;
  status: string;
  time_zone: string;
  workspace_classes: stringArray;
  workspace_id: string;
}

/** 'AdmitModule' query type */
export interface IAdmitModuleQuery {
  params: IAdmitModuleParams;
  result: IAdmitModuleResult;
}

const admitModuleIR: any = {"usedParamSet":{"actionClass":true,"moduleCode":true,"workspaceId":true,"subject":true},"params":[{"name":"actionClass","required":true,"transform":{"type":"scalar"},"locs":[{"a":702,"b":714}]},{"name":"moduleCode","required":true,"transform":{"type":"scalar"},"locs":[{"a":1063,"b":1074}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1380,"b":1392}]},{"name":"subject","required":true,"transform":{"type":"scalar"},"locs":[{"a":1477,"b":1485}]}],"statement":"-- Operaciones de un módulo: lee espacio, derecho y membresía con FOR SHARE en la misma consulta\n-- que decide, en el orden fijo espacio → derecho → membresía (02 §6). Si un cambio de estado\n-- confirma mientras espera, PostgreSQL relee las filas y la decisión se recalcula con ellas.\n-- Sin derecho no devuelve filas: findMembershipClasses elige entonces el error.\nSELECT\n  w.id AS workspace_id,\n  w.code,\n  w.name,\n  w.status,\n  w.time_zone,\n  i.id AS identity_id,\n  i.display_name,\n  m.id AS membership_id,\n  p.id AS principal_id,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\",\n  core.workspace_axis(w.status, w.suspension_reason) AS \"workspace_classes!\",\n  core.admission(\n    :actionClass!,\n    core.workspace_axis(w.status, w.suspension_reason),\n    core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,\n                     md.stage, e.contract_kind, env.data_class, now())\n  ) AS \"decision!\"\nFROM core.workspaces AS w\nJOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = :moduleCode!\nJOIN core.module_definitions AS md ON md.code = e.module_code\nJOIN core.memberships AS m ON m.workspace_id = w.id\nJOIN core.identities AS i ON i.id = m.identity_id\nJOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id\nCROSS JOIN platform.environment AS env\nWHERE w.id = :workspaceId!\n  AND m.status = 'active'\n  AND i.provider = 'supabase'\n  AND i.provider_subject = :subject!\nFOR SHARE OF w, e, m"};

/**
 * Query generated from SQL:
 * ```
 * -- Operaciones de un módulo: lee espacio, derecho y membresía con FOR SHARE en la misma consulta
 * -- que decide, en el orden fijo espacio → derecho → membresía (02 §6). Si un cambio de estado
 * -- confirma mientras espera, PostgreSQL relee las filas y la decisión se recalcula con ellas.
 * -- Sin derecho no devuelve filas: findMembershipClasses elige entonces el error.
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
 *   (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS "is_owner!",
 *   core.workspace_axis(w.status, w.suspension_reason) AS "workspace_classes!",
 *   core.admission(
 *     :actionClass!,
 *     core.workspace_axis(w.status, w.suspension_reason),
 *     core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
 *                      md.stage, e.contract_kind, env.data_class, now())
 *   ) AS "decision!"
 * FROM core.workspaces AS w
 * JOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = :moduleCode!
 * JOIN core.module_definitions AS md ON md.code = e.module_code
 * JOIN core.memberships AS m ON m.workspace_id = w.id
 * JOIN core.identities AS i ON i.id = m.identity_id
 * JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
 * CROSS JOIN platform.environment AS env
 * WHERE w.id = :workspaceId!
 *   AND m.status = 'active'
 *   AND i.provider = 'supabase'
 *   AND i.provider_subject = :subject!
 * FOR SHARE OF w, e, m
 * ```
 */
export const admitModule = new PreparedQuery<IAdmitModuleParams,IAdmitModuleResult>(admitModuleIR);


/** 'FindMembershipClasses' parameters type */
export interface IFindMembershipClassesParams {
  subject: string;
  workspaceId: string;
}

/** 'FindMembershipClasses' return type */
export interface IFindMembershipClassesResult {
  workspace_classes: stringArray;
}

/** 'FindMembershipClasses' query type */
export interface IFindMembershipClassesQuery {
  params: IFindMembershipClassesParams;
  result: IFindMembershipClassesResult;
}

const findMembershipClassesIR: any = {"usedParamSet":{"workspaceId":true,"subject":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":314,"b":326}]},{"name":"subject","required":true,"transform":{"type":"scalar"},"locs":[{"a":411,"b":419}]}],"statement":"-- Sin bloqueo: solo distingue «sin acceso» de «módulo no disponible» tras una denegación.\nSELECT core.workspace_axis(w.status, w.suspension_reason) AS \"workspace_classes!\"\nFROM core.workspaces AS w\nJOIN core.memberships AS m ON m.workspace_id = w.id\nJOIN core.identities AS i ON i.id = m.identity_id\nWHERE w.id = :workspaceId!\n  AND m.status = 'active'\n  AND i.provider = 'supabase'\n  AND i.provider_subject = :subject!"};

/**
 * Query generated from SQL:
 * ```
 * -- Sin bloqueo: solo distingue «sin acceso» de «módulo no disponible» tras una denegación.
 * SELECT core.workspace_axis(w.status, w.suspension_reason) AS "workspace_classes!"
 * FROM core.workspaces AS w
 * JOIN core.memberships AS m ON m.workspace_id = w.id
 * JOIN core.identities AS i ON i.id = m.identity_id
 * WHERE w.id = :workspaceId!
 *   AND m.status = 'active'
 *   AND i.provider = 'supabase'
 *   AND i.provider_subject = :subject!
 * ```
 */
export const findMembershipClasses = new PreparedQuery<IFindMembershipClassesParams,IFindMembershipClassesResult>(findMembershipClassesIR);


/** 'ListModuleAccess' parameters type */
export interface IListModuleAccessParams {
  workspaceId: string;
}

/** 'ListModuleAccess' return type */
export interface IListModuleAccessResult {
  access: stringArray;
  code: string;
  name: string;
}

/** 'ListModuleAccess' query type */
export interface IListModuleAccessQuery {
  params: IListModuleAccessParams;
  result: IListModuleAccessResult;
}

const listModuleAccessIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":742,"b":754}]}],"statement":"-- Clases que la misma función de admisión concede hoy en cada módulo con derecho, para /me y /home.\nSELECT\n  md.code,\n  md.name,\n  array(\n    SELECT c\n    FROM unnest(core.action_classes()) WITH ORDINALITY AS a (c, n)\n    WHERE core.admission(\n      c,\n      core.workspace_axis(w.status, w.suspension_reason),\n      core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,\n                       md.stage, e.contract_kind, env.data_class, now())\n    ) = 'admitted'\n    ORDER BY n\n  ) AS \"access!\"\nFROM core.workspace_entitlements AS e\nJOIN core.workspaces AS w ON w.id = e.workspace_id\nJOIN core.module_definitions AS md ON md.code = e.module_code\nCROSS JOIN platform.environment AS env\nWHERE e.workspace_id = :workspaceId!\nORDER BY md.code"};

/**
 * Query generated from SQL:
 * ```
 * -- Clases que la misma función de admisión concede hoy en cada módulo con derecho, para /me y /home.
 * SELECT
 *   md.code,
 *   md.name,
 *   array(
 *     SELECT c
 *     FROM unnest(core.action_classes()) WITH ORDINALITY AS a (c, n)
 *     WHERE core.admission(
 *       c,
 *       core.workspace_axis(w.status, w.suspension_reason),
 *       core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
 *                        md.stage, e.contract_kind, env.data_class, now())
 *     ) = 'admitted'
 *     ORDER BY n
 *   ) AS "access!"
 * FROM core.workspace_entitlements AS e
 * JOIN core.workspaces AS w ON w.id = e.workspace_id
 * JOIN core.module_definitions AS md ON md.code = e.module_code
 * CROSS JOIN platform.environment AS env
 * WHERE e.workspace_id = :workspaceId!
 * ORDER BY md.code
 * ```
 */
export const listModuleAccess = new PreparedQuery<IListModuleAccessParams,IListModuleAccessResult>(listModuleAccessIR);


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


/** 'HasWorkspacePermission' parameters type */
export interface IHasWorkspacePermissionParams {
  permission: string;
  principalId: string;
  workspaceId: string;
}

/** 'HasWorkspacePermission' return type */
export interface IHasWorkspacePermissionResult {
  allowed: boolean;
}

/** 'HasWorkspacePermission' query type */
export interface IHasWorkspacePermissionQuery {
  params: IHasWorkspacePermissionParams;
  result: IHasWorkspacePermissionResult;
}

const hasWorkspacePermissionIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true,"permission":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":253,"b":265}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":293,"b":305}]},{"name":"permission","required":true,"transform":{"type":"scalar"},"locs":[{"a":336,"b":347}]}],"statement":"-- Permiso con ámbito de todo el espacio: lo exige lo que no pertenece a una ubicación (catálogo).\nSELECT EXISTS (\n  SELECT 1\n  FROM core.role_assignments AS ra\n  JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code\n  WHERE ra.workspace_id = :workspaceId!\n    AND ra.principal_id = :principalId!\n    AND rp.permission_code = :permission!\n    AND ra.location_id IS NULL\n    AND ra.revoked_at IS NULL\n    AND ra.valid_from <= now()\n    AND (ra.valid_until IS NULL OR ra.valid_until > now())\n) AS \"allowed!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Permiso con ámbito de todo el espacio: lo exige lo que no pertenece a una ubicación (catálogo).
 * SELECT EXISTS (
 *   SELECT 1
 *   FROM core.role_assignments AS ra
 *   JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code
 *   WHERE ra.workspace_id = :workspaceId!
 *     AND ra.principal_id = :principalId!
 *     AND rp.permission_code = :permission!
 *     AND ra.location_id IS NULL
 *     AND ra.revoked_at IS NULL
 *     AND ra.valid_from <= now()
 *     AND (ra.valid_until IS NULL OR ra.valid_until > now())
 * ) AS "allowed!"
 * ```
 */
export const hasWorkspacePermission = new PreparedQuery<IHasWorkspacePermissionParams,IHasWorkspacePermissionResult>(hasWorkspacePermissionIR);


/** 'ListPermissionScope' parameters type */
export interface IListPermissionScopeParams {
  permission: string;
  principalId: string;
  workspaceId: string;
}

/** 'ListPermissionScope' return type */
export interface IListPermissionScopeResult {
  id: string;
}

/** 'ListPermissionScope' query type */
export interface IListPermissionScopeQuery {
  params: IListPermissionScopeParams;
  result: IListPermissionScopeResult;
}

const listPermissionScopeIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true,"permission":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":376,"b":388},{"a":677,"b":689},{"a":938,"b":950}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":416,"b":428}]},{"name":"permission","required":true,"transform":{"type":"scalar"},"locs":[{"a":459,"b":470}]}],"statement":"-- Ubicaciones donde aplica el permiso: todas si el rol es de todo el espacio; si no, cada ámbito\n-- y su descendencia (03 §3). Las listas de los módulos se filtran con este conjunto.\nWITH RECURSIVE grants (location_id) AS (\n  SELECT ra.location_id\n  FROM core.role_assignments AS ra\n  JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code\n  WHERE ra.workspace_id = :workspaceId!\n    AND ra.principal_id = :principalId!\n    AND rp.permission_code = :permission!\n    AND ra.revoked_at IS NULL\n    AND ra.valid_from <= now()\n    AND (ra.valid_until IS NULL OR ra.valid_until > now())\n),\nscope (id) AS (\n  SELECT l.id\n  FROM core.locations AS l\n  WHERE l.workspace_id = :workspaceId!\n    AND (l.id IN (SELECT g.location_id FROM grants AS g)\n         OR EXISTS (SELECT 1 FROM grants AS g WHERE g.location_id IS NULL))\n  UNION\n  SELECT l.id\n  FROM core.locations AS l\n  JOIN scope AS s ON l.parent_id = s.id\n  WHERE l.workspace_id = :workspaceId!\n)\nSELECT id AS \"id!\" FROM scope"};

/**
 * Query generated from SQL:
 * ```
 * -- Ubicaciones donde aplica el permiso: todas si el rol es de todo el espacio; si no, cada ámbito
 * -- y su descendencia (03 §3). Las listas de los módulos se filtran con este conjunto.
 * WITH RECURSIVE grants (location_id) AS (
 *   SELECT ra.location_id
 *   FROM core.role_assignments AS ra
 *   JOIN core.role_permissions AS rp ON rp.role_code = ra.role_code
 *   WHERE ra.workspace_id = :workspaceId!
 *     AND ra.principal_id = :principalId!
 *     AND rp.permission_code = :permission!
 *     AND ra.revoked_at IS NULL
 *     AND ra.valid_from <= now()
 *     AND (ra.valid_until IS NULL OR ra.valid_until > now())
 * ),
 * scope (id) AS (
 *   SELECT l.id
 *   FROM core.locations AS l
 *   WHERE l.workspace_id = :workspaceId!
 *     AND (l.id IN (SELECT g.location_id FROM grants AS g)
 *          OR EXISTS (SELECT 1 FROM grants AS g WHERE g.location_id IS NULL))
 *   UNION
 *   SELECT l.id
 *   FROM core.locations AS l
 *   JOIN scope AS s ON l.parent_id = s.id
 *   WHERE l.workspace_id = :workspaceId!
 * )
 * SELECT id AS "id!" FROM scope
 * ```
 */
export const listPermissionScope = new PreparedQuery<IListPermissionScopeParams,IListPermissionScopeResult>(listPermissionScopeIR);


