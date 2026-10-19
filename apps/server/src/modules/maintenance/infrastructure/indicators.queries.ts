/** Types generated for queries found in "src/modules/maintenance/infrastructure/indicators.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'MonthlyWork' parameters type */
export interface IMonthlyWorkParams {
  from: string;
  today: string;
  workspaceId: string;
}

/** 'MonthlyWork' return type */
export interface IMonthlyWorkResult {
  done: number;
  due: number;
  month: string;
  on_time: number;
}

/** 'MonthlyWork' query type */
export interface IMonthlyWorkQuery {
  params: IMonthlyWorkParams;
  result: IMonthlyWorkResult;
}

const monthlyWorkIR: any = {"usedParamSet":{"workspaceId":true,"from":true,"today":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":256,"b":268},{"a":517,"b":529}]},{"name":"from","required":true,"transform":{"type":"scalar"},"locs":[{"a":314,"b":319},{"a":552,"b":557},{"a":901,"b":906}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":363,"b":369},{"a":602,"b":608},{"a":926,"b":932}]}],"statement":"-- Programado frente a realizado, por el mes de la fecha que tocaba, de :from al mes de :today; el mes actual\n-- incluye lo que toca después de hoy.\nWITH slots AS (\n  SELECT r.due_on, r.performed_on\n  FROM maintenance.records AS r\n  WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL\n    AND r.due_on >= :from!::date AND r.due_on < (date_trunc('month', :today!::date::timestamp) + interval '1 month')::date\n  UNION ALL\n  SELECT pa.due_on, NULL\n  FROM maintenance.plan_assets AS pa\n  WHERE pa.workspace_id = :workspaceId!\n    AND pa.due_on >= :from!::date AND pa.due_on < (date_trunc('month', :today!::date::timestamp) + interval '1 month')::date\n)\nSELECT to_char(m.month, 'YYYY-MM') AS \"month!\",\n       count(s.due_on)::integer AS \"due!\",\n       count(s.performed_on)::integer AS \"done!\",\n       count(*) FILTER (WHERE s.performed_on <= s.due_on)::integer AS \"on_time!\"\nFROM generate_series(:from!::date::timestamp, :today!::date::timestamp, interval '1 month') AS m (month)\nLEFT JOIN slots AS s ON date_trunc('month', s.due_on::timestamp) = m.month\nGROUP BY m.month\nORDER BY m.month"};

/**
 * Query generated from SQL:
 * ```
 * -- Programado frente a realizado, por el mes de la fecha que tocaba, de :from al mes de :today; el mes actual
 * -- incluye lo que toca después de hoy.
 * WITH slots AS (
 *   SELECT r.due_on, r.performed_on
 *   FROM maintenance.records AS r
 *   WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL
 *     AND r.due_on >= :from!::date AND r.due_on < (date_trunc('month', :today!::date::timestamp) + interval '1 month')::date
 *   UNION ALL
 *   SELECT pa.due_on, NULL
 *   FROM maintenance.plan_assets AS pa
 *   WHERE pa.workspace_id = :workspaceId!
 *     AND pa.due_on >= :from!::date AND pa.due_on < (date_trunc('month', :today!::date::timestamp) + interval '1 month')::date
 * )
 * SELECT to_char(m.month, 'YYYY-MM') AS "month!",
 *        count(s.due_on)::integer AS "due!",
 *        count(s.performed_on)::integer AS "done!",
 *        count(*) FILTER (WHERE s.performed_on <= s.due_on)::integer AS "on_time!"
 * FROM generate_series(:from!::date::timestamp, :today!::date::timestamp, interval '1 month') AS m (month)
 * LEFT JOIN slots AS s ON date_trunc('month', s.due_on::timestamp) = m.month
 * GROUP BY m.month
 * ORDER BY m.month
 * ```
 */
export const monthlyWork = new PreparedQuery<IMonthlyWorkParams,IMonthlyWorkResult>(monthlyWorkIR);


/** 'Compliance' parameters type */
export interface IComplianceParams {
  from: string;
  today: string;
  workspaceId: string;
}

/** 'Compliance' return type */
export interface IComplianceResult {
  late: number;
  on_time: number;
  pending: number;
  requirement: string | null;
  total: boolean;
}

/** 'Compliance' query type */
export interface IComplianceQuery {
  params: IComplianceParams;
  result: IComplianceResult;
}

const complianceIR: any = {"usedParamSet":{"workspaceId":true,"from":true,"today":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":467,"b":479},{"a":760,"b":772}]},{"name":"from","required":true,"transform":{"type":"scalar"},"locs":[{"a":526,"b":531},{"a":791,"b":796}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":543,"b":549},{"a":820,"b":826}]}],"statement":"-- Cumplimiento del plan hasta hoy: hecho en la fecha que tocaba o antes, hecho después, o pendiente con la\n-- fecha ya pasada (lo que toca hoy aún no cuenta). La fila \"total\" es la del espacio; las demás, por el\n-- requisito actual del plan, de la A a la Z.\nWITH slots AS (\n  SELECT r.due_on, r.performed_on, p.requirement\n  FROM maintenance.records AS r\n  JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id\n  WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.due_on BETWEEN :from!::date AND :today!::date\n  UNION ALL\n  SELECT pa.due_on, NULL, p.requirement\n  FROM maintenance.plan_assets AS pa\n  JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id\n  WHERE pa.workspace_id = :workspaceId! AND pa.due_on >= :from!::date AND pa.due_on < :today!::date\n)\nSELECT grouping(requirement) = 1 AS \"total!\", requirement,\n       count(*) FILTER (WHERE performed_on <= due_on)::integer AS \"on_time!\",\n       count(*) FILTER (WHERE performed_on > due_on)::integer AS \"late!\",\n       count(*) FILTER (WHERE performed_on IS NULL)::integer AS \"pending!\"\nFROM slots\nGROUP BY GROUPING SETS ((), (requirement))\nORDER BY grouping(requirement) DESC, core.fold_text(requirement), requirement"};

/**
 * Query generated from SQL:
 * ```
 * -- Cumplimiento del plan hasta hoy: hecho en la fecha que tocaba o antes, hecho después, o pendiente con la
 * -- fecha ya pasada (lo que toca hoy aún no cuenta). La fila "total" es la del espacio; las demás, por el
 * -- requisito actual del plan, de la A a la Z.
 * WITH slots AS (
 *   SELECT r.due_on, r.performed_on, p.requirement
 *   FROM maintenance.records AS r
 *   JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id
 *   WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.due_on BETWEEN :from!::date AND :today!::date
 *   UNION ALL
 *   SELECT pa.due_on, NULL, p.requirement
 *   FROM maintenance.plan_assets AS pa
 *   JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
 *   WHERE pa.workspace_id = :workspaceId! AND pa.due_on >= :from!::date AND pa.due_on < :today!::date
 * )
 * SELECT grouping(requirement) = 1 AS "total!", requirement,
 *        count(*) FILTER (WHERE performed_on <= due_on)::integer AS "on_time!",
 *        count(*) FILTER (WHERE performed_on > due_on)::integer AS "late!",
 *        count(*) FILTER (WHERE performed_on IS NULL)::integer AS "pending!"
 * FROM slots
 * GROUP BY GROUPING SETS ((), (requirement))
 * ORDER BY grouping(requirement) DESC, core.fold_text(requirement), requirement
 * ```
 */
export const compliance = new PreparedQuery<IComplianceParams,IComplianceResult>(complianceIR);


/** 'CalibrationState' parameters type */
export interface ICalibrationStateParams {
  today: string;
  workspaceId: string;
}

/** 'CalibrationState' return type */
export interface ICalibrationStateResult {
  current: number;
  total: number;
}

/** 'CalibrationState' query type */
export interface ICalibrationStateQuery {
  params: ICalibrationStateParams;
  result: ICalibrationStateResult;
}

const calibrationStateIR: any = {"usedParamSet":{"today":true,"workspaceId":true},"params":[{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":312,"b":318}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":503,"b":515}]}],"statement":"-- Calibraciones vigentes: de los trabajos de los planes de calibración, los que tienen un último registro que\n-- no es «No conforme» y cuya fecha no venció.\nSELECT count(*)::integer AS \"total!\",\n       count(*) FILTER (\n         WHERE pa.last_record_id IS NOT NULL AND pa.last_result <> 'fail' AND pa.due_on >= :today!::date\n       )::integer AS \"current!\"\nFROM maintenance.plan_assets AS pa\nJOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id\nWHERE pa.workspace_id = :workspaceId! AND p.kind = 'calibration'"};

/**
 * Query generated from SQL:
 * ```
 * -- Calibraciones vigentes: de los trabajos de los planes de calibración, los que tienen un último registro que
 * -- no es «No conforme» y cuya fecha no venció.
 * SELECT count(*)::integer AS "total!",
 *        count(*) FILTER (
 *          WHERE pa.last_record_id IS NOT NULL AND pa.last_result <> 'fail' AND pa.due_on >= :today!::date
 *        )::integer AS "current!"
 * FROM maintenance.plan_assets AS pa
 * JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
 * WHERE pa.workspace_id = :workspaceId! AND p.kind = 'calibration'
 * ```
 */
export const calibrationState = new PreparedQuery<ICalibrationStateParams,ICalibrationStateResult>(calibrationStateIR);


/** 'WorkCosts' parameters type */
export interface IWorkCostsParams {
  from: string;
  today: string;
  workspaceId: string;
}

/** 'WorkCosts' return type */
export interface IWorkCostsResult {
  corrective: string;
  preventive: string;
  without_cost: number;
}

/** 'WorkCosts' query type */
export interface IWorkCostsQuery {
  params: IWorkCostsParams;
  result: IWorkCostsResult;
}

const workCostsIR: any = {"usedParamSet":{"workspaceId":true,"from":true,"today":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":478,"b":490}]},{"name":"from","required":true,"transform":{"type":"scalar"},"locs":[{"a":539,"b":544}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":556,"b":562}]}],"statement":"-- Lo registrado en el periodo, por la fecha del trabajo: preventivo (todo lo que se planifica) frente a\n-- correctivo, y cuántos registros no tienen costo.\nSELECT trim_scale(coalesce(sum(cost) FILTER (WHERE kind <> 'corrective'), 0))::text AS \"preventive!\",\n       trim_scale(coalesce(sum(cost) FILTER (WHERE kind = 'corrective'), 0))::text AS \"corrective!\",\n       count(*) FILTER (WHERE cost IS NULL)::integer AS \"without_cost!\"\nFROM maintenance.records\nWHERE workspace_id = :workspaceId! AND voided_at IS NULL AND performed_on BETWEEN :from!::date AND :today!::date"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo registrado en el periodo, por la fecha del trabajo: preventivo (todo lo que se planifica) frente a
 * -- correctivo, y cuántos registros no tienen costo.
 * SELECT trim_scale(coalesce(sum(cost) FILTER (WHERE kind <> 'corrective'), 0))::text AS "preventive!",
 *        trim_scale(coalesce(sum(cost) FILTER (WHERE kind = 'corrective'), 0))::text AS "corrective!",
 *        count(*) FILTER (WHERE cost IS NULL)::integer AS "without_cost!"
 * FROM maintenance.records
 * WHERE workspace_id = :workspaceId! AND voided_at IS NULL AND performed_on BETWEEN :from!::date AND :today!::date
 * ```
 */
export const workCosts = new PreparedQuery<IWorkCostsParams,IWorkCostsResult>(workCostsIR);


/** 'ReplacementCandidates' parameters type */
export interface IReplacementCandidatesParams {
  faultyAssetIds: stringArray;
  from: string;
  limit: NumberOrString;
  repairShare: string;
  today: string;
  workspaceId: string;
}

/** 'ReplacementCandidates' return type */
export interface IReplacementCandidatesResult {
  area_name: string | null;
  code: string;
  id: string;
  life_ended_on: string | null;
  name: string;
  repair_cost: string | null;
  replacement_value: string | null;
}

/** 'ReplacementCandidates' query type */
export interface IReplacementCandidatesQuery {
  params: IReplacementCandidatesParams;
  result: IReplacementCandidatesResult;
}

const replacementCandidatesIR: any = {"usedParamSet":{"workspaceId":true,"from":true,"today":true,"repairShare":true,"faultyAssetIds":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":391,"b":403},{"a":1114,"b":1126}]},{"name":"from","required":true,"transform":{"type":"scalar"},"locs":[{"a":480,"b":485}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":497,"b":503},{"a":714,"b":720},{"a":1868,"b":1874}]},{"name":"repairShare","required":true,"transform":{"type":"scalar"},"locs":[{"a":931,"b":943}]},{"name":"faultyAssetIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":1679,"b":1694}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1921,"b":1927}]}],"statement":"-- «Evaluar reemplazo» (02 §12): los equipos no dados de baja que cumplieron su vida útil, cuyo correctivo del\n-- periodo llega a :repairShare de su valor de reposición o que están en :faultyAssetIds (Equipos cuenta sus\n-- incidentes), sin un descarte vigente. Por código, con su área.\nWITH repairs AS (\n  SELECT asset_id, sum(cost) AS cost\n  FROM maintenance.records\n  WHERE workspace_id = :workspaceId! AND voided_at IS NULL AND kind = 'corrective'\n    AND performed_on BETWEEN :from!::date AND :today!::date\n  GROUP BY asset_id\n), assessed AS (\n  SELECT a.workspace_id, a.id, a.code, a.name, a.location_id, a.replacement_value,\n         CASE WHEN equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today!::date) = 'reached'\n              THEN (a.acquired_on + make_interval(years => a.useful_life_years))::date END AS life_ended_on,\n         CASE WHEN a.replacement_value > 0 AND rep.cost >= a.replacement_value * :repairShare!::numeric\n              THEN rep.cost END AS repair_cost\n  FROM equipment.asset_directory AS a\n  LEFT JOIN repairs AS rep ON rep.asset_id = a.id\n  WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'\n)\nSELECT s.id AS \"id!\", s.code AS \"code!\", s.name AS \"name!\", area.name AS \"area_name?\", s.life_ended_on,\n       trim_scale(s.repair_cost)::text AS repair_cost, trim_scale(s.replacement_value)::text AS replacement_value\nFROM assessed AS s\nLEFT JOIN core.location_areas AS la ON la.workspace_id = s.workspace_id AND la.location_id = s.location_id\nLEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id\nWHERE (s.life_ended_on IS NOT NULL OR s.repair_cost IS NOT NULL OR s.id = ANY (:faultyAssetIds!::uuid[]))\n  AND NOT EXISTS (\n    SELECT 1 FROM maintenance.replacement_reviews AS d\n    WHERE d.workspace_id = s.workspace_id AND d.asset_id = s.id AND d.dismissed_until > :today!::date\n  )\nORDER BY lower(s.code), s.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- «Evaluar reemplazo» (02 §12): los equipos no dados de baja que cumplieron su vida útil, cuyo correctivo del
 * -- periodo llega a :repairShare de su valor de reposición o que están en :faultyAssetIds (Equipos cuenta sus
 * -- incidentes), sin un descarte vigente. Por código, con su área.
 * WITH repairs AS (
 *   SELECT asset_id, sum(cost) AS cost
 *   FROM maintenance.records
 *   WHERE workspace_id = :workspaceId! AND voided_at IS NULL AND kind = 'corrective'
 *     AND performed_on BETWEEN :from!::date AND :today!::date
 *   GROUP BY asset_id
 * ), assessed AS (
 *   SELECT a.workspace_id, a.id, a.code, a.name, a.location_id, a.replacement_value,
 *          CASE WHEN equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today!::date) = 'reached'
 *               THEN (a.acquired_on + make_interval(years => a.useful_life_years))::date END AS life_ended_on,
 *          CASE WHEN a.replacement_value > 0 AND rep.cost >= a.replacement_value * :repairShare!::numeric
 *               THEN rep.cost END AS repair_cost
 *   FROM equipment.asset_directory AS a
 *   LEFT JOIN repairs AS rep ON rep.asset_id = a.id
 *   WHERE a.workspace_id = :workspaceId! AND a.condition <> 'retired'
 * )
 * SELECT s.id AS "id!", s.code AS "code!", s.name AS "name!", area.name AS "area_name?", s.life_ended_on,
 *        trim_scale(s.repair_cost)::text AS repair_cost, trim_scale(s.replacement_value)::text AS replacement_value
 * FROM assessed AS s
 * LEFT JOIN core.location_areas AS la ON la.workspace_id = s.workspace_id AND la.location_id = s.location_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
 * WHERE (s.life_ended_on IS NOT NULL OR s.repair_cost IS NOT NULL OR s.id = ANY (:faultyAssetIds!::uuid[]))
 *   AND NOT EXISTS (
 *     SELECT 1 FROM maintenance.replacement_reviews AS d
 *     WHERE d.workspace_id = s.workspace_id AND d.asset_id = s.id AND d.dismissed_until > :today!::date
 *   )
 * ORDER BY lower(s.code), s.id
 * LIMIT :limit!
 * ```
 */
export const replacementCandidates = new PreparedQuery<IReplacementCandidatesParams,IReplacementCandidatesResult>(replacementCandidatesIR);


/** 'InsertReplacementReview' parameters type */
export interface IInsertReplacementReviewParams {
  assetId: string;
  createdBy: string;
  months: number;
  reason: string;
  today: string;
  workspaceId: string;
}

/** 'InsertReplacementReview' return type */
export interface IInsertReplacementReviewResult {
  dismissed_until: string;
}

/** 'InsertReplacementReview' query type */
export interface IInsertReplacementReviewQuery {
  params: IInsertReplacementReviewParams;
  result: IInsertReplacementReviewResult;
}

const insertReplacementReviewIR: any = {"usedParamSet":{"today":true,"months":true,"workspaceId":true,"assetId":true,"reason":true,"createdBy":true},"params":[{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":187}]},{"name":"months","required":true,"transform":{"type":"scalar"},"locs":[{"a":221,"b":228}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":403,"b":415}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":418,"b":426}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":429,"b":436}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":453,"b":463}]}],"statement":"-- Descarta el aviso del equipo hasta :months meses después de :today, con motivo. Un descarte del mismo día no\n-- suma otro; la fecha se responde igual.\nWITH target AS (\n  SELECT (:today!::date + make_interval(months => :months!::integer))::date AS until\n), inserted AS (\n  INSERT INTO maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)\n  SELECT :workspaceId!, :assetId!, :reason!, target.until, :createdBy! FROM target\n  ON CONFLICT (workspace_id, asset_id, dismissed_until) DO NOTHING\n  RETURNING id\n)\nSELECT until AS \"dismissed_until!\" FROM target"};

/**
 * Query generated from SQL:
 * ```
 * -- Descarta el aviso del equipo hasta :months meses después de :today, con motivo. Un descarte del mismo día no
 * -- suma otro; la fecha se responde igual.
 * WITH target AS (
 *   SELECT (:today!::date + make_interval(months => :months!::integer))::date AS until
 * ), inserted AS (
 *   INSERT INTO maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
 *   SELECT :workspaceId!, :assetId!, :reason!, target.until, :createdBy! FROM target
 *   ON CONFLICT (workspace_id, asset_id, dismissed_until) DO NOTHING
 *   RETURNING id
 * )
 * SELECT until AS "dismissed_until!" FROM target
 * ```
 */
export const insertReplacementReview = new PreparedQuery<IInsertReplacementReviewParams,IInsertReplacementReviewResult>(insertReplacementReviewIR);


/** 'RecordsPerDay' parameters type */
export interface IRecordsPerDayParams {
  days: number;
  today: string;
  workspaceId: string;
}

/** 'RecordsPerDay' return type */
export interface IRecordsPerDayResult {
  date: string;
  value: number;
}

/** 'RecordsPerDay' query type */
export interface IRecordsPerDayQuery {
  params: IRecordsPerDayParams;
  result: IRecordsPerDayResult;
}

const recordsPerDayIR: any = {"usedParamSet":{"today":true,"days":true,"workspaceId":true},"params":[{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":235,"b":241},{"a":286,"b":292}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":252,"b":257}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":398,"b":410}]}],"statement":"-- La tarjeta del Inicio: los registros no anulados por la fecha del trabajo, de los últimos :days días hasta\n-- :today, con ceros.\nSELECT to_char(d.day, 'YYYY-MM-DD') AS \"date!\", count(r.id)::integer AS \"value!\"\nFROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)\nLEFT JOIN maintenance.records AS r\n  ON r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on = d.day::date\nGROUP BY d.day\nORDER BY d.day"};

/**
 * Query generated from SQL:
 * ```
 * -- La tarjeta del Inicio: los registros no anulados por la fecha del trabajo, de los últimos :days días hasta
 * -- :today, con ceros.
 * SELECT to_char(d.day, 'YYYY-MM-DD') AS "date!", count(r.id)::integer AS "value!"
 * FROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)
 * LEFT JOIN maintenance.records AS r
 *   ON r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on = d.day::date
 * GROUP BY d.day
 * ORDER BY d.day
 * ```
 */
export const recordsPerDay = new PreparedQuery<IRecordsPerDayParams,IRecordsPerDayResult>(recordsPerDayIR);


