/** Types generated for queries found in "src/modules/labs/infrastructure/holds.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type stringArray = (string)[];

/** 'InsertActivityAllocation' parameters type */
export interface IInsertActivityAllocationParams {
  activityId: string;
  allocationId: string;
  line: number;
  workspaceId: string;
}

/** 'InsertActivityAllocation' return type */
export type IInsertActivityAllocationResult = void;

/** 'InsertActivityAllocation' query type */
export interface IInsertActivityAllocationQuery {
  params: IInsertActivityAllocationParams;
  result: IInsertActivityAllocationResult;
}

const insertActivityAllocationIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true,"line":true,"allocationId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":107}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":121}]},{"name":"line","required":true,"transform":{"type":"scalar"},"locs":[{"a":124,"b":129}]},{"name":"allocationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":145}]}],"statement":"INSERT INTO labs.activity_allocations (workspace_id, activity_id, line, allocation_id)\nVALUES (:workspaceId!, :activityId!, :line!, :allocationId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO labs.activity_allocations (workspace_id, activity_id, line, allocation_id)
 * VALUES (:workspaceId!, :activityId!, :line!, :allocationId!)
 * ```
 */
export const insertActivityAllocation = new PreparedQuery<IInsertActivityAllocationParams,IInsertActivityAllocationResult>(insertActivityAllocationIR);


/** 'BookActivityAsset' parameters type */
export interface IBookActivityAssetParams {
  activityId: string;
  assetId: string;
  date: string;
  endsAt: DateOrString;
  line: number;
  startsAt: DateOrString;
  workspaceId: string;
}

/** 'BookActivityAsset' return type */
export interface IBookActivityAssetResult {
  id: string;
}

/** 'BookActivityAsset' query type */
export interface IBookActivityAssetQuery {
  params: IBookActivityAssetParams;
  result: IBookActivityAssetResult;
}

const bookActivityAssetIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true,"line":true,"assetId":true,"date":true,"startsAt":true,"endsAt":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":213,"b":225}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":228,"b":239}]},{"name":"line","required":true,"transform":{"type":"scalar"},"locs":[{"a":242,"b":247}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":250,"b":258}]},{"name":"date","required":true,"transform":{"type":"scalar"},"locs":[{"a":269,"b":274},{"a":302,"b":307}]},{"name":"startsAt","required":true,"transform":{"type":"scalar"},"locs":[{"a":284,"b":293}]},{"name":"endsAt","required":true,"transform":{"type":"scalar"},"locs":[{"a":317,"b":324}]}],"statement":"-- Un equipo ocupado en la franja (activity_assets_no_overlap) no se aparta: no devuelve fila y se prueba el siguiente.\nINSERT INTO labs.activity_assets (workspace_id, activity_id, line, asset_id, during)\nVALUES (:workspaceId!, :activityId!, :line!, :assetId!, tsrange(:date!::date + :startsAt!::time, :date!::date + :endsAt!::time))\nON CONFLICT DO NOTHING\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un equipo ocupado en la franja (activity_assets_no_overlap) no se aparta: no devuelve fila y se prueba el siguiente.
 * INSERT INTO labs.activity_assets (workspace_id, activity_id, line, asset_id, during)
 * VALUES (:workspaceId!, :activityId!, :line!, :assetId!, tsrange(:date!::date + :startsAt!::time, :date!::date + :endsAt!::time))
 * ON CONFLICT DO NOTHING
 * RETURNING id
 * ```
 */
export const bookActivityAsset = new PreparedQuery<IBookActivityAssetParams,IBookActivityAssetResult>(bookActivityAssetIR);


/** 'ActivityAllocations' parameters type */
export interface IActivityAllocationsParams {
  activityIds: stringArray;
  workspaceId: string;
}

/** 'ActivityAllocations' return type */
export interface IActivityAllocationsResult {
  activity_id: string;
  allocation_id: string;
  line: number;
}

/** 'ActivityAllocations' query type */
export interface IActivityAllocationsQuery {
  params: IActivityAllocationsParams;
  result: IActivityAllocationsResult;
}

const activityAllocationsIR: any = {"usedParamSet":{"workspaceId":true,"activityIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":104}]},{"name":"activityIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":129,"b":141}]}],"statement":"SELECT activity_id, line, allocation_id\nFROM labs.activity_allocations\nWHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[])"};

/**
 * Query generated from SQL:
 * ```
 * SELECT activity_id, line, allocation_id
 * FROM labs.activity_allocations
 * WHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[])
 * ```
 */
export const activityAllocations = new PreparedQuery<IActivityAllocationsParams,IActivityAllocationsResult>(activityAllocationsIR);


/** 'ActivityAssets' parameters type */
export interface IActivityAssetsParams {
  activityIds: stringArray;
  workspaceId: string;
}

/** 'ActivityAssets' return type */
export interface IActivityAssetsResult {
  activity_id: string;
  asset_id: string;
  line: number;
}

/** 'ActivityAssets' query type */
export interface IActivityAssetsQuery {
  params: IActivityAssetsParams;
  result: IActivityAssetsResult;
}

const activityAssetsIR: any = {"usedParamSet":{"workspaceId":true,"activityIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":144}]},{"name":"activityIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":169,"b":181}]}],"statement":"-- Los equipos apartados vigentes de los bloques.\nSELECT activity_id, line, asset_id\nFROM labs.activity_assets\nWHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[]) AND released_at IS NULL\nORDER BY created_at"};

/**
 * Query generated from SQL:
 * ```
 * -- Los equipos apartados vigentes de los bloques.
 * SELECT activity_id, line, asset_id
 * FROM labs.activity_assets
 * WHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[]) AND released_at IS NULL
 * ORDER BY created_at
 * ```
 */
export const activityAssets = new PreparedQuery<IActivityAssetsParams,IActivityAssetsResult>(activityAssetsIR);


/** 'ReleaseActivityAssets' parameters type */
export interface IReleaseActivityAssetsParams {
  activityIds: stringArray;
  workspaceId: string;
}

/** 'ReleaseActivityAssets' return type */
export type IReleaseActivityAssetsResult = void;

/** 'ReleaseActivityAssets' query type */
export interface IReleaseActivityAssetsQuery {
  params: IReleaseActivityAssetsParams;
  result: IReleaseActivityAssetsResult;
}

const releaseActivityAssetsIR: any = {"usedParamSet":{"workspaceId":true,"activityIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":85}]},{"name":"activityIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":122}]}],"statement":"UPDATE labs.activity_assets\nSET released_at = now()\nWHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[]) AND released_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE labs.activity_assets
 * SET released_at = now()
 * WHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[]) AND released_at IS NULL
 * ```
 */
export const releaseActivityAssets = new PreparedQuery<IReleaseActivityAssetsParams,IReleaseActivityAssetsResult>(releaseActivityAssetsIR);


/** 'ActiveRequestActivities' parameters type */
export interface IActiveRequestActivitiesParams {
  activityId?: string | null | void;
  requestId: string;
  workspaceId: string;
}

/** 'ActiveRequestActivities' return type */
export interface IActiveRequestActivitiesResult {
  area_name: string;
  date: string;
  ends_at: string;
  id: string;
  starts_at: string;
}

/** 'ActiveRequestActivities' query type */
export interface IActiveRequestActivitiesQuery {
  params: IActiveRequestActivitiesParams;
  result: IActiveRequestActivitiesResult;
}

const activeRequestActivitiesIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true,"activityId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":397,"b":409}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":430,"b":440}]},{"name":"activityId","required":false,"transform":{"type":"scalar"},"locs":[{"a":476,"b":486},{"a":512,"b":522}]}],"statement":"-- Los bloques activos de una solicitud, con su fecha, hora y área: lo que se aparta o se libera.\nSELECT a.id, a.on_date::text AS \"date!\", to_char(a.starts_at, 'HH24:MI') AS \"starts_at!\", to_char(a.ends_at, 'HH24:MI') AS \"ends_at!\",\n  area.name AS area_name\nFROM labs.activities AS a\nJOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id\nWHERE a.workspace_id = :workspaceId! AND a.request_id = :requestId! AND a.cancelled_at IS NULL\n  AND (:activityId::uuid IS NULL OR a.id = :activityId::uuid)"};

/**
 * Query generated from SQL:
 * ```
 * -- Los bloques activos de una solicitud, con su fecha, hora y área: lo que se aparta o se libera.
 * SELECT a.id, a.on_date::text AS "date!", to_char(a.starts_at, 'HH24:MI') AS "starts_at!", to_char(a.ends_at, 'HH24:MI') AS "ends_at!",
 *   area.name AS area_name
 * FROM labs.activities AS a
 * JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
 * WHERE a.workspace_id = :workspaceId! AND a.request_id = :requestId! AND a.cancelled_at IS NULL
 *   AND (:activityId::uuid IS NULL OR a.id = :activityId::uuid)
 * ```
 */
export const activeRequestActivities = new PreparedQuery<IActiveRequestActivitiesParams,IActiveRequestActivitiesResult>(activeRequestActivitiesIR);


/** 'AssetBookingsOn' parameters type */
export interface IAssetBookingsOnParams {
  assetIds: stringArray;
  date: string;
  workspaceId: string;
}

/** 'AssetBookingsOn' return type */
export interface IAssetBookingsOnResult {
  asset_id: string;
  ends_at: string;
  starts_at: string;
}

/** 'AssetBookingsOn' query type */
export interface IAssetBookingsOnQuery {
  params: IAssetBookingsOnParams;
  result: IAssetBookingsOnResult;
}

const assetBookingsOnIR: any = {"usedParamSet":{"workspaceId":true,"assetIds":true,"date":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":285,"b":297}]},{"name":"assetIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":319,"b":328}]},{"name":"date","required":true,"transform":{"type":"scalar"},"locs":[{"a":387,"b":392},{"a":401,"b":406}]}],"statement":"-- Las franjas ya apartadas de esos equipos ese día: lo que la revisión antes de enviar descuenta para ver qué hay libre.\nSELECT asset_id, to_char(lower(during), 'HH24:MI') AS \"starts_at!\", to_char(upper(during), 'HH24:MI') AS \"ends_at!\"\nFROM labs.activity_assets\nWHERE workspace_id = :workspaceId! AND asset_id = ANY (:assetIds!::uuid[]) AND released_at IS NULL\n  AND during && tsrange(:date!::date, :date!::date + 1)"};

/**
 * Query generated from SQL:
 * ```
 * -- Las franjas ya apartadas de esos equipos ese día: lo que la revisión antes de enviar descuenta para ver qué hay libre.
 * SELECT asset_id, to_char(lower(during), 'HH24:MI') AS "starts_at!", to_char(upper(during), 'HH24:MI') AS "ends_at!"
 * FROM labs.activity_assets
 * WHERE workspace_id = :workspaceId! AND asset_id = ANY (:assetIds!::uuid[]) AND released_at IS NULL
 *   AND during && tsrange(:date!::date, :date!::date + 1)
 * ```
 */
export const assetBookingsOn = new PreparedQuery<IAssetBookingsOnParams,IAssetBookingsOnResult>(assetBookingsOnIR);


/** 'ActivityReagentLine' parameters type */
export interface IActivityReagentLineParams {
  activityId: string;
  line: number;
  workspaceId: string;
}

/** 'ActivityReagentLine' return type */
export interface IActivityReagentLineResult {
  area_name: string;
  item_id: string;
  quantity: string;
  request_number: number;
  unit: string;
}

/** 'ActivityReagentLine' query type */
export interface IActivityReagentLineQuery {
  params: IActivityReagentLineParams;
  result: IActivityReagentLineResult;
}

const activityReagentLineIR: any = {"usedParamSet":{"line":true,"workspaceId":true,"activityId":true},"params":[{"name":"line","required":true,"transform":{"type":"scalar"},"locs":[{"a":651,"b":656}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":681,"b":693}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":706,"b":717}]}],"statement":"-- Una línea de reactivo del catálogo de un bloque (ADR 0023, «Cierre de Laboratorios»): su ítem, lo pedido, el código de\n-- la solicitud y el área del bloque, que es el destino de lo apartado.\nSELECT r.number AS request_number, area.name AS area_name, l.item_id AS \"item_id!\", trim_scale(l.quantity)::text AS \"quantity!\",\n  l.unit AS \"unit!\"\nFROM labs.activities AS a\nJOIN labs.requests AS r ON r.workspace_id = a.workspace_id AND r.id = a.request_id\nJOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id\nJOIN labs.request_lines AS l ON l.workspace_id = a.workspace_id AND l.request_id = a.request_id AND l.line = :line!\nWHERE a.workspace_id = :workspaceId! AND a.id = :activityId! AND l.kind = 'reagent' AND l.item_id IS NOT NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- Una línea de reactivo del catálogo de un bloque (ADR 0023, «Cierre de Laboratorios»): su ítem, lo pedido, el código de
 * -- la solicitud y el área del bloque, que es el destino de lo apartado.
 * SELECT r.number AS request_number, area.name AS area_name, l.item_id AS "item_id!", trim_scale(l.quantity)::text AS "quantity!",
 *   l.unit AS "unit!"
 * FROM labs.activities AS a
 * JOIN labs.requests AS r ON r.workspace_id = a.workspace_id AND r.id = a.request_id
 * JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
 * JOIN labs.request_lines AS l ON l.workspace_id = a.workspace_id AND l.request_id = a.request_id AND l.line = :line!
 * WHERE a.workspace_id = :workspaceId! AND a.id = :activityId! AND l.kind = 'reagent' AND l.item_id IS NOT NULL
 * ```
 */
export const activityReagentLine = new PreparedQuery<IActivityReagentLineParams,IActivityReagentLineResult>(activityReagentLineIR);


/** 'TouchActivity' parameters type */
export interface ITouchActivityParams {
  activityId: string;
  workspaceId: string;
}

/** 'TouchActivity' return type */
export type ITouchActivityResult = void;

/** 'TouchActivity' query type */
export interface ITouchActivityQuery {
  params: ITouchActivityParams;
  result: ITouchActivityResult;
}

const touchActivityIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":155,"b":167}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":178,"b":189}]}],"statement":"-- Lo apartado de un bloque cambió: su versión también, para quien lo tenga abierto.\nUPDATE labs.activities\nSET version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :activityId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo apartado de un bloque cambió: su versión también, para quien lo tenga abierto.
 * UPDATE labs.activities
 * SET version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :activityId!
 * ```
 */
export const touchActivity = new PreparedQuery<ITouchActivityParams,ITouchActivityResult>(touchActivityIR);


