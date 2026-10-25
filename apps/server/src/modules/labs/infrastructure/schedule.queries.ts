/** Types generated for queries found in "src/modules/labs/infrastructure/schedule.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type stringArray = (string)[];

/** 'ListActivities' parameters type */
export interface IListActivitiesParams {
  activityId?: string | null | void;
  from?: string | null | void;
  to?: string | null | void;
  workspaceId: string;
}

/** 'ListActivities' return type */
export interface IListActivitiesResult {
  area_id: string;
  code: string;
  date: string;
  ends_at: string;
  group: string | null;
  id: string;
  participants: number;
  request_id: string;
  request_number: number;
  requester_name: string;
  responsible_name: string;
  responsible_principal_id: string;
  starts_at: string;
  subject: string | null;
  title: string;
  version: number;
}

/** 'ListActivities' query type */
export interface IListActivitiesQuery {
  params: IListActivitiesParams;
  result: IListActivitiesResult;
}

const listActivitiesIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true,"from":true,"to":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1521,"b":1533}]},{"name":"activityId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1579,"b":1589},{"a":1621,"b":1631}]},{"name":"from","required":false,"transform":{"type":"scalar"},"locs":[{"a":1674,"b":1678}]},{"name":"to","required":false,"transform":{"type":"scalar"},"locs":[{"a":1690,"b":1692}]}],"statement":"-- Los bloques activos del rango (o solo :activityId), con lo que el bloque muestra: actividad, solicitante y grupo.\nSELECT a.id, a.request_id, q.number AS request_number, coalesce(q.title, '') AS \"title!\",\n  coalesce(requester.display_name, '') AS \"requester_name!\", subject.name AS \"subject?\", career.name AS \"group?\",\n  coalesce(q.participants, 0) AS \"participants!\",\n  a.on_date::text AS \"date!\", a.area_id, to_char(a.starts_at, 'HH24:MI') AS \"starts_at!\", to_char(a.ends_at, 'HH24:MI') AS \"ends_at!\",\n  a.responsible_principal_id, coalesce(responsible.display_name, '') AS \"responsible_name!\", a.code, a.version\nFROM labs.activities AS a\nJOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id\nLEFT JOIN labs.list_values AS subject ON subject.workspace_id = q.workspace_id AND subject.id = q.subject_id\nLEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id\nLEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id\nLEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id\nLEFT JOIN core.identities AS requester ON requester.id = rm.identity_id\nLEFT JOIN core.principals AS pp ON pp.workspace_id = a.workspace_id AND pp.id = a.responsible_principal_id\nLEFT JOIN core.memberships AS pm ON pm.workspace_id = pp.workspace_id AND pm.id = pp.membership_id\nLEFT JOIN core.identities AS responsible ON responsible.id = pm.identity_id\nWHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL\n  AND (CASE WHEN :activityId::uuid IS NOT NULL THEN a.id = :activityId::uuid\n            ELSE a.on_date BETWEEN :from::date AND :to::date END)\nORDER BY a.on_date, a.starts_at, a.area_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los bloques activos del rango (o solo :activityId), con lo que el bloque muestra: actividad, solicitante y grupo.
 * SELECT a.id, a.request_id, q.number AS request_number, coalesce(q.title, '') AS "title!",
 *   coalesce(requester.display_name, '') AS "requester_name!", subject.name AS "subject?", career.name AS "group?",
 *   coalesce(q.participants, 0) AS "participants!",
 *   a.on_date::text AS "date!", a.area_id, to_char(a.starts_at, 'HH24:MI') AS "starts_at!", to_char(a.ends_at, 'HH24:MI') AS "ends_at!",
 *   a.responsible_principal_id, coalesce(responsible.display_name, '') AS "responsible_name!", a.code, a.version
 * FROM labs.activities AS a
 * JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
 * LEFT JOIN labs.list_values AS subject ON subject.workspace_id = q.workspace_id AND subject.id = q.subject_id
 * LEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id
 * LEFT JOIN core.principals AS rp ON rp.workspace_id = q.workspace_id AND rp.id = q.requester_principal_id
 * LEFT JOIN core.memberships AS rm ON rm.workspace_id = rp.workspace_id AND rm.id = rp.membership_id
 * LEFT JOIN core.identities AS requester ON requester.id = rm.identity_id
 * LEFT JOIN core.principals AS pp ON pp.workspace_id = a.workspace_id AND pp.id = a.responsible_principal_id
 * LEFT JOIN core.memberships AS pm ON pm.workspace_id = pp.workspace_id AND pm.id = pp.membership_id
 * LEFT JOIN core.identities AS responsible ON responsible.id = pm.identity_id
 * WHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL
 *   AND (CASE WHEN :activityId::uuid IS NOT NULL THEN a.id = :activityId::uuid
 *             ELSE a.on_date BETWEEN :from::date AND :to::date END)
 * ORDER BY a.on_date, a.starts_at, a.area_id
 * ```
 */
export const listActivities = new PreparedQuery<IListActivitiesParams,IListActivitiesResult>(listActivitiesIR);


/** 'LockActivity' parameters type */
export interface ILockActivityParams {
  activityId: string;
  workspaceId: string;
}

/** 'LockActivity' return type */
export interface ILockActivityResult {
  area_id: string;
  cancelled_at: Date | null;
  code: string;
  on_date: string;
  period_id: string;
  request_id: string;
  sequence: number;
  version: number;
  week: number;
}

/** 'LockActivity' query type */
export interface ILockActivityQuery {
  params: ILockActivityParams;
  result: ILockActivityResult;
}

const lockActivityIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":213,"b":225}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":236,"b":247}]}],"statement":"-- Lo último del orden de bloqueo: el bloque que se mueve.\nSELECT request_id, on_date::text AS \"on_date!\", area_id, period_id, week, sequence, code, version, cancelled_at\nFROM labs.activities\nWHERE workspace_id = :workspaceId! AND id = :activityId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo: el bloque que se mueve.
 * SELECT request_id, on_date::text AS "on_date!", area_id, period_id, week, sequence, code, version, cancelled_at
 * FROM labs.activities
 * WHERE workspace_id = :workspaceId! AND id = :activityId!
 * FOR UPDATE
 * ```
 */
export const lockActivity = new PreparedQuery<ILockActivityParams,ILockActivityResult>(lockActivityIR);


/** 'LockRequestForSchedule' parameters type */
export interface ILockRequestForScheduleParams {
  requestId: string;
  workspaceId: string;
}

/** 'LockRequestForSchedule' return type */
export interface ILockRequestForScheduleResult {
  dates: stringArray;
  participants: number;
  status: string;
  version: number;
}

/** 'LockRequestForSchedule' query type */
export interface ILockRequestForScheduleQuery {
  params: ILockRequestForScheduleParams;
  result: ILockRequestForScheduleResult;
}

const lockRequestForScheduleIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":231,"b":243}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":254,"b":264}]}],"statement":"-- La solicitud que se programa, bloqueada: su estado, sus fechas y sus participantes deciden.\nSELECT status, version, dates::text[] AS \"dates!\", coalesce(participants, 0) AS \"participants!\"\nFROM labs.requests\nWHERE workspace_id = :workspaceId! AND id = :requestId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- La solicitud que se programa, bloqueada: su estado, sus fechas y sus participantes deciden.
 * SELECT status, version, dates::text[] AS "dates!", coalesce(participants, 0) AS "participants!"
 * FROM labs.requests
 * WHERE workspace_id = :workspaceId! AND id = :requestId!
 * FOR UPDATE
 * ```
 */
export const lockRequestForSchedule = new PreparedQuery<ILockRequestForScheduleParams,ILockRequestForScheduleResult>(lockRequestForScheduleIR);


/** 'ScheduleContext' parameters type */
export interface IScheduleContextParams {
  areaId: string;
  date?: string | null | void;
  exceptId?: string | null | void;
  workspaceId: string;
}

/** 'ScheduleContext' return type */
export interface IScheduleContextResult {
  abbreviation: string;
  capacity: number;
  closures: Json;
  others: Json;
  periods: Json;
  weekly_hours: Json;
}

/** 'ScheduleContext' query type */
export interface IScheduleContextQuery {
  params: IScheduleContextParams;
  result: IScheduleContextResult;
}

const scheduleContextIR: any = {"usedParamSet":{"date":true,"exceptId":true,"workspaceId":true,"areaId":true},"params":[{"name":"date","required":false,"transform":{"type":"scalar"},"locs":[{"a":765,"b":769},{"a":1085,"b":1089}]},{"name":"exceptId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1156,"b":1164}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1231,"b":1243}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1261,"b":1268}]}],"statement":"-- Lo que decide si se puede programar en el área ese día, leído en la misma transacción: aforo y horario del área\n-- activa, períodos activos, cierres vigentes (del área y comunes) y los demás bloques activos del área.\nSELECT s.capacity, s.weekly_hours, s.abbreviation,\n  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'code', p.code, 'startsOn', p.starts_on, 'endsOn', p.ends_on)), '[]')\n     FROM labs.periods AS p WHERE p.workspace_id = s.workspace_id AND p.archived_at IS NULL) AS \"periods!\",\n  (SELECT coalesce(jsonb_agg(jsonb_build_object('startsOn', c.starts_on, 'endsOn', c.ends_on)), '[]')\n     FROM labs.closures AS c\n    WHERE c.workspace_id = s.workspace_id AND c.voided_at IS NULL AND (c.area_id IS NULL OR c.area_id = s.area_id)\n      AND :date::date BETWEEN c.starts_on AND c.ends_on) AS \"closures!\",\n  (SELECT coalesce(jsonb_agg(jsonb_build_object('startsAt', to_char(a.starts_at, 'HH24:MI'), 'endsAt', to_char(a.ends_at, 'HH24:MI'))), '[]')\n     FROM labs.activities AS a\n    WHERE a.workspace_id = s.workspace_id AND a.area_id = s.area_id AND a.on_date = :date::date AND a.cancelled_at IS NULL\n      AND a.id IS DISTINCT FROM :exceptId::uuid) AS \"others!\"\nFROM labs.spaces AS s\nWHERE s.workspace_id = :workspaceId! AND s.area_id = :areaId! AND s.archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo que decide si se puede programar en el área ese día, leído en la misma transacción: aforo y horario del área
 * -- activa, períodos activos, cierres vigentes (del área y comunes) y los demás bloques activos del área.
 * SELECT s.capacity, s.weekly_hours, s.abbreviation,
 *   (SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'code', p.code, 'startsOn', p.starts_on, 'endsOn', p.ends_on)), '[]')
 *      FROM labs.periods AS p WHERE p.workspace_id = s.workspace_id AND p.archived_at IS NULL) AS "periods!",
 *   (SELECT coalesce(jsonb_agg(jsonb_build_object('startsOn', c.starts_on, 'endsOn', c.ends_on)), '[]')
 *      FROM labs.closures AS c
 *     WHERE c.workspace_id = s.workspace_id AND c.voided_at IS NULL AND (c.area_id IS NULL OR c.area_id = s.area_id)
 *       AND :date::date BETWEEN c.starts_on AND c.ends_on) AS "closures!",
 *   (SELECT coalesce(jsonb_agg(jsonb_build_object('startsAt', to_char(a.starts_at, 'HH24:MI'), 'endsAt', to_char(a.ends_at, 'HH24:MI'))), '[]')
 *      FROM labs.activities AS a
 *     WHERE a.workspace_id = s.workspace_id AND a.area_id = s.area_id AND a.on_date = :date::date AND a.cancelled_at IS NULL
 *       AND a.id IS DISTINCT FROM :exceptId::uuid) AS "others!"
 * FROM labs.spaces AS s
 * WHERE s.workspace_id = :workspaceId! AND s.area_id = :areaId! AND s.archived_at IS NULL
 * ```
 */
export const scheduleContext = new PreparedQuery<IScheduleContextParams,IScheduleContextResult>(scheduleContextIR);


/** 'NextActivitySequence' parameters type */
export interface INextActivitySequenceParams {
  areaId: string;
  periodId: string;
  week: number;
  workspaceId: string;
}

/** 'NextActivitySequence' return type */
export interface INextActivitySequenceResult {
  sequence: number;
}

/** 'NextActivitySequence' query type */
export interface INextActivitySequenceQuery {
  params: INextActivitySequenceParams;
  result: INextActivitySequenceResult;
}

const nextActivitySequenceIR: any = {"usedParamSet":{"workspaceId":true,"periodId":true,"week":true,"areaId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":205,"b":217}]},{"name":"periodId","required":true,"transform":{"type":"scalar"},"locs":[{"a":220,"b":229}]},{"name":"week","required":true,"transform":{"type":"scalar"},"locs":[{"a":232,"b":237}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":240,"b":247}]}],"statement":"-- El número siguiente del área en esa semana del período; la fila serializa a quienes programan a la vez.\nINSERT INTO labs.activity_sequences (workspace_id, period_id, week, area_id, last_number)\nVALUES (:workspaceId!, :periodId!, :week!, :areaId!, 1)\nON CONFLICT (workspace_id, period_id, week, area_id) DO UPDATE SET last_number = labs.activity_sequences.last_number + 1\nRETURNING last_number AS \"sequence!\""};

/**
 * Query generated from SQL:
 * ```
 * -- El número siguiente del área en esa semana del período; la fila serializa a quienes programan a la vez.
 * INSERT INTO labs.activity_sequences (workspace_id, period_id, week, area_id, last_number)
 * VALUES (:workspaceId!, :periodId!, :week!, :areaId!, 1)
 * ON CONFLICT (workspace_id, period_id, week, area_id) DO UPDATE SET last_number = labs.activity_sequences.last_number + 1
 * RETURNING last_number AS "sequence!"
 * ```
 */
export const nextActivitySequence = new PreparedQuery<INextActivitySequenceParams,INextActivitySequenceResult>(nextActivitySequenceIR);


/** 'InsertActivity' parameters type */
export interface IInsertActivityParams {
  areaId: string;
  code: string;
  createdBy: string;
  date: string;
  endsAt: DateOrString;
  periodId: string;
  requestId: string;
  responsibleId: string;
  sequence: number;
  startsAt: DateOrString;
  week: number;
  workspaceId: string;
}

/** 'InsertActivity' return type */
export interface IInsertActivityResult {
  id: string;
}

/** 'InsertActivity' query type */
export interface IInsertActivityQuery {
  params: IInsertActivityParams;
  result: IInsertActivityResult;
}

const insertActivityIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true,"date":true,"areaId":true,"startsAt":true,"endsAt":true,"responsibleId":true,"periodId":true,"week":true,"sequence":true,"code":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":187,"b":199}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":212}]},{"name":"date","required":true,"transform":{"type":"scalar"},"locs":[{"a":215,"b":220}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":229,"b":236}]},{"name":"startsAt","required":true,"transform":{"type":"scalar"},"locs":[{"a":239,"b":248}]},{"name":"endsAt","required":true,"transform":{"type":"scalar"},"locs":[{"a":257,"b":264}]},{"name":"responsibleId","required":true,"transform":{"type":"scalar"},"locs":[{"a":273,"b":287}]},{"name":"periodId","required":true,"transform":{"type":"scalar"},"locs":[{"a":290,"b":299}]},{"name":"week","required":true,"transform":{"type":"scalar"},"locs":[{"a":304,"b":309}]},{"name":"sequence","required":true,"transform":{"type":"scalar"},"locs":[{"a":312,"b":321}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":324,"b":329}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":332,"b":342}]}],"statement":"INSERT INTO labs.activities (workspace_id, request_id, on_date, area_id, starts_at, ends_at, responsible_principal_id,\n  period_id, week, sequence, code, created_by_principal_id)\nVALUES (:workspaceId!, :requestId!, :date!::date, :areaId!, :startsAt!::time, :endsAt!::time, :responsibleId!, :periodId!,\n  :week!, :sequence!, :code!, :createdBy!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO labs.activities (workspace_id, request_id, on_date, area_id, starts_at, ends_at, responsible_principal_id,
 *   period_id, week, sequence, code, created_by_principal_id)
 * VALUES (:workspaceId!, :requestId!, :date!::date, :areaId!, :startsAt!::time, :endsAt!::time, :responsibleId!, :periodId!,
 *   :week!, :sequence!, :code!, :createdBy!)
 * RETURNING id
 * ```
 */
export const insertActivity = new PreparedQuery<IInsertActivityParams,IInsertActivityResult>(insertActivityIR);


/** 'MoveActivity' parameters type */
export interface IMoveActivityParams {
  activityId: string;
  areaId: string;
  code: string;
  endsAt: DateOrString;
  periodId: string;
  responsibleId: string;
  sequence: number;
  startsAt: DateOrString;
  week: number;
  workspaceId: string;
}

/** 'MoveActivity' return type */
export type IMoveActivityResult = void;

/** 'MoveActivity' query type */
export interface IMoveActivityQuery {
  params: IMoveActivityParams;
  result: IMoveActivityResult;
}

const moveActivityIR: any = {"usedParamSet":{"areaId":true,"startsAt":true,"endsAt":true,"responsibleId":true,"periodId":true,"week":true,"sequence":true,"code":true,"workspaceId":true,"activityId":true},"params":[{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":37,"b":44}]},{"name":"startsAt","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":68}]},{"name":"endsAt","required":true,"transform":{"type":"scalar"},"locs":[{"a":87,"b":94}]},{"name":"responsibleId","required":true,"transform":{"type":"scalar"},"locs":[{"a":130,"b":144}]},{"name":"periodId","required":true,"transform":{"type":"scalar"},"locs":[{"a":161,"b":170}]},{"name":"week","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":185}]},{"name":"sequence","required":true,"transform":{"type":"scalar"},"locs":[{"a":199,"b":208}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":218,"b":223}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":269,"b":281}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":292,"b":303}]}],"statement":"UPDATE labs.activities\nSET area_id = :areaId!, starts_at = :startsAt!::time, ends_at = :endsAt!::time, responsible_principal_id = :responsibleId!,\n  period_id = :periodId!, week = :week!, sequence = :sequence!, code = :code!, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :activityId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE labs.activities
 * SET area_id = :areaId!, starts_at = :startsAt!::time, ends_at = :endsAt!::time, responsible_principal_id = :responsibleId!,
 *   period_id = :periodId!, week = :week!, sequence = :sequence!, code = :code!, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :activityId!
 * ```
 */
export const moveActivity = new PreparedQuery<IMoveActivityParams,IMoveActivityResult>(moveActivityIR);


/** 'InsertActivityCode' parameters type */
export interface IInsertActivityCodeParams {
  activityId: string;
  code: string;
  principalId: string;
  workspaceId: string;
}

/** 'InsertActivityCode' return type */
export type IInsertActivityCodeResult = void;

/** 'InsertActivityCode' query type */
export interface IInsertActivityCodeQuery {
  params: IInsertActivityCodeParams;
  result: IInsertActivityCodeResult;
}

const insertActivityCodeIR: any = {"usedParamSet":{"workspaceId":true,"activityId":true,"code":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":88,"b":100}]},{"name":"activityId","required":true,"transform":{"type":"scalar"},"locs":[{"a":103,"b":114}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":117,"b":122}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":137}]}],"statement":"INSERT INTO labs.activity_codes (workspace_id, activity_id, code, principal_id)\nVALUES (:workspaceId!, :activityId!, :code!, :principalId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO labs.activity_codes (workspace_id, activity_id, code, principal_id)
 * VALUES (:workspaceId!, :activityId!, :code!, :principalId!)
 * ```
 */
export const insertActivityCode = new PreparedQuery<IInsertActivityCodeParams,IInsertActivityCodeResult>(insertActivityCodeIR);


/** 'MarkScheduled' parameters type */
export interface IMarkScheduledParams {
  requestId: string;
  workspaceId: string;
}

/** 'MarkScheduled' return type */
export interface IMarkScheduledResult {
  id: string;
}

/** 'MarkScheduled' query type */
export interface IMarkScheduledQuery {
  params: IMarkScheduledParams;
  result: IMarkScheduledResult;
}

const markScheduledIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":187,"b":199}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":212,"b":222}]}],"statement":"-- Con todas sus fechas programadas, la solicitud queda «programada»; devuelve si cambió.\nUPDATE labs.requests AS q\nSET status = 'scheduled', version = version + 1\nWHERE q.workspace_id = :workspaceId! AND q.id = :requestId! AND q.status = 'submitted'\n  AND cardinality(q.dates) = (SELECT count(*) FROM labs.activities AS a\n                               WHERE a.workspace_id = q.workspace_id AND a.request_id = q.id AND a.cancelled_at IS NULL)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Con todas sus fechas programadas, la solicitud queda «programada»; devuelve si cambió.
 * UPDATE labs.requests AS q
 * SET status = 'scheduled', version = version + 1
 * WHERE q.workspace_id = :workspaceId! AND q.id = :requestId! AND q.status = 'submitted'
 *   AND cardinality(q.dates) = (SELECT count(*) FROM labs.activities AS a
 *                                WHERE a.workspace_id = q.workspace_id AND a.request_id = q.id AND a.cancelled_at IS NULL)
 * RETURNING id
 * ```
 */
export const markScheduled = new PreparedQuery<IMarkScheduledParams,IMarkScheduledResult>(markScheduledIR);


/** 'BumpRequest' parameters type */
export interface IBumpRequestParams {
  requestId: string;
  workspaceId: string;
}

/** 'BumpRequest' return type */
export type IBumpRequestResult = void;

/** 'BumpRequest' query type */
export interface IBumpRequestQuery {
  params: IBumpRequestParams;
  result: IBumpRequestResult;
}

const bumpRequestIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":184}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":195,"b":205}]}],"statement":"-- Programar una fecha sin completarlas también cambia la solicitud que otra persona pudo estar viendo.\nUPDATE labs.requests SET version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :requestId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Programar una fecha sin completarlas también cambia la solicitud que otra persona pudo estar viendo.
 * UPDATE labs.requests SET version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :requestId!
 * ```
 */
export const bumpRequest = new PreparedQuery<IBumpRequestParams,IBumpRequestResult>(bumpRequestIR);


