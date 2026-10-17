/** Types generated for queries found in "src/modules/core/infrastructure/locations.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListActiveLocations' parameters type */
export interface IListActiveLocationsParams {
  workspaceId: string;
}

/** 'ListActiveLocations' return type */
export interface IListActiveLocationsResult {
  area_id: string;
  code: string;
  id: string;
  kind: string;
  manager_principal_id: string | null;
  name: string;
  parent_id: string | null;
}

/** 'ListActiveLocations' query type */
export interface IListActiveLocationsQuery {
  params: IListActiveLocationsParams;
  result: IListActiveLocationsResult;
}

const listActiveLocationsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":363,"b":375}]}],"statement":"-- Con su padre, para que la web arme los niveles (ADR 0015), su área y, si es un área, su encargado\n-- (ADR 0019, E-01c).\nSELECT l.id, l.code, l.name, l.kind, l.parent_id, la.area_id AS \"area_id!\", l.manager_principal_id\nFROM core.locations AS l\nJOIN core.location_areas AS la ON la.workspace_id = l.workspace_id AND la.location_id = l.id\nWHERE l.workspace_id = :workspaceId!\n  AND l.archived_at IS NULL\nORDER BY lower(l.code), l.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Con su padre, para que la web arme los niveles (ADR 0015), su área y, si es un área, su encargado
 * -- (ADR 0019, E-01c).
 * SELECT l.id, l.code, l.name, l.kind, l.parent_id, la.area_id AS "area_id!", l.manager_principal_id
 * FROM core.locations AS l
 * JOIN core.location_areas AS la ON la.workspace_id = l.workspace_id AND la.location_id = l.id
 * WHERE l.workspace_id = :workspaceId!
 *   AND l.archived_at IS NULL
 * ORDER BY lower(l.code), l.id
 * ```
 */
export const listActiveLocations = new PreparedQuery<IListActiveLocationsParams,IListActiveLocationsResult>(listActiveLocationsIR);


/** 'FindActiveLocation' parameters type */
export interface IFindActiveLocationParams {
  locationId: string;
  workspaceId: string;
}

/** 'FindActiveLocation' return type */
export interface IFindActiveLocationResult {
  id: string;
  kind: string;
}

/** 'FindActiveLocation' query type */
export interface IFindActiveLocationQuery {
  params: IFindActiveLocationParams;
  result: IFindActiveLocationResult;
}

const findActiveLocationIR: any = {"usedParamSet":{"workspaceId":true,"locationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":69}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":91}]}],"statement":"SELECT id, kind\nFROM core.locations\nWHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, kind
 * FROM core.locations
 * WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
 * ```
 */
export const findActiveLocation = new PreparedQuery<IFindActiveLocationParams,IFindActiveLocationResult>(findActiveLocationIR);


/** 'LocationCodesLike' parameters type */
export interface ILocationCodesLikeParams {
  base: string;
  workspaceId: string;
}

/** 'LocationCodesLike' return type */
export interface ILocationCodesLikeResult {
  code: string;
}

/** 'LocationCodesLike' query type */
export interface ILocationCodesLikeQuery {
  params: ILocationCodesLikeParams;
  result: ILocationCodesLikeResult;
}

const locationCodesLikeIR: any = {"usedParamSet":{"workspaceId":true,"base":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":131}]},{"name":"base","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":163},{"a":200,"b":205}]}],"statement":"-- Códigos del espacio iguales al propuesto o con un sufijo «-N».\nSELECT code\nFROM core.locations\nWHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'))"};

/**
 * Query generated from SQL:
 * ```
 * -- Códigos del espacio iguales al propuesto o con un sufijo «-N».
 * SELECT code
 * FROM core.locations
 * WHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'))
 * ```
 */
export const locationCodesLike = new PreparedQuery<ILocationCodesLikeParams,ILocationCodesLikeResult>(locationCodesLikeIR);


/** 'InsertLocation' parameters type */
export interface IInsertLocationParams {
  code: string;
  kind: string;
  name: string;
  parentId?: string | null | void;
  workspaceId: string;
}

/** 'InsertLocation' return type */
export interface IInsertLocationResult {
  code: string;
  created: boolean;
  id: string;
  kind: string;
  name: string;
  parent_id: string | null;
}

/** 'InsertLocation' query type */
export interface IInsertLocationQuery {
  params: IInsertLocationParams;
  result: IInsertLocationResult;
}

const insertLocationIR: any = {"usedParamSet":{"workspaceId":true,"parentId":true,"kind":true,"code":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":339,"b":351},{"a":746,"b":758}]},{"name":"parentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":354,"b":362},{"a":795,"b":803}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":365,"b":370}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":373,"b":378}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":381,"b":386},{"a":855,"b":860}]}],"statement":"-- Un nombre activo repetido bajo el mismo padre, sin distinguir tildes ni mayúsculas, no crea otra:\n-- devuelve la existente. Se ejecuta bajo el\n-- bloqueo de códigos del espacio, así que la existente ya es visible para esta sentencia.\nWITH inserted AS (\n  INSERT INTO core.locations (workspace_id, parent_id, kind, code, name)\n  VALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)\n  ON CONFLICT (workspace_id, parent_id, core.fold_text(name)) WHERE archived_at IS NULL DO NOTHING\n  RETURNING id, code, name, kind, parent_id\n)\nSELECT id AS \"id!\", code AS \"code!\", name AS \"name!\", kind AS \"kind!\", parent_id, true AS \"created!\" FROM inserted\nUNION ALL\nSELECT id, code, name, kind, parent_id, false FROM core.locations\nWHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid\n  AND core.fold_text(name) = core.fold_text(:name!)\n  AND archived_at IS NULL\n  AND NOT EXISTS (SELECT 1 FROM inserted)"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre activo repetido bajo el mismo padre, sin distinguir tildes ni mayúsculas, no crea otra:
 * -- devuelve la existente. Se ejecuta bajo el
 * -- bloqueo de códigos del espacio, así que la existente ya es visible para esta sentencia.
 * WITH inserted AS (
 *   INSERT INTO core.locations (workspace_id, parent_id, kind, code, name)
 *   VALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)
 *   ON CONFLICT (workspace_id, parent_id, core.fold_text(name)) WHERE archived_at IS NULL DO NOTHING
 *   RETURNING id, code, name, kind, parent_id
 * )
 * SELECT id AS "id!", code AS "code!", name AS "name!", kind AS "kind!", parent_id, true AS "created!" FROM inserted
 * UNION ALL
 * SELECT id, code, name, kind, parent_id, false FROM core.locations
 * WHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid
 *   AND core.fold_text(name) = core.fold_text(:name!)
 *   AND archived_at IS NULL
 *   AND NOT EXISTS (SELECT 1 FROM inserted)
 * ```
 */
export const insertLocation = new PreparedQuery<IInsertLocationParams,IInsertLocationResult>(insertLocationIR);


/** 'LockArea' parameters type */
export interface ILockAreaParams {
  areaId: string;
  managerId?: string | null | void;
  workspaceId: string;
}

/** 'LockArea' return type */
export interface ILockAreaResult {
  id: string;
  manager_ok: boolean;
  manager_principal_id: string | null;
}

/** 'LockArea' query type */
export interface ILockAreaQuery {
  params: ILockAreaParams;
  result: ILockAreaResult;
}

const lockAreaIR: any = {"usedParamSet":{"managerId":true,"workspaceId":true,"areaId":true},"params":[{"name":"managerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":243,"b":252},{"a":473,"b":482}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":447,"b":459},{"a":607,"b":619}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":632,"b":639}]}],"statement":"-- El área activa del espacio, bloqueada para cambiar su encargado (ADR 0019, E-01c), y si el miembro\n-- propuesto está activo; sin fila si la ubicación no es un área. Un encargado nulo no se comprueba.\nSELECT l.id, l.manager_principal_id,\n  (:managerId::uuid IS NULL OR EXISTS (\n    SELECT 1\n    FROM core.principals AS pr\n    JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n    WHERE pr.workspace_id = :workspaceId! AND pr.id = :managerId::uuid AND pr.kind = 'member' AND m.status = 'active'\n  )) AS \"manager_ok!\"\nFROM core.locations AS l\nWHERE l.workspace_id = :workspaceId! AND l.id = :areaId! AND l.archived_at IS NULL\n  AND EXISTS (\n    SELECT 1 FROM core.location_areas AS la\n    WHERE la.workspace_id = l.workspace_id AND la.location_id = l.id AND la.area_id = l.id\n  )\nFOR UPDATE OF l"};

/**
 * Query generated from SQL:
 * ```
 * -- El área activa del espacio, bloqueada para cambiar su encargado (ADR 0019, E-01c), y si el miembro
 * -- propuesto está activo; sin fila si la ubicación no es un área. Un encargado nulo no se comprueba.
 * SELECT l.id, l.manager_principal_id,
 *   (:managerId::uuid IS NULL OR EXISTS (
 *     SELECT 1
 *     FROM core.principals AS pr
 *     JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *     WHERE pr.workspace_id = :workspaceId! AND pr.id = :managerId::uuid AND pr.kind = 'member' AND m.status = 'active'
 *   )) AS "manager_ok!"
 * FROM core.locations AS l
 * WHERE l.workspace_id = :workspaceId! AND l.id = :areaId! AND l.archived_at IS NULL
 *   AND EXISTS (
 *     SELECT 1 FROM core.location_areas AS la
 *     WHERE la.workspace_id = l.workspace_id AND la.location_id = l.id AND la.area_id = l.id
 *   )
 * FOR UPDATE OF l
 * ```
 */
export const lockArea = new PreparedQuery<ILockAreaParams,ILockAreaResult>(lockAreaIR);


/** 'SetAreaManager' parameters type */
export interface ISetAreaManagerParams {
  areaId: string;
  managerId?: string | null | void;
  workspaceId: string;
}

/** 'SetAreaManager' return type */
export type ISetAreaManagerResult = void;

/** 'SetAreaManager' query type */
export interface ISetAreaManagerQuery {
  params: ISetAreaManagerParams;
  result: ISetAreaManagerResult;
}

const setAreaManagerIR: any = {"usedParamSet":{"managerId":true,"workspaceId":true,"areaId":true},"params":[{"name":"managerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":49,"b":58}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":122}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":140}]}],"statement":"UPDATE core.locations\nSET manager_principal_id = :managerId::uuid, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :areaId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE core.locations
 * SET manager_principal_id = :managerId::uuid, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :areaId!
 * ```
 */
export const setAreaManager = new PreparedQuery<ISetAreaManagerParams,ISetAreaManagerResult>(setAreaManagerIR);


