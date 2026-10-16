/** Types generated for queries found in "src/modules/core/infrastructure/locations.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListActiveLocations' parameters type */
export interface IListActiveLocationsParams {
  workspaceId: string;
}

/** 'ListActiveLocations' return type */
export interface IListActiveLocationsResult {
  code: string;
  id: string;
  kind: string;
  name: string;
  parent_id: string | null;
}

/** 'ListActiveLocations' query type */
export interface IListActiveLocationsQuery {
  params: IListActiveLocationsParams;
  result: IListActiveLocationsResult;
}

const listActiveLocationsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":142,"b":154}]}],"statement":"-- Con su padre, para que la web arme los niveles (ADR 0015).\nSELECT id, code, name, kind, parent_id\nFROM core.locations\nWHERE workspace_id = :workspaceId!\n  AND archived_at IS NULL\nORDER BY lower(code), id"};

/**
 * Query generated from SQL:
 * ```
 * -- Con su padre, para que la web arme los niveles (ADR 0015).
 * SELECT id, code, name, kind, parent_id
 * FROM core.locations
 * WHERE workspace_id = :workspaceId!
 *   AND archived_at IS NULL
 * ORDER BY lower(code), id
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

const insertLocationIR: any = {"usedParamSet":{"workspaceId":true,"parentId":true,"kind":true,"code":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":298,"b":310},{"a":696,"b":708}]},{"name":"parentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":313,"b":321},{"a":745,"b":753}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":324,"b":329}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":332,"b":337}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":340,"b":345},{"a":785,"b":790}]}],"statement":"-- Un nombre activo repetido bajo el mismo padre no crea otra: devuelve la existente. Se ejecuta bajo el\n-- bloqueo de códigos del espacio, así que la existente ya es visible para esta sentencia.\nWITH inserted AS (\n  INSERT INTO core.locations (workspace_id, parent_id, kind, code, name)\n  VALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)\n  ON CONFLICT (workspace_id, parent_id, lower(name)) WHERE archived_at IS NULL DO NOTHING\n  RETURNING id, code, name, kind, parent_id\n)\nSELECT id AS \"id!\", code AS \"code!\", name AS \"name!\", kind AS \"kind!\", parent_id, true AS \"created!\" FROM inserted\nUNION ALL\nSELECT id, code, name, kind, parent_id, false FROM core.locations\nWHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid AND lower(name) = lower(:name!)\n  AND archived_at IS NULL\n  AND NOT EXISTS (SELECT 1 FROM inserted)"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre activo repetido bajo el mismo padre no crea otra: devuelve la existente. Se ejecuta bajo el
 * -- bloqueo de códigos del espacio, así que la existente ya es visible para esta sentencia.
 * WITH inserted AS (
 *   INSERT INTO core.locations (workspace_id, parent_id, kind, code, name)
 *   VALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)
 *   ON CONFLICT (workspace_id, parent_id, lower(name)) WHERE archived_at IS NULL DO NOTHING
 *   RETURNING id, code, name, kind, parent_id
 * )
 * SELECT id AS "id!", code AS "code!", name AS "name!", kind AS "kind!", parent_id, true AS "created!" FROM inserted
 * UNION ALL
 * SELECT id, code, name, kind, parent_id, false FROM core.locations
 * WHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid AND lower(name) = lower(:name!)
 *   AND archived_at IS NULL
 *   AND NOT EXISTS (SELECT 1 FROM inserted)
 * ```
 */
export const insertLocation = new PreparedQuery<IInsertLocationParams,IInsertLocationResult>(insertLocationIR);


