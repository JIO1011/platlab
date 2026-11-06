/** Types generated for queries found in "src/modules/labs/infrastructure/practice.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type numberArray = (number)[];

export type stringArray = (string)[];

/** 'LockActivityRequest' parameters type */
export interface ILockActivityRequestParams {
  activityId: string;
  workspaceId: string;
}

/** 'LockActivityRequest' return type */
export interface ILockActivityRequestResult {
  id: string;
  status: string;
}

/** 'LockActivityRequest' query type */
export interface ILockActivityRequestQuery {
  params: ILockActivityRequestParams;
  result: ILockActivityRequestResult;
}

const lockActivityRequestIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":306,"b":318}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":331,"b":342}]}],"statement":"-- Primero la solicitud del bloque, como al programar o liberar (solicitud → bloque): así avanzar una práctica y\n-- cancelar su solicitud no se cruzan.\nSELECT q.id, q.status\nFROM labs.requests AS q\nJOIN labs.activities AS a ON a.workspace_id = q.workspace_id AND a.request_id = q.id\nWHERE a.workspace_id = :workspaceId! AND a.id = :activityId!\nFOR UPDATE OF q"};

/**
 * Query generated from SQL:
 * ```
 * -- Primero la solicitud del bloque, como al programar o liberar (solicitud → bloque): así avanzar una práctica y
 * -- cancelar su solicitud no se cruzan.
 * SELECT q.id, q.status
 * FROM labs.requests AS q
 * JOIN labs.activities AS a ON a.workspace_id = q.workspace_id AND a.request_id = q.id
 * WHERE a.workspace_id = :workspaceId! AND a.id = :activityId!
 * FOR UPDATE OF q
 * ```
 */
export const lockActivityRequest = new PreparedQuery<ILockActivityRequestParams,ILockActivityRequestResult>(lockActivityRequestIR);


/** 'LockPractice' parameters type */
export interface ILockPracticeParams {
  activityId: string;
  workspaceId: string;
}

/** 'LockPractice' return type */
export interface ILockPracticeResult {
  area_name: string;
  cancelled_at: Date | null;
  code: string;
  on_date: string;
  request_id: string;
  stage: string;
  version: number;
}

/** 'LockPractice' query type */
export interface ILockPracticeQuery {
  params: ILockPracticeParams;
  result: ILockPracticeResult;
}

const lockPracticeIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":331,"b":343}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":356,"b":367}]}],"statement":"-- Después, el bloque que avanza: su etapa, su día, su código y su área.\nSELECT a.request_id, a.on_date::text AS \"on_date!\", a.stage, a.version, a.cancelled_at, a.code, area.name AS area_name\nFROM labs.activities AS a\nJOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id\nWHERE a.workspace_id = :workspaceId! AND a.id = :activityId!\nFOR UPDATE OF a"};

/**
 * Query generated from SQL:
 * ```
 * -- Después, el bloque que avanza: su etapa, su día, su código y su área.
 * SELECT a.request_id, a.on_date::text AS "on_date!", a.stage, a.version, a.cancelled_at, a.code, area.name AS area_name
 * FROM labs.activities AS a
 * JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
 * WHERE a.workspace_id = :workspaceId! AND a.id = :activityId!
 * FOR UPDATE OF a
 * ```
 */
export const lockPractice = new PreparedQuery<ILockPracticeParams,ILockPracticeResult>(lockPracticeIR);


/** 'SetPreparedLines' parameters type */
export interface ISetPreparedLinesParams {
  activityId: string;
  lines: numberArray;
  workspaceId: string;
}

/** 'SetPreparedLines' return type */
export type ISetPreparedLinesResult = void;

/** 'SetPreparedLines' query type */
export interface ISetPreparedLinesQuery {
  params: ISetPreparedLinesParams;
  result: ISetPreparedLinesResult;
}

const setPreparedLinesIR: any = {"usedParamSet":{"lines":true,"workspaceId":true,"activityId":true},"params":[{"name":"lines","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":50}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":108,"b":120}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":142}]}],"statement":"UPDATE labs.activities\nSET prepared_lines = :lines!::smallint[], version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :activityId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE labs.activities
 * SET prepared_lines = :lines!::smallint[], version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :activityId!
 * ```
 */
export const setPreparedLines = new PreparedQuery<ISetPreparedLinesParams,ISetPreparedLinesResult>(setPreparedLinesIR);


/** 'AdvanceStage' parameters type */
export interface IAdvanceStageParams {
  activityId: string;
  notes?: string | null | void;
  principalId: string;
  stage: string;
  workspaceId: string;
}

/** 'AdvanceStage' return type */
export type IAdvanceStageResult = void;

/** 'AdvanceStage' query type */
export interface IAdvanceStageQuery {
  params: IAdvanceStageParams;
  result: IAdvanceStageResult;
}

const advanceStageIR: any = {"usedParamSet":{"stage":true,"principalId":true,"notes":true,"workspaceId":true,"activityId":true},"params":[{"name":"stage","required":true,"transform":{"type":"scalar"},"locs":[{"a":126,"b":132},{"a":158,"b":164},{"a":242,"b":248},{"a":342,"b":348},{"a":432,"b":438},{"a":535,"b":541},{"a":622,"b":628},{"a":727,"b":733}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":265,"b":277},{"a":457,"b":469},{"a":646,"b":658}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":751,"b":756}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":827,"b":839}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":850,"b":861}]}],"statement":"-- Un paso adelante con quién y cuándo: lista, en curso o cerrada (con sus observaciones).\nUPDATE labs.activities\nSET stage = :stage!,\n  ready_at = CASE WHEN :stage! = 'ready' THEN now() ELSE ready_at END,\n  ready_by_principal_id = CASE WHEN :stage! = 'ready' THEN :principalId!::uuid ELSE ready_by_principal_id END,\n  started_at = CASE WHEN :stage! = 'running' THEN now() ELSE started_at END,\n  started_by_principal_id = CASE WHEN :stage! = 'running' THEN :principalId!::uuid ELSE started_by_principal_id END,\n  closed_at = CASE WHEN :stage! = 'closed' THEN now() ELSE closed_at END,\n  closed_by_principal_id = CASE WHEN :stage! = 'closed' THEN :principalId!::uuid ELSE closed_by_principal_id END,\n  closing_notes = CASE WHEN :stage! = 'closed' THEN :notes ELSE closing_notes END,\n  version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :activityId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Un paso adelante con quién y cuándo: lista, en curso o cerrada (con sus observaciones).
 * UPDATE labs.activities
 * SET stage = :stage!,
 *   ready_at = CASE WHEN :stage! = 'ready' THEN now() ELSE ready_at END,
 *   ready_by_principal_id = CASE WHEN :stage! = 'ready' THEN :principalId!::uuid ELSE ready_by_principal_id END,
 *   started_at = CASE WHEN :stage! = 'running' THEN now() ELSE started_at END,
 *   started_by_principal_id = CASE WHEN :stage! = 'running' THEN :principalId!::uuid ELSE started_by_principal_id END,
 *   closed_at = CASE WHEN :stage! = 'closed' THEN now() ELSE closed_at END,
 *   closed_by_principal_id = CASE WHEN :stage! = 'closed' THEN :principalId!::uuid ELSE closed_by_principal_id END,
 *   closing_notes = CASE WHEN :stage! = 'closed' THEN :notes ELSE closing_notes END,
 *   version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :activityId!
 * ```
 */
export const advanceStage = new PreparedQuery<IAdvanceStageParams,IAdvanceStageResult>(advanceStageIR);


/** 'InsertUsage' parameters type */
export interface IInsertUsageParams {
  activityId: string;
  held: string;
  line: number;
  used: string;
  workspaceId: string;
}

/** 'InsertUsage' return type */
export type IInsertUsageResult = void;

/** 'InsertUsage' query type */
export interface IInsertUsageQuery {
  params: IInsertUsageParams;
  result: IInsertUsageResult;
}

const insertUsageIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true,"line":true,"held":true,"used":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":98}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":101,"b":112}]},{"name":"line","required":true,"transform":{"type":"scalar"},"locs":[{"a":115,"b":120}]},{"name":"held","required":true,"transform":{"type":"scalar"},"locs":[{"a":123,"b":128}]},{"name":"used","required":true,"transform":{"type":"scalar"},"locs":[{"a":140,"b":145}]}],"statement":"INSERT INTO labs.activity_usage (workspace_id, activity_id, line, held, used)\nVALUES (:workspaceId!, :activityId!, :line!, :held!::numeric, :used!::numeric)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO labs.activity_usage (workspace_id, activity_id, line, held, used)
 * VALUES (:workspaceId!, :activityId!, :line!, :held!::numeric, :used!::numeric)
 * ```
 */
export const insertUsage = new PreparedQuery<IInsertUsageParams,IInsertUsageResult>(insertUsageIR);


/** 'CompleteRequest' parameters type */
export interface ICompleteRequestParams {
  requestId: string;
  workspaceId: string;
}

/** 'CompleteRequest' return type */
export interface ICompleteRequestResult {
  id: string;
}

/** 'CompleteRequest' query type */
export interface ICompleteRequestQuery {
  params: ICompleteRequestParams;
  result: ICompleteRequestResult;
}

const completeRequestIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":204,"b":216}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":229,"b":239}]}],"statement":"-- Con todas sus fechas programadas y todos sus bloques activos cerrados, la solicitud queda «finalizada».\nUPDATE labs.requests AS q\nSET status = 'completed', version = version + 1\nWHERE q.workspace_id = :workspaceId! AND q.id = :requestId! AND q.status = 'scheduled'\n  AND NOT EXISTS (SELECT 1 FROM labs.activities AS a\n                  WHERE a.workspace_id = q.workspace_id AND a.request_id = q.id AND a.cancelled_at IS NULL AND a.stage <> 'closed')\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Con todas sus fechas programadas y todos sus bloques activos cerrados, la solicitud queda «finalizada».
 * UPDATE labs.requests AS q
 * SET status = 'completed', version = version + 1
 * WHERE q.workspace_id = :workspaceId! AND q.id = :requestId! AND q.status = 'scheduled'
 *   AND NOT EXISTS (SELECT 1 FROM labs.activities AS a
 *                   WHERE a.workspace_id = q.workspace_id AND a.request_id = q.id AND a.cancelled_at IS NULL AND a.stage <> 'closed')
 * RETURNING id
 * ```
 */
export const completeRequest = new PreparedQuery<ICompleteRequestParams,ICompleteRequestResult>(completeRequestIR);


/** 'ActivityUsage' parameters type */
export interface IActivityUsageParams {
  activityIds: stringArray;
  workspaceId: string;
}

/** 'ActivityUsage' return type */
export interface IActivityUsageResult {
  activity_id: string;
  held: string;
  line: number;
  returned: string;
  used: string;
}

/** 'ActivityUsage' query type */
export interface IActivityUsageQuery {
  params: IActivityUsageParams;
  result: IActivityUsageResult;
}

const activityUsageIR: any = {"usedParamSet":{"workspaceId":true,"activityIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":264,"b":276}]},{"name":"activityIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":301,"b":313}]}],"statement":"-- Lo apartado, utilizado y devuelto de cada reactivo de esos bloques cerrados.\nSELECT activity_id, line, trim_scale(held)::text AS \"held!\", trim_scale(used)::text AS \"used!\", trim_scale(returned)::text AS \"returned!\"\nFROM labs.activity_usage\nWHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[])\nORDER BY activity_id, line"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo apartado, utilizado y devuelto de cada reactivo de esos bloques cerrados.
 * SELECT activity_id, line, trim_scale(held)::text AS "held!", trim_scale(used)::text AS "used!", trim_scale(returned)::text AS "returned!"
 * FROM labs.activity_usage
 * WHERE workspace_id = :workspaceId! AND activity_id = ANY (:activityIds!::uuid[])
 * ORDER BY activity_id, line
 * ```
 */
export const activityUsage = new PreparedQuery<IActivityUsageParams,IActivityUsageResult>(activityUsageIR);


/** 'BlockAsset' parameters type */
export interface IBlockAssetParams {
  activityId: string;
  assetId: string;
  workspaceId: string;
}

/** 'BlockAsset' return type */
export interface IBlockAssetResult {
  asset_id: string;
}

/** 'BlockAsset' query type */
export interface IBlockAssetQuery {
  params: IBlockAssetParams;
  result: IBlockAssetResult;
}

const blockAssetIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true,"assetId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":136,"b":148}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":179}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":196,"b":204}]}],"statement":"-- Un equipo apartado vigente del bloque: de él se reporta un incidente.\nSELECT asset_id\nFROM labs.activity_assets\nWHERE workspace_id = :workspaceId! AND activity_id = :activityId! AND asset_id = :assetId! AND released_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- Un equipo apartado vigente del bloque: de él se reporta un incidente.
 * SELECT asset_id
 * FROM labs.activity_assets
 * WHERE workspace_id = :workspaceId! AND activity_id = :activityId! AND asset_id = :assetId! AND released_at IS NULL
 * ```
 */
export const blockAsset = new PreparedQuery<IBlockAssetParams,IBlockAssetResult>(blockAssetIR);


/** 'InsertActivityIncident' parameters type */
export interface IInsertActivityIncidentParams {
  activityId: string;
  caseId: string;
  workspaceId: string;
}

/** 'InsertActivityIncident' return type */
export type IInsertActivityIncidentResult = void;

/** 'InsertActivityIncident' query type */
export interface IInsertActivityIncidentQuery {
  params: IInsertActivityIncidentParams;
  result: IInsertActivityIncidentResult;
}

const insertActivityIncidentIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true,"caseId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":81,"b":93}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":96,"b":107}]},{"name":"caseId","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":117}]}],"statement":"INSERT INTO labs.activity_incidents (workspace_id, activity_id, case_id)\nVALUES (:workspaceId!, :activityId!, :caseId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO labs.activity_incidents (workspace_id, activity_id, case_id)
 * VALUES (:workspaceId!, :activityId!, :caseId!)
 * ```
 */
export const insertActivityIncident = new PreparedQuery<IInsertActivityIncidentParams,IInsertActivityIncidentResult>(insertActivityIncidentIR);


/** 'UpcomingAssetBookings' parameters type */
export interface IUpcomingAssetBookingsParams {
  assetId: string;
  from: string;
  workspaceId: string;
}

/** 'UpcomingAssetBookings' return type */
export interface IUpcomingAssetBookingsResult {
  area_name: string;
  code: string;
  date: string;
  ends_at: string;
  id: string;
  requester_name: string;
  stage: string;
  starts_at: string;
}

/** 'UpcomingAssetBookings' query type */
export interface IUpcomingAssetBookingsQuery {
  params: IUpcomingAssetBookingsParams;
  result: IUpcomingAssetBookingsResult;
}

const upcomingAssetBookingsIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true,"from":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":940,"b":952}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":972,"b":980}]},{"name":"from","required":true,"transform":{"type":"scalar"},"locs":[{"a":1079,"b":1084}]}],"statement":"-- Las próximas reservas vigentes de un equipo desde :from («Reservado» en Equipos), hasta diez.\nSELECT a.id, a.on_date::text AS \"date!\", to_char(lower(aa.during), 'HH24:MI') AS \"starts_at!\",\n  to_char(upper(aa.during), 'HH24:MI') AS \"ends_at!\", a.code, area.name AS area_name, a.stage,\n  coalesce(requester.display_name, '') AS \"requester_name!\"\nFROM labs.activity_assets AS aa\nJOIN labs.activities AS a ON a.workspace_id = aa.workspace_id AND a.id = aa.activity_id\nJOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id\nJOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id\nLEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id\nLEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id\nLEFT JOIN core.identities AS requester ON requester.id = rm.identity_id\nWHERE aa.workspace_id = :workspaceId! AND aa.asset_id = :assetId! AND aa.released_at IS NULL\n  AND a.cancelled_at IS NULL AND a.stage <> 'closed' AND a.on_date >= :from!::date\nORDER BY lower(aa.during)\nLIMIT 10"};

/**
 * Query generated from SQL:
 * ```
 * -- Las próximas reservas vigentes de un equipo desde :from («Reservado» en Equipos), hasta diez.
 * SELECT a.id, a.on_date::text AS "date!", to_char(lower(aa.during), 'HH24:MI') AS "starts_at!",
 *   to_char(upper(aa.during), 'HH24:MI') AS "ends_at!", a.code, area.name AS area_name, a.stage,
 *   coalesce(requester.display_name, '') AS "requester_name!"
 * FROM labs.activity_assets AS aa
 * JOIN labs.activities AS a ON a.workspace_id = aa.workspace_id AND a.id = aa.activity_id
 * JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
 * JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
 * LEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id
 * LEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id
 * LEFT JOIN core.identities AS requester ON requester.id = rm.identity_id
 * WHERE aa.workspace_id = :workspaceId! AND aa.asset_id = :assetId! AND aa.released_at IS NULL
 *   AND a.cancelled_at IS NULL AND a.stage <> 'closed' AND a.on_date >= :from!::date
 * ORDER BY lower(aa.during)
 * LIMIT 10
 * ```
 */
export const upcomingAssetBookings = new PreparedQuery<IUpcomingAssetBookingsParams,IUpcomingAssetBookingsResult>(upcomingAssetBookingsIR);


/** 'IncidentPractice' parameters type */
export interface IIncidentPracticeParams {
  caseId: string;
  workspaceId: string;
}

/** 'IncidentPractice' return type */
export interface IIncidentPracticeResult {
  area_name: string;
  code: string;
  date: string;
  ends_at: string;
  id: string;
  requester_name: string;
  starts_at: string;
  title: string;
}

/** 'IncidentPractice' query type */
export interface IIncidentPracticeQuery {
  params: IIncidentPracticeParams;
  result: IIncidentPracticeResult;
}

const incidentPracticeIR: any = {"usedParamSet":{"workspaceId":true,"caseId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":928,"b":940}]},{"name":"caseId","required":true,"transform":{"type":"scalar"},"locs":[{"a":958,"b":965}]}],"statement":"-- La práctica en que ocurrió un incidente de Equipos, si nació de una.\nSELECT a.id, a.code, a.on_date::text AS \"date!\", to_char(a.starts_at, 'HH24:MI') AS \"starts_at!\",\n  to_char(a.ends_at, 'HH24:MI') AS \"ends_at!\", area.name AS area_name, coalesce(q.title, '') AS \"title!\",\n  coalesce(requester.display_name, '') AS \"requester_name!\"\nFROM labs.activity_incidents AS i\nJOIN labs.activities AS a ON a.workspace_id = i.workspace_id AND a.id = i.activity_id\nJOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id\nJOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id\nLEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id\nLEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id\nLEFT JOIN core.identities AS requester ON requester.id = rm.identity_id\nWHERE i.workspace_id = :workspaceId! AND i.case_id = :caseId!"};

/**
 * Query generated from SQL:
 * ```
 * -- La práctica en que ocurrió un incidente de Equipos, si nació de una.
 * SELECT a.id, a.code, a.on_date::text AS "date!", to_char(a.starts_at, 'HH24:MI') AS "starts_at!",
 *   to_char(a.ends_at, 'HH24:MI') AS "ends_at!", area.name AS area_name, coalesce(q.title, '') AS "title!",
 *   coalesce(requester.display_name, '') AS "requester_name!"
 * FROM labs.activity_incidents AS i
 * JOIN labs.activities AS a ON a.workspace_id = i.workspace_id AND a.id = i.activity_id
 * JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
 * JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
 * LEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id
 * LEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id
 * LEFT JOIN core.identities AS requester ON requester.id = rm.identity_id
 * WHERE i.workspace_id = :workspaceId! AND i.case_id = :caseId!
 * ```
 */
export const incidentPractice = new PreparedQuery<IIncidentPracticeParams,IIncidentPracticeResult>(incidentPracticeIR);


