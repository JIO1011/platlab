/** Types generated for queries found in "src/modules/maintenance/infrastructure/plans.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type stringArray = (string)[];

/** 'ListPlans' parameters type */
export interface IListPlansParams {
  planId?: string | null | void;
  timeZone: string;
  workspaceId: string;
}

/** 'ListPlans' return type */
export interface IListPlansResult {
  acceptance_criteria: string | null;
  archived_at: Date | null;
  asset_code: string | null;
  asset_count: number;
  asset_id: string | null;
  asset_name: string | null;
  asset_type_id: string | null;
  checklist: stringArray;
  exclusions: Json;
  id: string;
  interval_count: number;
  interval_unit: string;
  kind: string;
  next_due_on: string | null;
  overdue_count: number;
  starts_on: string;
  title: string;
  type_name: string | null;
  version: number;
}

/** 'ListPlans' query type */
export interface IListPlansQuery {
  params: IListPlansParams;
  result: IListPlansResult;
}

const listPlansIR: any = {"usedParamSet":{"timeZone":true,"workspaceId":true,"planId":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":1695,"b":1704}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1911,"b":1923}]},{"name":"planId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1941,"b":1947},{"a":2002,"b":2008}]}],"statement":"-- Los activos por título, con su alcance, los equipos que cubren hoy (plan_assets: cuántos, la fecha más\n-- cercana y cuántos están vencidos o no conformes, en la zona del espacio) y sus exclusiones activas por\n-- código del equipo; con :planId, ese plan aunque esté archivado (la respuesta de un comando). El tipo y\n-- el equipo se leen por las vistas de Equipos (ADR 0020).\nSELECT\n  p.id, p.kind, p.title, p.asset_type_id, t.name AS \"type_name?\", p.asset_id, a.code AS \"asset_code?\",\n  a.name AS \"asset_name?\", p.interval_count, p.interval_unit, p.starts_on, p.checklist, p.acceptance_criteria,\n  p.archived_at, p.version, cover.asset_count AS \"asset_count!\", cover.next_due_on AS \"next_due_on?\",\n  cover.overdue_count AS \"overdue_count!\",\n  coalesce((\n    SELECT jsonb_agg(\n             jsonb_build_object(\n               'asset', jsonb_build_object('id', xa.id, 'code', xa.code, 'name', xa.name),\n               'reason', x.reason,\n               'createdAt', x.created_at)\n             ORDER BY lower(xa.code), xa.id)\n    FROM maintenance.plan_exclusions AS x\n    JOIN equipment.asset_directory AS xa ON xa.workspace_id = x.workspace_id AND xa.id = x.asset_id\n    WHERE x.workspace_id = p.workspace_id AND x.plan_id = p.id AND x.archived_at IS NULL\n  ), '[]'::jsonb) AS \"exclusions!\"\nFROM maintenance.plans AS p\nLEFT JOIN equipment.asset_type_directory AS t ON t.workspace_id = p.workspace_id AND t.id = p.asset_type_id\nLEFT JOIN equipment.asset_directory AS a ON a.workspace_id = p.workspace_id AND a.id = p.asset_id\nCROSS JOIN LATERAL (\n  SELECT count(*)::integer AS asset_count, min(pa.due_on) AS next_due_on,\n         count(*) FILTER (\n           WHERE pa.due_on < (now() AT TIME ZONE :timeZone!)::date OR pa.last_result = 'fail'\n         )::integer AS overdue_count\n  FROM maintenance.plan_assets AS pa\n  WHERE pa.workspace_id = p.workspace_id AND pa.plan_id = p.id\n) AS cover\nWHERE p.workspace_id = :workspaceId!\n  AND CASE WHEN :planId::uuid IS NULL THEN p.archived_at IS NULL ELSE p.id = :planId::uuid END\nORDER BY core.fold_text(p.title), p.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los activos por título, con su alcance, los equipos que cubren hoy (plan_assets: cuántos, la fecha más
 * -- cercana y cuántos están vencidos o no conformes, en la zona del espacio) y sus exclusiones activas por
 * -- código del equipo; con :planId, ese plan aunque esté archivado (la respuesta de un comando). El tipo y
 * -- el equipo se leen por las vistas de Equipos (ADR 0020).
 * SELECT
 *   p.id, p.kind, p.title, p.asset_type_id, t.name AS "type_name?", p.asset_id, a.code AS "asset_code?",
 *   a.name AS "asset_name?", p.interval_count, p.interval_unit, p.starts_on, p.checklist, p.acceptance_criteria,
 *   p.archived_at, p.version, cover.asset_count AS "asset_count!", cover.next_due_on AS "next_due_on?",
 *   cover.overdue_count AS "overdue_count!",
 *   coalesce((
 *     SELECT jsonb_agg(
 *              jsonb_build_object(
 *                'asset', jsonb_build_object('id', xa.id, 'code', xa.code, 'name', xa.name),
 *                'reason', x.reason,
 *                'createdAt', x.created_at)
 *              ORDER BY lower(xa.code), xa.id)
 *     FROM maintenance.plan_exclusions AS x
 *     JOIN equipment.asset_directory AS xa ON xa.workspace_id = x.workspace_id AND xa.id = x.asset_id
 *     WHERE x.workspace_id = p.workspace_id AND x.plan_id = p.id AND x.archived_at IS NULL
 *   ), '[]'::jsonb) AS "exclusions!"
 * FROM maintenance.plans AS p
 * LEFT JOIN equipment.asset_type_directory AS t ON t.workspace_id = p.workspace_id AND t.id = p.asset_type_id
 * LEFT JOIN equipment.asset_directory AS a ON a.workspace_id = p.workspace_id AND a.id = p.asset_id
 * CROSS JOIN LATERAL (
 *   SELECT count(*)::integer AS asset_count, min(pa.due_on) AS next_due_on,
 *          count(*) FILTER (
 *            WHERE pa.due_on < (now() AT TIME ZONE :timeZone!)::date OR pa.last_result = 'fail'
 *          )::integer AS overdue_count
 *   FROM maintenance.plan_assets AS pa
 *   WHERE pa.workspace_id = p.workspace_id AND pa.plan_id = p.id
 * ) AS cover
 * WHERE p.workspace_id = :workspaceId!
 *   AND CASE WHEN :planId::uuid IS NULL THEN p.archived_at IS NULL ELSE p.id = :planId::uuid END
 * ORDER BY core.fold_text(p.title), p.id
 * ```
 */
export const listPlans = new PreparedQuery<IListPlansParams,IListPlansResult>(listPlansIR);


/** 'UncoveredAssets' parameters type */
export interface IUncoveredAssetsParams {
  workspaceId: string;
}

/** 'UncoveredAssets' return type */
export interface IUncoveredAssetsResult {
  code: string;
  id: string;
  name: string;
  total: number;
}

/** 'UncoveredAssets' query type */
export interface IUncoveredAssetsQuery {
  params: IUncoveredAssetsParams;
  result: IUncoveredAssetsResult;
}

const uncoveredAssetsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":312,"b":324}]}],"statement":"-- Cobertura (ADR 0020): los equipos no dados de baja que ningún plan activo cubre (plan_assets), los\n-- primeros 50 por código; cada fila lleva el total.\nSELECT a.id AS \"id!\", a.code AS \"code!\", a.name AS \"name!\", count(*) OVER ()::integer AS \"total!\"\nFROM equipment.asset_directory AS a\nWHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'\n  AND NOT EXISTS (\n    SELECT 1 FROM maintenance.plan_assets AS pa WHERE pa.workspace_id = a.workspace_id AND pa.asset_id = a.id\n  )\nORDER BY lower(a.code), a.id\nLIMIT 50"};

/**
 * Query generated from SQL:
 * ```
 * -- Cobertura (ADR 0020): los equipos no dados de baja que ningún plan activo cubre (plan_assets), los
 * -- primeros 50 por código; cada fila lleva el total.
 * SELECT a.id AS "id!", a.code AS "code!", a.name AS "name!", count(*) OVER ()::integer AS "total!"
 * FROM equipment.asset_directory AS a
 * WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'
 *   AND NOT EXISTS (
 *     SELECT 1 FROM maintenance.plan_assets AS pa WHERE pa.workspace_id = a.workspace_id AND pa.asset_id = a.id
 *   )
 * ORDER BY lower(a.code), a.id
 * LIMIT 50
 * ```
 */
export const uncoveredAssets = new PreparedQuery<IUncoveredAssetsParams,IUncoveredAssetsResult>(uncoveredAssetsIR);


/** 'ActiveAssetType' parameters type */
export interface IActiveAssetTypeParams {
  typeId: string;
  workspaceId: string;
}

/** 'ActiveAssetType' return type */
export interface IActiveAssetTypeResult {
  archived_at: Date | null;
}

/** 'ActiveAssetType' query type */
export interface IActiveAssetTypeQuery {
  params: IActiveAssetTypeParams;
  result: IActiveAssetTypeResult;
}

const activeAssetTypeIR: any = {"usedParamSet":{"workspaceId":true,"typeId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":139}]},{"name":"typeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":150,"b":157}]}],"statement":"-- El tipo de un plan nuevo: del espacio y activo.\nSELECT archived_at FROM equipment.asset_type_directory WHERE workspace_id = :workspaceId! AND id = :typeId!"};

/**
 * Query generated from SQL:
 * ```
 * -- El tipo de un plan nuevo: del espacio y activo.
 * SELECT archived_at FROM equipment.asset_type_directory WHERE workspace_id = :workspaceId! AND id = :typeId!
 * ```
 */
export const activeAssetType = new PreparedQuery<IActiveAssetTypeParams,IActiveAssetTypeResult>(activeAssetTypeIR);


/** 'DirectoryAsset' parameters type */
export interface IDirectoryAssetParams {
  assetId: string;
  workspaceId: string;
}

/** 'DirectoryAsset' return type */
export interface IDirectoryAssetResult {
  condition: string;
  id: string;
  type_id: string;
}

/** 'DirectoryAsset' query type */
export interface IDirectoryAssetQuery {
  params: IDirectoryAssetParams;
  result: IDirectoryAssetResult;
}

const directoryAssetIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":210,"b":222}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":233,"b":241}]}],"statement":"-- Un equipo del espacio por la vista de Equipos (ADR 0020), con su tipo y su condición.\nSELECT id AS \"id!\", type_id AS \"type_id!\", condition AS \"condition!\"\nFROM equipment.asset_directory\nWHERE workspace_id = :workspaceId! AND id = :assetId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Un equipo del espacio por la vista de Equipos (ADR 0020), con su tipo y su condición.
 * SELECT id AS "id!", type_id AS "type_id!", condition AS "condition!"
 * FROM equipment.asset_directory
 * WHERE workspace_id = :workspaceId! AND id = :assetId!
 * ```
 */
export const directoryAsset = new PreparedQuery<IDirectoryAssetParams,IDirectoryAssetResult>(directoryAssetIR);


/** 'InsertPlan' parameters type */
export interface IInsertPlanParams {
  acceptanceCriteria?: string | null | void;
  assetId?: string | null | void;
  assetTypeId?: string | null | void;
  checklist: stringArray;
  createdBy: string;
  intervalCount: number;
  intervalUnit: string;
  kind: string;
  startsOn: string;
  title: string;
  workspaceId: string;
}

/** 'InsertPlan' return type */
export interface IInsertPlanResult {
  id: string;
}

/** 'InsertPlan' query type */
export interface IInsertPlanQuery {
  params: IInsertPlanParams;
  result: IInsertPlanResult;
}

const insertPlanIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"title":true,"assetTypeId":true,"assetId":true,"intervalCount":true,"intervalUnit":true,"startsOn":true,"checklist":true,"acceptanceCriteria":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":199,"b":211}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":214,"b":219}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":222,"b":228}]},{"name":"assetTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":231,"b":242}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":252}]},{"name":"intervalCount","required":true,"transform":{"type":"scalar"},"locs":[{"a":255,"b":269}]},{"name":"intervalUnit","required":true,"transform":{"type":"scalar"},"locs":[{"a":272,"b":285}]},{"name":"startsOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":288,"b":297}]},{"name":"checklist","required":true,"transform":{"type":"scalar"},"locs":[{"a":308,"b":318}]},{"name":"acceptanceCriteria","required":false,"transform":{"type":"scalar"},"locs":[{"a":329,"b":347}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":350,"b":360}]}],"statement":"INSERT INTO maintenance.plans (\n  workspace_id, kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, checklist,\n  acceptance_criteria, created_by_principal_id\n)\nVALUES (\n  :workspaceId!, :kind!, :title!, :assetTypeId, :assetId, :intervalCount!, :intervalUnit!, :startsOn!::date,\n  :checklist!::text[], :acceptanceCriteria, :createdBy!\n)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO maintenance.plans (
 *   workspace_id, kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, checklist,
 *   acceptance_criteria, created_by_principal_id
 * )
 * VALUES (
 *   :workspaceId!, :kind!, :title!, :assetTypeId, :assetId, :intervalCount!, :intervalUnit!, :startsOn!::date,
 *   :checklist!::text[], :acceptanceCriteria, :createdBy!
 * )
 * RETURNING id
 * ```
 */
export const insertPlan = new PreparedQuery<IInsertPlanParams,IInsertPlanResult>(insertPlanIR);


/** 'LockPlan' parameters type */
export interface ILockPlanParams {
  planId: string;
  workspaceId: string;
}

/** 'LockPlan' return type */
export interface ILockPlanResult {
  acceptance_criteria: string | null;
  archived_at: Date | null;
  asset_id: string | null;
  asset_type_id: string | null;
  checklist: stringArray;
  interval_count: number;
  interval_unit: string;
  kind: string;
  starts_on: string;
  title: string;
  version: number;
}

/** 'LockPlan' query type */
export interface ILockPlanQuery {
  params: ILockPlanParams;
  result: ILockPlanResult;
}

const lockPlanIR: any = {"usedParamSet":{"workspaceId":true,"planId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":293,"b":305}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":316,"b":323}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): el plan que se edita, se archiva o cambia sus exclusiones.\nSELECT kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, checklist,\n       acceptance_criteria, archived_at, version\nFROM maintenance.plans\nWHERE workspace_id = :workspaceId! AND id = :planId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): el plan que se edita, se archiva o cambia sus exclusiones.
 * SELECT kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, checklist,
 *        acceptance_criteria, archived_at, version
 * FROM maintenance.plans
 * WHERE workspace_id = :workspaceId! AND id = :planId!
 * FOR UPDATE
 * ```
 */
export const lockPlan = new PreparedQuery<ILockPlanParams,ILockPlanResult>(lockPlanIR);


/** 'UpdatePlan' parameters type */
export interface IUpdatePlanParams {
  acceptanceCriteria?: string | null | void;
  checklist: stringArray;
  intervalCount: number;
  intervalUnit: string;
  planId: string;
  startsOn: string;
  title: string;
  workspaceId: string;
}

/** 'UpdatePlan' return type */
export type IUpdatePlanResult = void;

/** 'UpdatePlan' query type */
export interface IUpdatePlanQuery {
  params: IUpdatePlanParams;
  result: IUpdatePlanResult;
}

const updatePlanIR: any = {"usedParamSet":{"title":true,"intervalCount":true,"intervalUnit":true,"startsOn":true,"checklist":true,"acceptanceCriteria":true,"workspaceId":true,"planId":true},"params":[{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":137}]},{"name":"intervalCount","required":true,"transform":{"type":"scalar"},"locs":[{"a":157,"b":171}]},{"name":"intervalUnit","required":true,"transform":{"type":"scalar"},"locs":[{"a":190,"b":203}]},{"name":"startsOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":218,"b":227}]},{"name":"checklist","required":true,"transform":{"type":"scalar"},"locs":[{"a":252,"b":262}]},{"name":"acceptanceCriteria","required":false,"transform":{"type":"scalar"},"locs":[{"a":295,"b":313}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":359,"b":371}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":382,"b":389}]}],"statement":"-- Escribe el plan ya combinado y sube la versión; el comando lo edita con el plan bloqueado.\nUPDATE maintenance.plans\nSET title = :title!, interval_count = :intervalCount!, interval_unit = :intervalUnit!, starts_on = :startsOn!::date,\n    checklist = :checklist!::text[], acceptance_criteria = :acceptanceCriteria, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :planId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Escribe el plan ya combinado y sube la versión; el comando lo edita con el plan bloqueado.
 * UPDATE maintenance.plans
 * SET title = :title!, interval_count = :intervalCount!, interval_unit = :intervalUnit!, starts_on = :startsOn!::date,
 *     checklist = :checklist!::text[], acceptance_criteria = :acceptanceCriteria, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :planId!
 * ```
 */
export const updatePlan = new PreparedQuery<IUpdatePlanParams,IUpdatePlanResult>(updatePlanIR);


/** 'ArchivePlan' parameters type */
export interface IArchivePlanParams {
  planId: string;
  workspaceId: string;
}

/** 'ArchivePlan' return type */
export type IArchivePlanResult = void;

/** 'ArchivePlan' query type */
export interface IArchivePlanQuery {
  params: IArchivePlanParams;
  result: IArchivePlanResult;
}

const archivePlanIR: any = {"usedParamSet":{"workspaceId":true,"planId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":162,"b":174}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":185,"b":192}]}],"statement":"-- Los registros hechos con él lo conservan; deja de cubrir equipos.\nUPDATE maintenance.plans\nSET archived_at = now(), version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :planId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Los registros hechos con él lo conservan; deja de cubrir equipos.
 * UPDATE maintenance.plans
 * SET archived_at = now(), version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :planId!
 * ```
 */
export const archivePlan = new PreparedQuery<IArchivePlanParams,IArchivePlanResult>(archivePlanIR);


/** 'InsertExclusion' parameters type */
export interface IInsertExclusionParams {
  assetId: string;
  assetTypeId: string;
  createdBy: string;
  planId: string;
  reason: string;
  replacedBy?: string | null | void;
  workspaceId: string;
}

/** 'InsertExclusion' return type */
export interface IInsertExclusionResult {
  id: string;
}

/** 'InsertExclusion' query type */
export interface IInsertExclusionQuery {
  params: IInsertExclusionParams;
  result: IInsertExclusionResult;
}

const insertExclusionIR: any = {"usedParamSet":{"workspaceId":true,"planId":true,"assetTypeId":true,"assetId":true,"reason":true,"replacedBy":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":307,"b":319}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":322,"b":329}]},{"name":"assetTypeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":332,"b":344}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":347,"b":355}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":358,"b":365}]},{"name":"replacedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":378}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":381,"b":391}]}],"statement":"-- Una exclusión activa del mismo equipo (plan_exclusions_active) no inserta nada: el comando responde.\n-- Con :replacedBy, el plan propio que la crea.\nINSERT INTO maintenance.plan_exclusions (\n  workspace_id, plan_id, asset_type_id, asset_id, reason, replaced_by_plan_id, created_by_principal_id\n)\nVALUES (:workspaceId!, :planId!, :assetTypeId!, :assetId!, :reason!, :replacedBy, :createdBy!)\nON CONFLICT (workspace_id, plan_id, asset_id) WHERE archived_at IS NULL DO NOTHING\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Una exclusión activa del mismo equipo (plan_exclusions_active) no inserta nada: el comando responde.
 * -- Con :replacedBy, el plan propio que la crea.
 * INSERT INTO maintenance.plan_exclusions (
 *   workspace_id, plan_id, asset_type_id, asset_id, reason, replaced_by_plan_id, created_by_principal_id
 * )
 * VALUES (:workspaceId!, :planId!, :assetTypeId!, :assetId!, :reason!, :replacedBy, :createdBy!)
 * ON CONFLICT (workspace_id, plan_id, asset_id) WHERE archived_at IS NULL DO NOTHING
 * RETURNING id
 * ```
 */
export const insertExclusion = new PreparedQuery<IInsertExclusionParams,IInsertExclusionResult>(insertExclusionIR);


/** 'ArchiveExclusion' parameters type */
export interface IArchiveExclusionParams {
  assetId: string;
  planId: string;
  workspaceId: string;
}

/** 'ArchiveExclusion' return type */
export interface IArchiveExclusionResult {
  id: string;
}

/** 'ArchiveExclusion' query type */
export interface IArchiveExclusionQuery {
  params: IArchiveExclusionParams;
  result: IArchiveExclusionResult;
}

const archiveExclusionIR: any = {"usedParamSet":{"workspaceId":true,"planId":true,"assetId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":142,"b":154}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":170,"b":177}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":194,"b":202}]}],"statement":"-- El equipo vuelve a quedar cubierto por el plan de su tipo.\nUPDATE maintenance.plan_exclusions\nSET archived_at = now()\nWHERE workspace_id = :workspaceId! AND plan_id = :planId! AND asset_id = :assetId! AND archived_at IS NULL\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- El equipo vuelve a quedar cubierto por el plan de su tipo.
 * UPDATE maintenance.plan_exclusions
 * SET archived_at = now()
 * WHERE workspace_id = :workspaceId! AND plan_id = :planId! AND asset_id = :assetId! AND archived_at IS NULL
 * RETURNING id
 * ```
 */
export const archiveExclusion = new PreparedQuery<IArchiveExclusionParams,IArchiveExclusionResult>(archiveExclusionIR);


/** 'ArchiveReplacedExclusions' parameters type */
export interface IArchiveReplacedExclusionsParams {
  planId: string;
  workspaceId: string;
}

/** 'ArchiveReplacedExclusions' return type */
export interface IArchiveReplacedExclusionsResult {
  asset_id: string;
  plan_id: string;
}

/** 'ArchiveReplacedExclusions' query type */
export interface IArchiveReplacedExclusionsQuery {
  params: IArchiveReplacedExclusionsParams;
  result: IArchiveReplacedExclusionsResult;
}

const archiveReplacedExclusionsIR: any = {"usedParamSet":{"workspaceId":true,"planId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":188,"b":200}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":228,"b":235}]}],"statement":"-- Al archivar un plan propio, sus equipos vuelven al plan de su tipo (índice plan_exclusions_replaced_by).\nUPDATE maintenance.plan_exclusions\nSET archived_at = now()\nWHERE workspace_id = :workspaceId! AND replaced_by_plan_id = :planId! AND archived_at IS NULL\nRETURNING plan_id, asset_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Al archivar un plan propio, sus equipos vuelven al plan de su tipo (índice plan_exclusions_replaced_by).
 * UPDATE maintenance.plan_exclusions
 * SET archived_at = now()
 * WHERE workspace_id = :workspaceId! AND replaced_by_plan_id = :planId! AND archived_at IS NULL
 * RETURNING plan_id, asset_id
 * ```
 */
export const archiveReplacedExclusions = new PreparedQuery<IArchiveReplacedExclusionsParams,IArchiveReplacedExclusionsResult>(archiveReplacedExclusionsIR);


/** 'PlanAssets' parameters type */
export interface IPlanAssetsParams {
  planId: string;
  workspaceId: string;
}

/** 'PlanAssets' return type */
export interface IPlanAssetsResult {
  area_name: string | null;
  code: string;
  due_on: string | null;
  id: string;
  last_result: string | null;
  name: string;
  reason: string | null;
  replaced_by_id: string | null;
  replaced_by_kind: string | null;
  replaced_by_title: string | null;
}

/** 'PlanAssets' query type */
export interface IPlanAssetsQuery {
  params: IPlanAssetsParams;
  result: IPlanAssetsResult;
}

const planAssetsIR: any = {"usedParamSet":{"workspaceId":true,"planId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1231,"b":1243}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1256,"b":1263}]}],"statement":"-- Los equipos que alcanza un plan, por código: los no dados de baja de su tipo, o su equipo. Incluidos, con\n-- su próxima fecha (plan_assets); excluidos, con el motivo y el plan propio que los reemplaza.\nSELECT a.id AS \"id!\", a.code AS \"code!\", a.name AS \"name!\", area.name AS \"area_name?\",\n       pa.due_on AS \"due_on?\", pa.last_result AS \"last_result?\",\n       x.reason AS \"reason?\", r.id AS \"replaced_by_id?\", r.title AS \"replaced_by_title?\", r.kind AS \"replaced_by_kind?\"\nFROM maintenance.plans AS p\nJOIN equipment.asset_directory AS a\n  ON a.workspace_id = p.workspace_id AND (a.id = p.asset_id OR a.type_id = p.asset_type_id)\nLEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id\nLEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id\nLEFT JOIN maintenance.plan_assets AS pa ON pa.workspace_id = p.workspace_id AND pa.plan_id = p.id AND pa.asset_id = a.id\nLEFT JOIN maintenance.plan_exclusions AS x\n  ON x.workspace_id = p.workspace_id AND x.plan_id = p.id AND x.asset_id = a.id AND x.archived_at IS NULL\nLEFT JOIN maintenance.plans AS r ON r.workspace_id = x.workspace_id AND r.id = x.replaced_by_plan_id\nWHERE p.workspace_id = :workspaceId! AND p.id = :planId! AND a.condition <> 'retired'\nORDER BY lower(a.code), a.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los equipos que alcanza un plan, por código: los no dados de baja de su tipo, o su equipo. Incluidos, con
 * -- su próxima fecha (plan_assets); excluidos, con el motivo y el plan propio que los reemplaza.
 * SELECT a.id AS "id!", a.code AS "code!", a.name AS "name!", area.name AS "area_name?",
 *        pa.due_on AS "due_on?", pa.last_result AS "last_result?",
 *        x.reason AS "reason?", r.id AS "replaced_by_id?", r.title AS "replaced_by_title?", r.kind AS "replaced_by_kind?"
 * FROM maintenance.plans AS p
 * JOIN equipment.asset_directory AS a
 *   ON a.workspace_id = p.workspace_id AND (a.id = p.asset_id OR a.type_id = p.asset_type_id)
 * LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
 * LEFT JOIN maintenance.plan_assets AS pa ON pa.workspace_id = p.workspace_id AND pa.plan_id = p.id AND pa.asset_id = a.id
 * LEFT JOIN maintenance.plan_exclusions AS x
 *   ON x.workspace_id = p.workspace_id AND x.plan_id = p.id AND x.asset_id = a.id AND x.archived_at IS NULL
 * LEFT JOIN maintenance.plans AS r ON r.workspace_id = x.workspace_id AND r.id = x.replaced_by_plan_id
 * WHERE p.workspace_id = :workspaceId! AND p.id = :planId! AND a.condition <> 'retired'
 * ORDER BY lower(a.code), a.id
 * ```
 */
export const planAssets = new PreparedQuery<IPlanAssetsParams,IPlanAssetsResult>(planAssetsIR);


