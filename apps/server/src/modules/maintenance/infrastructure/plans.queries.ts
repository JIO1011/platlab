/** Types generated for queries found in "src/modules/maintenance/infrastructure/plans.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type stringArray = (string)[];

/** 'ListPlans' parameters type */
export interface IListPlansParams {
  planId?: string | null | void;
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

const listPlansIR: any = {"usedParamSet":{"workspaceId":true,"planId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1480,"b":1492}]},{"name":"planId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1510,"b":1516},{"a":1571,"b":1577}]}],"statement":"-- Los activos por título, con su alcance, cuántos equipos cubren hoy (plan_assets) y sus exclusiones\n-- activas por código del equipo; con :planId, ese plan aunque esté archivado (la respuesta de un comando).\n-- El tipo y el equipo se leen por las vistas de Equipos (ADR 0020).\nSELECT\n  p.id, p.kind, p.title, p.asset_type_id, t.name AS \"type_name?\", p.asset_id, a.code AS \"asset_code?\",\n  a.name AS \"asset_name?\", p.interval_count, p.interval_unit, p.starts_on, p.checklist, p.acceptance_criteria,\n  p.archived_at, p.version,\n  (SELECT count(*) FROM maintenance.plan_assets AS pa\n    WHERE pa.workspace_id = p.workspace_id AND pa.plan_id = p.id)::integer AS \"asset_count!\",\n  coalesce((\n    SELECT jsonb_agg(\n             jsonb_build_object(\n               'asset', jsonb_build_object('id', xa.id, 'code', xa.code, 'name', xa.name),\n               'reason', x.reason,\n               'createdAt', x.created_at)\n             ORDER BY lower(xa.code), xa.id)\n    FROM maintenance.plan_exclusions AS x\n    JOIN equipment.asset_directory AS xa ON xa.workspace_id = x.workspace_id AND xa.id = x.asset_id\n    WHERE x.workspace_id = p.workspace_id AND x.plan_id = p.id AND x.archived_at IS NULL\n  ), '[]'::jsonb) AS \"exclusions!\"\nFROM maintenance.plans AS p\nLEFT JOIN equipment.asset_type_directory AS t ON t.workspace_id = p.workspace_id AND t.id = p.asset_type_id\nLEFT JOIN equipment.asset_directory AS a ON a.workspace_id = p.workspace_id AND a.id = p.asset_id\nWHERE p.workspace_id = :workspaceId!\n  AND CASE WHEN :planId::uuid IS NULL THEN p.archived_at IS NULL ELSE p.id = :planId::uuid END\nORDER BY core.fold_text(p.title), p.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los activos por título, con su alcance, cuántos equipos cubren hoy (plan_assets) y sus exclusiones
 * -- activas por código del equipo; con :planId, ese plan aunque esté archivado (la respuesta de un comando).
 * -- El tipo y el equipo se leen por las vistas de Equipos (ADR 0020).
 * SELECT
 *   p.id, p.kind, p.title, p.asset_type_id, t.name AS "type_name?", p.asset_id, a.code AS "asset_code?",
 *   a.name AS "asset_name?", p.interval_count, p.interval_unit, p.starts_on, p.checklist, p.acceptance_criteria,
 *   p.archived_at, p.version,
 *   (SELECT count(*) FROM maintenance.plan_assets AS pa
 *     WHERE pa.workspace_id = p.workspace_id AND pa.plan_id = p.id)::integer AS "asset_count!",
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

const insertExclusionIR: any = {"usedParamSet":{"workspaceId":true,"planId":true,"assetTypeId":true,"assetId":true,"reason":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":234,"b":246}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":249,"b":256}]},{"name":"assetTypeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":259,"b":271}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":274,"b":282}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":285,"b":292}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":295,"b":305}]}],"statement":"-- Una exclusión activa del mismo equipo (plan_exclusions_active) no inserta nada: el comando responde.\nINSERT INTO maintenance.plan_exclusions (workspace_id, plan_id, asset_type_id, asset_id, reason, created_by_principal_id)\nVALUES (:workspaceId!, :planId!, :assetTypeId!, :assetId!, :reason!, :createdBy!)\nON CONFLICT (workspace_id, plan_id, asset_id) WHERE archived_at IS NULL DO NOTHING\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Una exclusión activa del mismo equipo (plan_exclusions_active) no inserta nada: el comando responde.
 * INSERT INTO maintenance.plan_exclusions (workspace_id, plan_id, asset_type_id, asset_id, reason, created_by_principal_id)
 * VALUES (:workspaceId!, :planId!, :assetTypeId!, :assetId!, :reason!, :createdBy!)
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


