/** Types generated for queries found in "src/modules/labs/infrastructure/home.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'PendingRequestCounts' parameters type */
export interface IPendingRequestCountsParams {
  requesterId?: string | null | void;
  workspaceId: string;
}

/** 'PendingRequestCounts' return type */
export interface IPendingRequestCountsResult {
  attention: number;
  late: number;
  pending: number;
}

/** 'PendingRequestCounts' query type */
export interface IPendingRequestCountsQuery {
  params: IPendingRequestCountsParams;
  result: IPendingRequestCountsResult;
}

const pendingRequestCountsIR: any = {"usedParamSet":{"workspaceId":true,"requesterId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":408,"b":420}]},{"name":"requesterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":478,"b":489},{"a":533,"b":544}]}],"statement":"-- Lo que espera programarse, lo que llegó fuera de plazo y lo que espera cambios de quien pidió. Con :requesterId, solo\n-- las suyas.\nSELECT count(*) FILTER (WHERE status = 'submitted')::integer AS \"pending!\",\n  count(*) FILTER (WHERE status = 'submitted' AND late)::integer AS \"late!\",\n  count(*) FILTER (WHERE status = 'changes_requested')::integer AS \"attention!\"\nFROM labs.requests\nWHERE workspace_id = :workspaceId! AND status IN ('submitted', 'changes_requested')\n  AND (:requesterId::uuid IS NULL OR requester_principal_id = :requesterId::uuid)"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo que espera programarse, lo que llegó fuera de plazo y lo que espera cambios de quien pidió. Con :requesterId, solo
 * -- las suyas.
 * SELECT count(*) FILTER (WHERE status = 'submitted')::integer AS "pending!",
 *   count(*) FILTER (WHERE status = 'submitted' AND late)::integer AS "late!",
 *   count(*) FILTER (WHERE status = 'changes_requested')::integer AS "attention!"
 * FROM labs.requests
 * WHERE workspace_id = :workspaceId! AND status IN ('submitted', 'changes_requested')
 *   AND (:requesterId::uuid IS NULL OR requester_principal_id = :requesterId::uuid)
 * ```
 */
export const pendingRequestCounts = new PreparedQuery<IPendingRequestCountsParams,IPendingRequestCountsResult>(pendingRequestCountsIR);


/** 'RequestsSentPerDay' parameters type */
export interface IRequestsSentPerDayParams {
  days: number;
  requesterId?: string | null | void;
  timeZone: string;
  today: string;
  workspaceId: string;
}

/** 'RequestsSentPerDay' return type */
export interface IRequestsSentPerDayResult {
  date: string;
  value: number;
}

/** 'RequestsSentPerDay' query type */
export interface IRequestsSentPerDayQuery {
  params: IRequestsSentPerDayParams;
  result: IRequestsSentPerDayResult;
}

const requestsSentPerDayIR: any = {"usedParamSet":{"today":true,"days":true,"workspaceId":true,"timeZone":true,"requesterId":true},"params":[{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":288,"b":294},{"a":339,"b":345}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":305,"b":310}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":451,"b":463}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":523,"b":532}]},{"name":"requesterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":564,"b":575},{"a":611,"b":622}]}],"statement":"-- Solicitudes enviadas por primera vez cada día de los últimos :days días hasta :today, en la zona del espacio, con ceros.\n-- Con :requesterId, solo las que envió esa persona.\nSELECT to_char(d.day, 'YYYY-MM-DD') AS \"date!\", count(e.request_id)::integer AS \"value!\"\nFROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)\nLEFT JOIN labs.request_events AS e\n  ON e.workspace_id = :workspaceId! AND e.action = 'submitted' AND (e.created_at AT TIME ZONE :timeZone!)::date = d.day::date\n    AND (:requesterId::uuid IS NULL OR e.principal_id = :requesterId::uuid)\nGROUP BY d.day\nORDER BY d.day"};

/**
 * Query generated from SQL:
 * ```
 * -- Solicitudes enviadas por primera vez cada día de los últimos :days días hasta :today, en la zona del espacio, con ceros.
 * -- Con :requesterId, solo las que envió esa persona.
 * SELECT to_char(d.day, 'YYYY-MM-DD') AS "date!", count(e.request_id)::integer AS "value!"
 * FROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)
 * LEFT JOIN labs.request_events AS e
 *   ON e.workspace_id = :workspaceId! AND e.action = 'submitted' AND (e.created_at AT TIME ZONE :timeZone!)::date = d.day::date
 *     AND (:requesterId::uuid IS NULL OR e.principal_id = :requesterId::uuid)
 * GROUP BY d.day
 * ORDER BY d.day
 * ```
 */
export const requestsSentPerDay = new PreparedQuery<IRequestsSentPerDayParams,IRequestsSentPerDayResult>(requestsSentPerDayIR);


/** 'AgendaBlocks' parameters type */
export interface IAgendaBlocksParams {
  date: string;
  requesterId?: string | null | void;
  today: string;
  workspaceId: string;
}

/** 'AgendaBlocks' return type */
export interface IAgendaBlocksResult {
  area_name: string | null;
  code: string;
  ends_at: string;
  group: string | null;
  id: string;
  stage: string;
  starts_at: string;
  title: string;
}

/** 'AgendaBlocks' query type */
export interface IAgendaBlocksQuery {
  params: IAgendaBlocksParams;
  result: IAgendaBlocksResult;
}

const agendaBlocksIR: any = {"usedParamSet":{"workspaceId":true,"date":true,"today":true,"requesterId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":762,"b":774}]},{"name":"date","required":true,"transform":{"type":"scalar"},"locs":[{"a":819,"b":824}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":852,"b":858}]},{"name":"requesterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":896,"b":907},{"a":953,"b":964}]}],"statement":"-- Actividad del Inicio (ADR 0026): los bloques activos de :date con su estado, el título de la solicitud, el área y el\n-- grupo. Un día pasado solo muestra los cerrados. Con :requesterId, solo los de sus solicitudes.\nSELECT a.id, coalesce(q.title, '') AS \"title!\", a.code, area.name AS \"area_name?\", career.name AS \"group?\",\n  to_char(a.starts_at, 'HH24:MI') AS \"starts_at!\", to_char(a.ends_at, 'HH24:MI') AS \"ends_at!\", a.stage\nFROM labs.activities AS a\nJOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id\nLEFT JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id\nLEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id\nWHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.on_date = :date!::date\n  AND (a.on_date >= :today!::date OR a.stage = 'closed')\n  AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)\nORDER BY a.starts_at, a.code"};

/**
 * Query generated from SQL:
 * ```
 * -- Actividad del Inicio (ADR 0026): los bloques activos de :date con su estado, el título de la solicitud, el área y el
 * -- grupo. Un día pasado solo muestra los cerrados. Con :requesterId, solo los de sus solicitudes.
 * SELECT a.id, coalesce(q.title, '') AS "title!", a.code, area.name AS "area_name?", career.name AS "group?",
 *   to_char(a.starts_at, 'HH24:MI') AS "starts_at!", to_char(a.ends_at, 'HH24:MI') AS "ends_at!", a.stage
 * FROM labs.activities AS a
 * JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
 * LEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id
 * WHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.on_date = :date!::date
 *   AND (a.on_date >= :today!::date OR a.stage = 'closed')
 *   AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)
 * ORDER BY a.starts_at, a.code
 * ```
 */
export const agendaBlocks = new PreparedQuery<IAgendaBlocksParams,IAgendaBlocksResult>(agendaBlocksIR);


/** 'BlocksPerDay' parameters type */
export interface IBlocksPerDayParams {
  from: string;
  requesterId?: string | null | void;
  to: string;
  today: string;
  workspaceId: string;
}

/** 'BlocksPerDay' return type */
export interface IBlocksPerDayResult {
  count: number;
  date: string;
}

/** 'BlocksPerDay' query type */
export interface IBlocksPerDayQuery {
  params: IBlocksPerDayParams;
  result: IBlocksPerDayResult;
}

const blocksPerDayIR: any = {"usedParamSet":{"workspaceId":true,"from":true,"to":true,"today":true,"requesterId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":300,"b":312}]},{"name":"from","required":true,"transform":{"type":"scalar"},"locs":[{"a":363,"b":368}]},{"name":"to","required":true,"transform":{"type":"scalar"},"locs":[{"a":380,"b":383}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":411,"b":417}]},{"name":"requesterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":455,"b":466},{"a":512,"b":523}]}],"statement":"-- El Calendario del Inicio: cuántos bloques de agendaBlocks tiene cada día de :from a :to, sin ceros.\nSELECT a.on_date::text AS \"date!\", count(*)::integer AS \"count!\"\nFROM labs.activities AS a\nJOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id\nWHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.on_date BETWEEN :from!::date AND :to!::date\n  AND (a.on_date >= :today!::date OR a.stage = 'closed')\n  AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)\nGROUP BY a.on_date\nORDER BY a.on_date"};

/**
 * Query generated from SQL:
 * ```
 * -- El Calendario del Inicio: cuántos bloques de agendaBlocks tiene cada día de :from a :to, sin ceros.
 * SELECT a.on_date::text AS "date!", count(*)::integer AS "count!"
 * FROM labs.activities AS a
 * JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
 * WHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.on_date BETWEEN :from!::date AND :to!::date
 *   AND (a.on_date >= :today!::date OR a.stage = 'closed')
 *   AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)
 * GROUP BY a.on_date
 * ORDER BY a.on_date
 * ```
 */
export const blocksPerDay = new PreparedQuery<IBlocksPerDayParams,IBlocksPerDayResult>(blocksPerDayIR);


/** 'BlocksToClose' parameters type */
export interface IBlocksToCloseParams {
  today: string;
  workspaceId: string;
}

/** 'BlocksToClose' return type */
export interface IBlocksToCloseResult {
  count: number;
}

/** 'BlocksToClose' query type */
export interface IBlocksToCloseQuery {
  params: IBlocksToCloseParams;
  result: IBlocksToCloseResult;
}

const blocksToCloseIR: any = {"usedParamSet":{"workspaceId":true,"today":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":180}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":243,"b":249}]}],"statement":"-- «Prácticas por cerrar» en el Inicio: bloques activos de días pasados que nadie cerró.\nSELECT count(*)::integer AS \"count!\"\nFROM labs.activities\nWHERE workspace_id = :workspaceId! AND cancelled_at IS NULL AND stage <> 'closed' AND on_date < :today!::date"};

/**
 * Query generated from SQL:
 * ```
 * -- «Prácticas por cerrar» en el Inicio: bloques activos de días pasados que nadie cerró.
 * SELECT count(*)::integer AS "count!"
 * FROM labs.activities
 * WHERE workspace_id = :workspaceId! AND cancelled_at IS NULL AND stage <> 'closed' AND on_date < :today!::date
 * ```
 */
export const blocksToClose = new PreparedQuery<IBlocksToCloseParams,IBlocksToCloseResult>(blocksToCloseIR);


