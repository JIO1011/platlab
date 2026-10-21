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
  /** Nombre de la institución que ven los miembros (no el jurídico). Opcional; lo fija el Equipo PlatLab. */
  institution_name: string | null;
  is_owner: boolean;
  name: string;
  status: string;
}

/** 'ListMyWorkspaces' query type */
export interface IListMyWorkspacesQuery {
  params: IListMyWorkspacesParams;
  result: IListMyWorkspacesResult;
}

const listMyWorkspacesIR: any = {"usedParamSet":{"identityId":true},"params":[{"name":"identityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":236,"b":247}]}],"statement":"SELECT\n  w.id,\n  w.code,\n  w.name,\n  w.status,\n  w.institution_name,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\"\nFROM core.memberships AS m\nJOIN core.workspaces AS w ON w.id = m.workspace_id\nWHERE m.identity_id = :identityId!\n  AND m.status = 'active'\n  AND cardinality(core.workspace_axis(w.status, w.suspension_reason)) > 0\nORDER BY w.name, w.id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   w.id,
 *   w.code,
 *   w.name,
 *   w.status,
 *   w.institution_name,
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
  alsoModule?: string | null | void;
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

const admitModuleIR: any = {"usedParamSet":{"moduleCode":true,"alsoModule":true,"actionClass":true,"workspaceId":true,"subject":true},"params":[{"name":"moduleCode","required":true,"transform":{"type":"scalar"},"locs":[{"a":1085,"b":1096},{"a":1268,"b":1279}]},{"name":"alsoModule","required":false,"transform":{"type":"scalar"},"locs":[{"a":1255,"b":1265}]},{"name":"actionClass","required":true,"transform":{"type":"scalar"},"locs":[{"a":1632,"b":1644},{"a":1922,"b":1934}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":2211,"b":2223}]},{"name":"subject","required":true,"transform":{"type":"scalar"},"locs":[{"a":2308,"b":2316}]}],"statement":"-- Operaciones de un módulo: lee espacio, derecho y membresía con FOR SHARE en la misma consulta\n-- que decide, en el orden fijo espacio → derecho → membresía (02 §6). Si un cambio de estado\n-- confirma mientras espera, PostgreSQL relee las filas y la decisión se recalcula con ellas.\n-- Sin derecho no devuelve filas: findMembershipClasses elige entonces el error. Con :alsoModule, una\n-- operación que toca dos módulos (ADR 0020) bloquea también ese derecho y decide con el primero que no\n-- admita; sin él, e2 es el mismo derecho y la decisión no cambia.\nSELECT\n  w.id AS workspace_id,\n  w.code,\n  w.name,\n  w.status,\n  w.time_zone,\n  i.id AS identity_id,\n  i.display_name,\n  m.id AS membership_id,\n  p.id AS principal_id,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\",\n  core.workspace_axis(w.status, w.suspension_reason) AS \"workspace_classes!\",\n  CASE WHEN d.owner_decision = 'admitted' THEN d.also_decision ELSE d.owner_decision END AS \"decision!\"\nFROM core.workspaces AS w\nJOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = :moduleCode!\nJOIN core.module_definitions AS md ON md.code = e.module_code\nJOIN core.workspace_entitlements AS e2 ON e2.workspace_id = w.id AND e2.module_code = coalesce(:alsoModule, :moduleCode!)\nJOIN core.module_definitions AS md2 ON md2.code = e2.module_code\nJOIN core.memberships AS m ON m.workspace_id = w.id\nJOIN core.identities AS i ON i.id = m.identity_id\nJOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id\nCROSS JOIN platform.environment AS env\nCROSS JOIN LATERAL (\n  SELECT\n    core.admission(\n      :actionClass!,\n      core.workspace_axis(w.status, w.suspension_reason),\n      core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,\n                       md.stage, e.contract_kind, env.data_class, now())\n    ) AS owner_decision,\n    core.admission(\n      :actionClass!,\n      core.workspace_axis(w.status, w.suspension_reason),\n      core.module_axis(e2.status, e2.valid_from, e2.valid_until, e2.closing_until, e2.read_until,\n                       md2.stage, e2.contract_kind, env.data_class, now())\n    ) AS also_decision\n) AS d\nWHERE w.id = :workspaceId!\n  AND m.status = 'active'\n  AND i.provider = 'supabase'\n  AND i.provider_subject = :subject!\nFOR SHARE OF w, e, e2, m"};

/**
 * Query generated from SQL:
 * ```
 * -- Operaciones de un módulo: lee espacio, derecho y membresía con FOR SHARE en la misma consulta
 * -- que decide, en el orden fijo espacio → derecho → membresía (02 §6). Si un cambio de estado
 * -- confirma mientras espera, PostgreSQL relee las filas y la decisión se recalcula con ellas.
 * -- Sin derecho no devuelve filas: findMembershipClasses elige entonces el error. Con :alsoModule, una
 * -- operación que toca dos módulos (ADR 0020) bloquea también ese derecho y decide con el primero que no
 * -- admita; sin él, e2 es el mismo derecho y la decisión no cambia.
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
 *   CASE WHEN d.owner_decision = 'admitted' THEN d.also_decision ELSE d.owner_decision END AS "decision!"
 * FROM core.workspaces AS w
 * JOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = :moduleCode!
 * JOIN core.module_definitions AS md ON md.code = e.module_code
 * JOIN core.workspace_entitlements AS e2 ON e2.workspace_id = w.id AND e2.module_code = coalesce(:alsoModule, :moduleCode!)
 * JOIN core.module_definitions AS md2 ON md2.code = e2.module_code
 * JOIN core.memberships AS m ON m.workspace_id = w.id
 * JOIN core.identities AS i ON i.id = m.identity_id
 * JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
 * CROSS JOIN platform.environment AS env
 * CROSS JOIN LATERAL (
 *   SELECT
 *     core.admission(
 *       :actionClass!,
 *       core.workspace_axis(w.status, w.suspension_reason),
 *       core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
 *                        md.stage, e.contract_kind, env.data_class, now())
 *     ) AS owner_decision,
 *     core.admission(
 *       :actionClass!,
 *       core.workspace_axis(w.status, w.suspension_reason),
 *       core.module_axis(e2.status, e2.valid_from, e2.valid_until, e2.closing_until, e2.read_until,
 *                        md2.stage, e2.contract_kind, env.data_class, now())
 *     ) AS also_decision
 * ) AS d
 * WHERE w.id = :workspaceId!
 *   AND m.status = 'active'
 *   AND i.provider = 'supabase'
 *   AND i.provider_subject = :subject!
 * FOR SHARE OF w, e, e2, m
 * ```
 */
export const admitModule = new PreparedQuery<IAdmitModuleParams,IAdmitModuleResult>(admitModuleIR);


/** 'AdmitAnyModule' parameters type */
export interface IAdmitAnyModuleParams {
  actionClass: string;
  moduleCodes: stringArray;
  subject: string;
  workspaceId: string;
}

/** 'AdmitAnyModule' return type */
export interface IAdmitAnyModuleResult {
  code: string;
  decision: string;
  display_name: string;
  identity_id: string;
  is_owner: boolean;
  membership_id: string;
  module_code: string;
  name: string;
  principal_id: string;
  status: string;
  time_zone: string;
  workspace_classes: stringArray;
  workspace_id: string;
}

/** 'AdmitAnyModule' query type */
export interface IAdmitAnyModuleQuery {
  params: IAdmitAnyModuleParams;
  result: IAdmitAnyModuleResult;
}

const admitAnyModuleIR: any = {"usedParamSet":{"actionClass":true,"moduleCodes":true,"workspaceId":true,"subject":true},"params":[{"name":"actionClass","required":true,"transform":{"type":"scalar"},"locs":[{"a":651,"b":663}]},{"name":"moduleCodes","required":true,"transform":{"type":"scalar"},"locs":[{"a":1017,"b":1029}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1344,"b":1356}]},{"name":"subject","required":true,"transform":{"type":"scalar"},"locs":[{"a":1441,"b":1449}]}],"statement":"-- Áreas y departamentos (ADR 0024): Core no tiene derecho propio; los admite algún módulo que los declara\n-- en su manifiesto. Una fila por derecho de :moduleCodes con su decisión; espacio, derechos y membresía\n-- quedan bloqueados (FOR SHARE) en la misma consulta que decide, en orden de módulo.\nSELECT\n  w.id AS workspace_id,\n  w.code,\n  w.name,\n  w.status,\n  w.time_zone,\n  i.id AS identity_id,\n  i.display_name,\n  m.id AS membership_id,\n  p.id AS principal_id,\n  (w.owner_membership_id IS NOT DISTINCT FROM m.id) AS \"is_owner!\",\n  core.workspace_axis(w.status, w.suspension_reason) AS \"workspace_classes!\",\n  e.module_code,\n  core.admission(\n    :actionClass!,\n    core.workspace_axis(w.status, w.suspension_reason),\n    core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,\n                     md.stage, e.contract_kind, env.data_class, now())\n  ) AS \"decision!\"\nFROM core.workspaces AS w\nJOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = ANY (:moduleCodes!::text[])\nJOIN core.module_definitions AS md ON md.code = e.module_code\nJOIN core.memberships AS m ON m.workspace_id = w.id\nJOIN core.identities AS i ON i.id = m.identity_id\nJOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id\nCROSS JOIN platform.environment AS env\nWHERE w.id = :workspaceId!\n  AND m.status = 'active'\n  AND i.provider = 'supabase'\n  AND i.provider_subject = :subject!\nORDER BY e.module_code\nFOR SHARE OF w, e, m"};

/**
 * Query generated from SQL:
 * ```
 * -- Áreas y departamentos (ADR 0024): Core no tiene derecho propio; los admite algún módulo que los declara
 * -- en su manifiesto. Una fila por derecho de :moduleCodes con su decisión; espacio, derechos y membresía
 * -- quedan bloqueados (FOR SHARE) en la misma consulta que decide, en orden de módulo.
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
 *   e.module_code,
 *   core.admission(
 *     :actionClass!,
 *     core.workspace_axis(w.status, w.suspension_reason),
 *     core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
 *                      md.stage, e.contract_kind, env.data_class, now())
 *   ) AS "decision!"
 * FROM core.workspaces AS w
 * JOIN core.workspace_entitlements AS e ON e.workspace_id = w.id AND e.module_code = ANY (:moduleCodes!::text[])
 * JOIN core.module_definitions AS md ON md.code = e.module_code
 * JOIN core.memberships AS m ON m.workspace_id = w.id
 * JOIN core.identities AS i ON i.id = m.identity_id
 * JOIN core.principals AS p ON p.workspace_id = m.workspace_id AND p.membership_id = m.id
 * CROSS JOIN platform.environment AS env
 * WHERE w.id = :workspaceId!
 *   AND m.status = 'active'
 *   AND i.provider = 'supabase'
 *   AND i.provider_subject = :subject!
 * ORDER BY e.module_code
 * FOR SHARE OF w, e, m
 * ```
 */
export const admitAnyModule = new PreparedQuery<IAdmitAnyModuleParams,IAdmitAnyModuleResult>(admitAnyModuleIR);


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

const listPermissionCodesIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":166,"b":178}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":204,"b":216}]}],"statement":"SELECT DISTINCT rp.permission_code\nFROM core.effective_role_assignments AS ra\nJOIN core.role_permissions AS rp ON rp.role_code = ra.role_code\nWHERE ra.workspace_id = :workspaceId!\n  AND ra.principal_id = :principalId!\n  AND ra.revoked_at IS NULL\n  AND ra.valid_from <= now()\n  AND (ra.valid_until IS NULL OR ra.valid_until > now())\nORDER BY rp.permission_code"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT rp.permission_code
 * FROM core.effective_role_assignments AS ra
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


/** 'ListMemberRoles' parameters type */
export interface IListMemberRolesParams {
  principalId: string;
  workspaceId: string;
}

/** 'ListMemberRoles' return type */
export interface IListMemberRolesResult {
  name: string;
}

/** 'ListMemberRoles' query type */
export interface IListMemberRolesQuery {
  params: IListMemberRolesParams;
  result: IListMemberRolesResult;
}

const listMemberRolesIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":301,"b":313}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":339,"b":351}]}],"statement":"-- Nombres de los roles vigentes del miembro, solo para mostrarlos (ADR 0011, 05-10-2026): no\n-- autorizan nada. Incluye el Administrador implícito del propietario.\nSELECT DISTINCT r.name\nFROM core.effective_role_assignments AS ra\nJOIN core.roles AS r ON r.code = ra.role_code\nWHERE ra.workspace_id = :workspaceId!\n  AND ra.principal_id = :principalId!\n  AND ra.revoked_at IS NULL\n  AND ra.valid_from <= now()\n  AND (ra.valid_until IS NULL OR ra.valid_until > now())\nORDER BY r.name"};

/**
 * Query generated from SQL:
 * ```
 * -- Nombres de los roles vigentes del miembro, solo para mostrarlos (ADR 0011, 05-10-2026): no
 * -- autorizan nada. Incluye el Administrador implícito del propietario.
 * SELECT DISTINCT r.name
 * FROM core.effective_role_assignments AS ra
 * JOIN core.roles AS r ON r.code = ra.role_code
 * WHERE ra.workspace_id = :workspaceId!
 *   AND ra.principal_id = :principalId!
 *   AND ra.revoked_at IS NULL
 *   AND ra.valid_from <= now()
 *   AND (ra.valid_until IS NULL OR ra.valid_until > now())
 * ORDER BY r.name
 * ```
 */
export const listMemberRoles = new PreparedQuery<IListMemberRolesParams,IListMemberRolesResult>(listMemberRolesIR);


/** 'ListActiveMembers' parameters type */
export interface IListActiveMembersParams {
  workspaceId: string;
}

/** 'ListActiveMembers' return type */
export interface IListActiveMembersResult {
  id: string;
  name: string;
}

/** 'ListActiveMembers' query type */
export interface IListActiveMembersQuery {
  params: IListActiveMembersParams;
  result: IListActiveMembersResult;
}

const listActiveMembersIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":354,"b":366}]}],"statement":"-- Miembros activos del espacio, por nombre: responsables de un equipo y encargados de un área (ADR 0019, 0024).\nSELECT pr.id, ident.display_name AS name\nFROM core.principals AS pr\nJOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nJOIN core.identities AS ident ON ident.id = m.identity_id\nWHERE pr.workspace_id = :workspaceId! AND pr.kind = 'member' AND m.status = 'active'\nORDER BY inventory.fold_text(ident.display_name), pr.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Miembros activos del espacio, por nombre: responsables de un equipo y encargados de un área (ADR 0019, 0024).
 * SELECT pr.id, ident.display_name AS name
 * FROM core.principals AS pr
 * JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * JOIN core.identities AS ident ON ident.id = m.identity_id
 * WHERE pr.workspace_id = :workspaceId! AND pr.kind = 'member' AND m.status = 'active'
 * ORDER BY inventory.fold_text(ident.display_name), pr.id
 * ```
 */
export const listActiveMembers = new PreparedQuery<IListActiveMembersParams,IListActiveMembersResult>(listActiveMembersIR);


/** 'ModuleAdmits' parameters type */
export interface IModuleAdmitsParams {
  actionClass: string;
  moduleCode: string;
  workspaceId: string;
}

/** 'ModuleAdmits' return type */
export interface IModuleAdmitsResult {
  admitted: boolean;
}

/** 'ModuleAdmits' query type */
export interface IModuleAdmitsQuery {
  params: IModuleAdmitsParams;
  result: IModuleAdmitsResult;
}

const moduleAdmitsIR: any = {"usedParamSet":{"actionClass":true,"workspaceId":true,"moduleCode":true},"params":[{"name":"actionClass","required":true,"transform":{"type":"scalar"},"locs":[{"a":243,"b":255}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":713,"b":725}]},{"name":"moduleCode","required":true,"transform":{"type":"scalar"},"locs":[{"a":747,"b":758}]}],"statement":"-- Si el módulo admite hoy la clase de acción en el espacio, sin bloquear su derecho: para lo que un módulo\n-- solo consulta de otro y no decide nada con ello (los recursos de una solicitud de Laboratorios, ADR 0023).\nSELECT core.admission(\n  :actionClass!,\n  core.workspace_axis(w.status, w.suspension_reason),\n  core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,\n                   md.stage, e.contract_kind, env.data_class, now())\n) = 'admitted' AS \"admitted!\"\nFROM core.workspace_entitlements AS e\nJOIN core.workspaces AS w ON w.id = e.workspace_id\nJOIN core.module_definitions AS md ON md.code = e.module_code\nCROSS JOIN platform.environment AS env\nWHERE e.workspace_id = :workspaceId! AND e.module_code = :moduleCode!"};

/**
 * Query generated from SQL:
 * ```
 * -- Si el módulo admite hoy la clase de acción en el espacio, sin bloquear su derecho: para lo que un módulo
 * -- solo consulta de otro y no decide nada con ello (los recursos de una solicitud de Laboratorios, ADR 0023).
 * SELECT core.admission(
 *   :actionClass!,
 *   core.workspace_axis(w.status, w.suspension_reason),
 *   core.module_axis(e.status, e.valid_from, e.valid_until, e.closing_until, e.read_until,
 *                    md.stage, e.contract_kind, env.data_class, now())
 * ) = 'admitted' AS "admitted!"
 * FROM core.workspace_entitlements AS e
 * JOIN core.workspaces AS w ON w.id = e.workspace_id
 * JOIN core.module_definitions AS md ON md.code = e.module_code
 * CROSS JOIN platform.environment AS env
 * WHERE e.workspace_id = :workspaceId! AND e.module_code = :moduleCode!
 * ```
 */
export const moduleAdmits = new PreparedQuery<IModuleAdmitsParams,IModuleAdmitsResult>(moduleAdmitsIR);


