/** Types generated for queries found in "src/modules/maintenance/infrastructure/work.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'WorkspaceToday' parameters type */
export interface IWorkspaceTodayParams {
  timeZone: string;
}

/** 'WorkspaceToday' return type */
export interface IWorkspaceTodayResult {
  today: string;
}

/** 'WorkspaceToday' query type */
export interface IWorkspaceTodayQuery {
  params: IWorkspaceTodayParams;
  result: IWorkspaceTodayResult;
}

const workspaceTodayIR: any = {"usedParamSet":{"timeZone":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":27,"b":36}]}],"statement":"SELECT (now() AT TIME ZONE :timeZone!)::date AS \"today!\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT (now() AT TIME ZONE :timeZone!)::date AS "today!"
 * ```
 */
export const workspaceToday = new PreparedQuery<IWorkspaceTodayParams,IWorkspaceTodayResult>(workspaceTodayIR);


/** 'ListDue' parameters type */
export interface IListDueParams {
  limit: NumberOrString;
  timeZone: string;
  workspaceId: string;
}

/** 'ListDue' return type */
export interface IListDueResult {
  area_name: string | null;
  asset_code: string;
  asset_id: string;
  asset_name: string;
  due_on: string;
  last_performed_on: string | null;
  last_record_id: string | null;
  plan_id: string;
  plan_kind: string;
  plan_title: string;
}

/** 'ListDue' query type */
export interface IListDueQuery {
  params: IListDueParams;
  result: IListDueResult;
}

const listDueIR: any = {"usedParamSet":{"timeZone":true,"workspaceId":true,"limit":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":247,"b":256}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":984,"b":996}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1074,"b":1080}]}],"statement":"-- «Por hacer»: lo que vence hasta dentro de 30 días, de la fecha más antigua a la más nueva, con el\n-- equipo, su área, el plan y el último registro. Quien llama pide una fila más para saber si se cortó.\nWITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)\nSELECT\n  pa.plan_id AS \"plan_id!\", p.title AS plan_title, p.kind AS plan_kind, pa.asset_id AS \"asset_id!\",\n  a.code AS \"asset_code!\", a.name AS \"asset_name!\", area.name AS \"area_name?\", pa.due_on AS \"due_on!\",\n  pa.last_record_id, pa.last_performed_on\nFROM maintenance.plan_assets AS pa\nCROSS JOIN today\nJOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id\nJOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id\nLEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id\nLEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id\nWHERE pa.workspace_id = :workspaceId! AND pa.due_on <= today.d + 30\nORDER BY pa.due_on, lower(a.code), p.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- «Por hacer»: lo que vence hasta dentro de 30 días, de la fecha más antigua a la más nueva, con el
 * -- equipo, su área, el plan y el último registro. Quien llama pide una fila más para saber si se cortó.
 * WITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)
 * SELECT
 *   pa.plan_id AS "plan_id!", p.title AS plan_title, p.kind AS plan_kind, pa.asset_id AS "asset_id!",
 *   a.code AS "asset_code!", a.name AS "asset_name!", area.name AS "area_name?", pa.due_on AS "due_on!",
 *   pa.last_record_id, pa.last_performed_on
 * FROM maintenance.plan_assets AS pa
 * CROSS JOIN today
 * JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
 * JOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id
 * LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
 * WHERE pa.workspace_id = :workspaceId! AND pa.due_on <= today.d + 30
 * ORDER BY pa.due_on, lower(a.code), p.id
 * LIMIT :limit!
 * ```
 */
export const listDue = new PreparedQuery<IListDueParams,IListDueResult>(listDueIR);


/** 'DueCounts' parameters type */
export interface IDueCountsParams {
  timeZone: string;
  workspaceId: string;
}

/** 'DueCounts' return type */
export interface IDueCountsResult {
  next30: number;
  overdue: number;
  today: string;
}

/** 'DueCounts' query type */
export interface IDueCountsQuery {
  params: IDueCountsParams;
  result: IDueCountsResult;
}

const dueCountsIR: any = {"usedParamSet":{"timeZone":true,"workspaceId":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":144,"b":153}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":417,"b":429}]}],"statement":"-- Las cifras del Resumen: vencidos (antes de hoy) y los que tocan desde hoy hasta dentro de 30 días.\nWITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)\nSELECT today.d AS \"today!\",\n       count(*) FILTER (WHERE pa.due_on < today.d)::integer AS \"overdue!\",\n       count(*) FILTER (WHERE pa.due_on >= today.d)::integer AS \"next30!\"\nFROM today\nLEFT JOIN maintenance.plan_assets AS pa ON pa.workspace_id = :workspaceId! AND pa.due_on <= today.d + 30\nGROUP BY today.d"};

/**
 * Query generated from SQL:
 * ```
 * -- Las cifras del Resumen: vencidos (antes de hoy) y los que tocan desde hoy hasta dentro de 30 días.
 * WITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)
 * SELECT today.d AS "today!",
 *        count(*) FILTER (WHERE pa.due_on < today.d)::integer AS "overdue!",
 *        count(*) FILTER (WHERE pa.due_on >= today.d)::integer AS "next30!"
 * FROM today
 * LEFT JOIN maintenance.plan_assets AS pa ON pa.workspace_id = :workspaceId! AND pa.due_on <= today.d + 30
 * GROUP BY today.d
 * ```
 */
export const dueCounts = new PreparedQuery<IDueCountsParams,IDueCountsResult>(dueCountsIR);


/** 'FindAssets' parameters type */
export interface IFindAssetsParams {
  assetId?: string | null | void;
  code?: string | null | void;
  q?: string | null | void;
  workspaceId: string;
}

/** 'FindAssets' return type */
export interface IFindAssetsResult {
  area_name: string | null;
  code: string;
  condition: string;
  id: string;
  name: string;
}

/** 'FindAssets' query type */
export interface IFindAssetsQuery {
  params: IFindAssetsParams;
  result: IFindAssetsResult;
}

const findAssetsIR: any = {"usedParamSet":{"q":true,"workspaceId":true,"assetId":true,"code":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":349,"b":350}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":860,"b":872}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":890,"b":897},{"a":955,"b":962}]},{"name":"code","required":false,"transform":{"type":"scalar"},"locs":[{"a":981,"b":985},{"a":1026,"b":1030}]}],"statement":"-- «Registrar mantenimiento»: hasta 20 equipos no dados de baja cuyo código o nombre contiene :q, plegado\n-- como en el inventario (ADR 0015), o con el código :code sin mayúsculas. Con :assetId, ese equipo,\n-- también dado de baja (la ficha). Quien llama pasa uno de los tres.\nWITH search AS (\n  SELECT '%' || replace(replace(replace(core.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n)\nSELECT a.id AS \"id!\", a.code AS \"code!\", a.name AS \"name!\", a.condition AS \"condition!\", area.name AS \"area_name?\"\nFROM equipment.asset_directory AS a\nCROSS JOIN search\nLEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id\nLEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id\nWHERE a.workspace_id = :workspaceId!\n  AND CASE WHEN :assetId::uuid IS NULL THEN a.condition <> 'retired' ELSE a.id = :assetId::uuid END\n  AND (:code::text IS NULL OR lower(a.code) = lower(:code::text))\n  AND (search.pattern IS NULL OR core.fold_text(a.code || ' ' || a.name) LIKE search.pattern)\nORDER BY lower(a.code), a.id\nLIMIT 20"};

/**
 * Query generated from SQL:
 * ```
 * -- «Registrar mantenimiento»: hasta 20 equipos no dados de baja cuyo código o nombre contiene :q, plegado
 * -- como en el inventario (ADR 0015), o con el código :code sin mayúsculas. Con :assetId, ese equipo,
 * -- también dado de baja (la ficha). Quien llama pasa uno de los tres.
 * WITH search AS (
 *   SELECT '%' || replace(replace(replace(core.fold_text(:q::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * )
 * SELECT a.id AS "id!", a.code AS "code!", a.name AS "name!", a.condition AS "condition!", area.name AS "area_name?"
 * FROM equipment.asset_directory AS a
 * CROSS JOIN search
 * LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
 * WHERE a.workspace_id = :workspaceId!
 *   AND CASE WHEN :assetId::uuid IS NULL THEN a.condition <> 'retired' ELSE a.id = :assetId::uuid END
 *   AND (:code::text IS NULL OR lower(a.code) = lower(:code::text))
 *   AND (search.pattern IS NULL OR core.fold_text(a.code || ' ' || a.name) LIKE search.pattern)
 * ORDER BY lower(a.code), a.id
 * LIMIT 20
 * ```
 */
export const findAssets = new PreparedQuery<IFindAssetsParams,IFindAssetsResult>(findAssetsIR);


/** 'AssetPlans' parameters type */
export interface IAssetPlansParams {
  assetId: string;
  workspaceId: string;
}

/** 'AssetPlans' return type */
export interface IAssetPlansResult {
  due_on: string;
  kind: string;
  last_performed_on: string | null;
  plan_id: string;
  title: string;
}

/** 'AssetPlans' query type */
export interface IAssetPlansQuery {
  params: IAssetPlansParams;
  result: IAssetPlansResult;
}

const assetPlansIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":325,"b":337}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":357,"b":365}]}],"statement":"-- Los planes que cubren al equipo, de la próxima fecha más cercana a la más lejana.\nSELECT pa.plan_id AS \"plan_id!\", p.title, p.kind, pa.due_on AS \"due_on!\", pa.last_performed_on\nFROM maintenance.plan_assets AS pa\nJOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id\nWHERE pa.workspace_id = :workspaceId! AND pa.asset_id = :assetId!\nORDER BY pa.due_on, p.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los planes que cubren al equipo, de la próxima fecha más cercana a la más lejana.
 * SELECT pa.plan_id AS "plan_id!", p.title, p.kind, pa.due_on AS "due_on!", pa.last_performed_on
 * FROM maintenance.plan_assets AS pa
 * JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
 * WHERE pa.workspace_id = :workspaceId! AND pa.asset_id = :assetId!
 * ORDER BY pa.due_on, p.id
 * ```
 */
export const assetPlans = new PreparedQuery<IAssetPlansParams,IAssetPlansResult>(assetPlansIR);


/** 'AssetExclusions' parameters type */
export interface IAssetExclusionsParams {
  assetId: string;
  workspaceId: string;
}

/** 'AssetExclusions' return type */
export interface IAssetExclusionsResult {
  created_at: Date;
  id: string;
  kind: string;
  reason: string;
  title: string;
}

/** 'AssetExclusions' query type */
export interface IAssetExclusionsQuery {
  params: IAssetExclusionsParams;
  result: IAssetExclusionsResult;
}

const assetExclusionsIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":318,"b":330}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":349,"b":357}]}],"statement":"-- Los planes activos de su tipo de los que el equipo está excluido, con el motivo, del más reciente al\n-- más antiguo.\nSELECT p.id, p.title, p.kind, x.reason, x.created_at\nFROM maintenance.plan_exclusions AS x\nJOIN maintenance.plans AS p ON p.workspace_id = x.workspace_id AND p.id = x.plan_id\nWHERE x.workspace_id = :workspaceId! AND x.asset_id = :assetId! AND x.archived_at IS NULL\n  AND p.archived_at IS NULL\nORDER BY x.created_at DESC, p.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los planes activos de su tipo de los que el equipo está excluido, con el motivo, del más reciente al
 * -- más antiguo.
 * SELECT p.id, p.title, p.kind, x.reason, x.created_at
 * FROM maintenance.plan_exclusions AS x
 * JOIN maintenance.plans AS p ON p.workspace_id = x.workspace_id AND p.id = x.plan_id
 * WHERE x.workspace_id = :workspaceId! AND x.asset_id = :assetId! AND x.archived_at IS NULL
 *   AND p.archived_at IS NULL
 * ORDER BY x.created_at DESC, p.id
 * ```
 */
export const assetExclusions = new PreparedQuery<IAssetExclusionsParams,IAssetExclusionsResult>(assetExclusionsIR);


/** 'NextDueByAsset' parameters type */
export interface INextDueByAssetParams {
  assetIds: stringArray;
  workspaceId: string;
}

/** 'NextDueByAsset' return type */
export interface INextDueByAssetResult {
  asset_id: string;
  due_on: string;
  kind: string;
  plan_id: string;
  title: string;
}

/** 'NextDueByAsset' query type */
export interface INextDueByAssetQuery {
  params: INextDueByAssetParams;
  result: INextDueByAssetResult;
}

const nextDueByAssetIR: any = {"usedParamSet":{"workspaceId":true,"assetIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":369,"b":381}]},{"name":"assetIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":406,"b":415}]}],"statement":"-- La columna «Próximo mantenimiento» del Inventario: la fecha más cercana de cada equipo de :assetIds.\nSELECT DISTINCT ON (pa.asset_id)\n  pa.asset_id AS \"asset_id!\", pa.due_on AS \"due_on!\", p.id AS plan_id, p.title, p.kind\nFROM maintenance.plan_assets AS pa\nJOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id\nWHERE pa.workspace_id = :workspaceId! AND pa.asset_id = ANY (:assetIds!::uuid[])\nORDER BY pa.asset_id, pa.due_on, p.id"};

/**
 * Query generated from SQL:
 * ```
 * -- La columna «Próximo mantenimiento» del Inventario: la fecha más cercana de cada equipo de :assetIds.
 * SELECT DISTINCT ON (pa.asset_id)
 *   pa.asset_id AS "asset_id!", pa.due_on AS "due_on!", p.id AS plan_id, p.title, p.kind
 * FROM maintenance.plan_assets AS pa
 * JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
 * WHERE pa.workspace_id = :workspaceId! AND pa.asset_id = ANY (:assetIds!::uuid[])
 * ORDER BY pa.asset_id, pa.due_on, p.id
 * ```
 */
export const nextDueByAsset = new PreparedQuery<INextDueByAssetParams,INextDueByAssetResult>(nextDueByAssetIR);


