/** Types generated for queries found in "src/modules/core/infrastructure/locations.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

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

const findActiveLocationIR: any = {"usedParamSet":{"workspaceId":true,"locationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":162,"b":174}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":185,"b":196}]}],"statement":"-- El padre de una ubicación nueva, bloqueado (compartido) hasta el final: no se archiva mientras tanto.\nSELECT id, kind\nFROM core.locations\nWHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL\nFOR SHARE"};

/**
 * Query generated from SQL:
 * ```
 * -- El padre de una ubicación nueva, bloqueado (compartido) hasta el final: no se archiva mientras tanto.
 * SELECT id, kind
 * FROM core.locations
 * WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
 * FOR SHARE
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

const insertLocationIR: any = {"usedParamSet":{"workspaceId":true,"parentId":true,"kind":true,"code":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":273,"b":285}]},{"name":"parentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":296}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":299,"b":304}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":307,"b":312}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":315,"b":320}]}],"statement":"-- Un nombre activo repetido bajo el mismo padre, sin distinguir tildes ni mayúsculas, no inserta nada: el\n-- comando responde NAME_TAKEN. Se ejecuta bajo el bloqueo de ubicaciones del espacio.\nINSERT INTO core.locations (workspace_id, parent_id, kind, code, name)\nVALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)\nON CONFLICT (workspace_id, parent_id, core.fold_text(name)) WHERE archived_at IS NULL DO NOTHING\nRETURNING id, code, name, kind, parent_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre activo repetido bajo el mismo padre, sin distinguir tildes ni mayúsculas, no inserta nada: el
 * -- comando responde NAME_TAKEN. Se ejecuta bajo el bloqueo de ubicaciones del espacio.
 * INSERT INTO core.locations (workspace_id, parent_id, kind, code, name)
 * VALUES (:workspaceId!, :parentId, :kind!, :code!, :name!)
 * ON CONFLICT (workspace_id, parent_id, core.fold_text(name)) WHERE archived_at IS NULL DO NOTHING
 * RETURNING id, code, name, kind, parent_id
 * ```
 */
export const insertLocation = new PreparedQuery<IInsertLocationParams,IInsertLocationResult>(insertLocationIR);


/** 'LockLocation' parameters type */
export interface ILockLocationParams {
  locationId: string;
  workspaceId: string;
}

/** 'LockLocation' return type */
export interface ILockLocationResult {
  id: string;
  kind: string;
  name: string;
  parent_id: string | null;
}

/** 'LockLocation' query type */
export interface ILockLocationQuery {
  params: ILockLocationParams;
  result: ILockLocationResult;
}

const lockLocationIR: any = {"usedParamSet":{"workspaceId":true,"locationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":126,"b":138}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":149,"b":160}]}],"statement":"-- La ubicación activa, bloqueada para renombrarla.\nSELECT id, name, kind, parent_id\nFROM core.locations\nWHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- La ubicación activa, bloqueada para renombrarla.
 * SELECT id, name, kind, parent_id
 * FROM core.locations
 * WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
 * FOR UPDATE
 * ```
 */
export const lockLocation = new PreparedQuery<ILockLocationParams,ILockLocationResult>(lockLocationIR);


/** 'SiblingNamed' parameters type */
export interface ISiblingNamedParams {
  exceptId: string;
  name: string;
  parentId?: string | null | void;
  workspaceId: string;
}

/** 'SiblingNamed' return type */
export interface ISiblingNamedResult {
  name: string;
}

/** 'SiblingNamed' query type */
export interface ISiblingNamedQuery {
  params: ISiblingNamedParams;
  result: ISiblingNamedResult;
}

const siblingNamedIR: any = {"usedParamSet":{"workspaceId":true,"parentId":true,"name":true,"exceptId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":155,"b":167}]},{"name":"parentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":212}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":264,"b":269}]},{"name":"exceptId","required":true,"transform":{"type":"scalar"},"locs":[{"a":306,"b":315}]}],"statement":"-- Otra ubicación activa con el mismo nombre plegado bajo el mismo padre, para nombrarla en el error.\nSELECT name\nFROM core.locations\nWHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid\n  AND core.fold_text(name) = core.fold_text(:name!) AND archived_at IS NULL AND id <> :exceptId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Otra ubicación activa con el mismo nombre plegado bajo el mismo padre, para nombrarla en el error.
 * SELECT name
 * FROM core.locations
 * WHERE workspace_id = :workspaceId! AND parent_id IS NOT DISTINCT FROM :parentId::uuid
 *   AND core.fold_text(name) = core.fold_text(:name!) AND archived_at IS NULL AND id <> :exceptId!
 * ```
 */
export const siblingNamed = new PreparedQuery<ISiblingNamedParams,ISiblingNamedResult>(siblingNamedIR);


/** 'SetLocationName' parameters type */
export interface ISetLocationNameParams {
  locationId: string;
  name: string;
  workspaceId: string;
}

/** 'SetLocationName' return type */
export type ISetLocationNameResult = void;

/** 'SetLocationName' query type */
export interface ISetLocationNameQuery {
  params: ISetLocationNameParams;
  result: ISetLocationNameResult;
}

const setLocationNameIR: any = {"usedParamSet":{"name":true,"workspaceId":true,"locationId":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":33,"b":38}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":84,"b":96}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":118}]}],"statement":"UPDATE core.locations\nSET name = :name!, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :locationId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE core.locations
 * SET name = :name!, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :locationId!
 * ```
 */
export const setLocationName = new PreparedQuery<ISetLocationNameParams,ISetLocationNameResult>(setLocationNameIR);


/** 'LockLocationTree' parameters type */
export interface ILockLocationTreeParams {
  locationId: string;
  workspaceId: string;
}

/** 'LockLocationTree' return type */
export interface ILockLocationTreeResult {
  id: string;
  kind: string;
  name: string;
}

/** 'LockLocationTree' query type */
export interface ILockLocationTreeQuery {
  params: ILockLocationTreeParams;
  result: ILockLocationTreeResult;
}

const lockLocationTreeIR: any = {"usedParamSet":{"workspaceId":true,"locationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":284,"b":296},{"a":475,"b":487},{"a":597,"b":609}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":307,"b":318}]}],"statement":"-- La ubicación activa y toda su descendencia activa, bloqueadas en orden de id para archivarlas (ADR 0024):\n-- un ingreso, un traslado o un alta que esperaba la ubicación la relee archivada y no la usa.\nWITH RECURSIVE tree AS (\n  SELECT id FROM core.locations\n  WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL\n  UNION ALL\n  SELECT child.id\n  FROM core.locations AS child\n  JOIN tree ON child.parent_id = tree.id\n  WHERE child.workspace_id = :workspaceId! AND child.archived_at IS NULL\n)\nSELECT l.id, l.kind, l.name\nFROM core.locations AS l\nWHERE l.workspace_id = :workspaceId! AND l.id IN (SELECT id FROM tree) AND l.archived_at IS NULL\nORDER BY l.id\nFOR UPDATE OF l"};

/**
 * Query generated from SQL:
 * ```
 * -- La ubicación activa y toda su descendencia activa, bloqueadas en orden de id para archivarlas (ADR 0024):
 * -- un ingreso, un traslado o un alta que esperaba la ubicación la relee archivada y no la usa.
 * WITH RECURSIVE tree AS (
 *   SELECT id FROM core.locations
 *   WHERE workspace_id = :workspaceId! AND id = :locationId! AND archived_at IS NULL
 *   UNION ALL
 *   SELECT child.id
 *   FROM core.locations AS child
 *   JOIN tree ON child.parent_id = tree.id
 *   WHERE child.workspace_id = :workspaceId! AND child.archived_at IS NULL
 * )
 * SELECT l.id, l.kind, l.name
 * FROM core.locations AS l
 * WHERE l.workspace_id = :workspaceId! AND l.id IN (SELECT id FROM tree) AND l.archived_at IS NULL
 * ORDER BY l.id
 * FOR UPDATE OF l
 * ```
 */
export const lockLocationTree = new PreparedQuery<ILockLocationTreeParams,ILockLocationTreeResult>(lockLocationTreeIR);


/** 'ArchiveLocations' parameters type */
export interface IArchiveLocationsParams {
  locationIds: stringArray;
  workspaceId: string;
}

/** 'ArchiveLocations' return type */
export interface IArchiveLocationsResult {
  id: string;
}

/** 'ArchiveLocations' query type */
export interface IArchiveLocationsQuery {
  params: IArchiveLocationsParams;
  result: IArchiveLocationsResult;
}

const archiveLocationsIR: any = {"usedParamSet":{"workspaceId":true,"locationIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":102}]},{"name":"locationIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":130}]}],"statement":"UPDATE core.locations\nSET archived_at = now(), version = version + 1\nWHERE workspace_id = :workspaceId! AND id = ANY (:locationIds!::uuid[]) AND archived_at IS NULL\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE core.locations
 * SET archived_at = now(), version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = ANY (:locationIds!::uuid[]) AND archived_at IS NULL
 * RETURNING id
 * ```
 */
export const archiveLocations = new PreparedQuery<IArchiveLocationsParams,IArchiveLocationsResult>(archiveLocationsIR);


/** 'ListAreaCards' parameters type */
export interface IListAreaCardsParams {
  workspaceId: string;
}

/** 'ListAreaCards' return type */
export interface IListAreaCardsResult {
  code: string;
  group_id: string;
  group_name: string;
  id: string;
  manager_name: string;
  manager_principal_id: string | null;
  name: string;
}

/** 'ListAreaCards' query type */
export interface IListAreaCardsQuery {
  params: IListAreaCardsParams;
  result: IListAreaCardsResult;
}

const listAreaCardsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":864,"b":876}]}],"statement":"-- Las áreas activas (ADR 0024): el primer nivel bajo la sede o el edificio, o la raíz; con su grupo (la\n-- sede o el edificio que las contiene) y su encargado. Por grupo y nombre.\nSELECT a.id, a.code, a.name, g.id AS group_id, g.name AS group_name,\n       a.manager_principal_id, ident.display_name AS manager_name\nFROM core.locations AS a\nJOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.id AND la.area_id = a.id\nLEFT JOIN core.locations AS g ON g.workspace_id = a.workspace_id AND g.id = a.parent_id AND g.kind IN ('site', 'building')\nLEFT JOIN core.principals AS pr ON pr.workspace_id = a.workspace_id AND pr.id = a.manager_principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nWHERE a.workspace_id = :workspaceId! AND a.archived_at IS NULL AND a.kind NOT IN ('site', 'building')\nORDER BY g.name IS NOT NULL, core.fold_text(coalesce(g.name, '')), core.fold_text(a.name), a.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Las áreas activas (ADR 0024): el primer nivel bajo la sede o el edificio, o la raíz; con su grupo (la
 * -- sede o el edificio que las contiene) y su encargado. Por grupo y nombre.
 * SELECT a.id, a.code, a.name, g.id AS group_id, g.name AS group_name,
 *        a.manager_principal_id, ident.display_name AS manager_name
 * FROM core.locations AS a
 * JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.id AND la.area_id = a.id
 * LEFT JOIN core.locations AS g ON g.workspace_id = a.workspace_id AND g.id = a.parent_id AND g.kind IN ('site', 'building')
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = a.workspace_id AND pr.id = a.manager_principal_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * WHERE a.workspace_id = :workspaceId! AND a.archived_at IS NULL AND a.kind NOT IN ('site', 'building')
 * ORDER BY g.name IS NOT NULL, core.fold_text(coalesce(g.name, '')), core.fold_text(a.name), a.id
 * ```
 */
export const listAreaCards = new PreparedQuery<IListAreaCardsParams,IListAreaCardsResult>(listAreaCardsIR);


/** 'ListShelves' parameters type */
export interface IListShelvesParams {
  workspaceId: string;
}

/** 'ListShelves' return type */
export interface IListShelvesResult {
  area_id: string;
  code: string;
  id: string;
  name: string;
  parent_id: string;
}

/** 'ListShelves' query type */
export interface IListShelvesQuery {
  params: IListShelvesParams;
  result: IListShelvesResult;
}

const listShelvesIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":305,"b":317}]}],"statement":"-- Estantes y niveles activos de las áreas, con su padre para armar los niveles.\nSELECT l.id, l.code, l.name, l.parent_id AS \"parent_id!\", la.area_id AS \"area_id!\"\nFROM core.locations AS l\nJOIN core.location_areas AS la ON la.workspace_id = l.workspace_id AND la.location_id = l.id\nWHERE l.workspace_id = :workspaceId! AND l.archived_at IS NULL AND la.area_id <> l.id\n  AND l.kind NOT IN ('site', 'building')\nORDER BY core.fold_text(l.name), l.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Estantes y niveles activos de las áreas, con su padre para armar los niveles.
 * SELECT l.id, l.code, l.name, l.parent_id AS "parent_id!", la.area_id AS "area_id!"
 * FROM core.locations AS l
 * JOIN core.location_areas AS la ON la.workspace_id = l.workspace_id AND la.location_id = l.id
 * WHERE l.workspace_id = :workspaceId! AND l.archived_at IS NULL AND la.area_id <> l.id
 *   AND l.kind NOT IN ('site', 'building')
 * ORDER BY core.fold_text(l.name), l.id
 * ```
 */
export const listShelves = new PreparedQuery<IListShelvesParams,IListShelvesResult>(listShelvesIR);


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


