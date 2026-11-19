/** Types generated for queries found in "src/modules/labs/infrastructure/home.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

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
  area_id: string;
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

const agendaBlocksIR: any = {"usedParamSet":{"workspaceId":true,"date":true,"today":true,"requesterId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":773,"b":785}]},{"name":"date","required":true,"transform":{"type":"scalar"},"locs":[{"a":830,"b":835}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":863,"b":869}]},{"name":"requesterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":907,"b":918},{"a":964,"b":975}]}],"statement":"-- Actividad del Inicio (ADR 0026): los bloques activos de :date con su estado, el título de la solicitud, el área y el\n-- grupo. Un día pasado solo muestra los cerrados. Con :requesterId, solo los de sus solicitudes.\nSELECT a.id, coalesce(q.title, '') AS \"title!\", a.code, a.area_id, area.name AS \"area_name?\", career.name AS \"group?\",\n  to_char(a.starts_at, 'HH24:MI') AS \"starts_at!\", to_char(a.ends_at, 'HH24:MI') AS \"ends_at!\", a.stage\nFROM labs.activities AS a\nJOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id\nLEFT JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id\nLEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id\nWHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.on_date = :date!::date\n  AND (a.on_date >= :today!::date OR a.stage = 'closed')\n  AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)\nORDER BY a.starts_at, a.code"};

/**
 * Query generated from SQL:
 * ```
 * -- Actividad del Inicio (ADR 0026): los bloques activos de :date con su estado, el título de la solicitud, el área y el
 * -- grupo. Un día pasado solo muestra los cerrados. Con :requesterId, solo los de sus solicitudes.
 * SELECT a.id, coalesce(q.title, '') AS "title!", a.code, a.area_id, area.name AS "area_name?", career.name AS "group?",
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


/** 'AgendaAreas' parameters type */
export interface IAgendaAreasParams {
  workspaceId: string;
}

/** 'AgendaAreas' return type */
export interface IAgendaAreasResult {
  id: string;
  name: string;
}

/** 'AgendaAreas' query type */
export interface IAgendaAreasQuery {
  params: IAgendaAreasParams;
  result: IAgendaAreasResult;
}

const agendaAreasIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":277,"b":289}]}],"statement":"-- Las filas de Actividad (ADR 0026, revisión de IN-02): las áreas con horario de Laboratorios, también las libres.\nSELECT area.id, area.name\nFROM labs.spaces AS s\nJOIN core.locations AS area ON area.workspace_id = s.workspace_id AND area.id = s.area_id\nWHERE s.workspace_id = :workspaceId! AND s.archived_at IS NULL AND area.archived_at IS NULL\nORDER BY lower(area.name), area.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Las filas de Actividad (ADR 0026, revisión de IN-02): las áreas con horario de Laboratorios, también las libres.
 * SELECT area.id, area.name
 * FROM labs.spaces AS s
 * JOIN core.locations AS area ON area.workspace_id = s.workspace_id AND area.id = s.area_id
 * WHERE s.workspace_id = :workspaceId! AND s.archived_at IS NULL AND area.archived_at IS NULL
 * ORDER BY lower(area.name), area.id
 * ```
 */
export const agendaAreas = new PreparedQuery<IAgendaAreasParams,IAgendaAreasResult>(agendaAreasIR);


/** 'BlocksToClose' parameters type */
export interface IBlocksToCloseParams {
  limit: NumberOrString;
  today: string;
  workspaceId: string;
}

/** 'BlocksToClose' return type */
export interface IBlocksToCloseResult {
  area_name: string | null;
  code: string;
  date: string;
  id: string;
  title: string;
  total: number;
}

/** 'BlocksToClose' query type */
export interface IBlocksToCloseQuery {
  params: IBlocksToCloseParams;
  result: IBlocksToCloseResult;
}

const blocksToCloseIR: any = {"usedParamSet":{"workspaceId":true,"today":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":589,"b":601}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":670,"b":676}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":730,"b":736}]}],"statement":"-- «Prácticas por cerrar» en el Inicio: bloques activos de días pasados que nadie cerró, los más antiguos primero, con\n-- el título de la solicitud, el código y el área. Cada fila lleva el total antes del tope.\nSELECT a.id, coalesce(q.title, '') AS \"title!\", a.code, area.name AS \"area_name?\", a.on_date::text AS \"date!\",\n  count(*) OVER ()::integer AS \"total!\"\nFROM labs.activities AS a\nJOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id\nLEFT JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id\nWHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.stage <> 'closed' AND a.on_date < :today!::date\nORDER BY a.on_date, a.starts_at, a.code\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- «Prácticas por cerrar» en el Inicio: bloques activos de días pasados que nadie cerró, los más antiguos primero, con
 * -- el título de la solicitud, el código y el área. Cada fila lleva el total antes del tope.
 * SELECT a.id, coalesce(q.title, '') AS "title!", a.code, area.name AS "area_name?", a.on_date::text AS "date!",
 *   count(*) OVER ()::integer AS "total!"
 * FROM labs.activities AS a
 * JOIN labs.requests AS q ON q.workspace_id = a.workspace_id AND q.id = a.request_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = a.workspace_id AND area.id = a.area_id
 * WHERE a.workspace_id = :workspaceId! AND a.cancelled_at IS NULL AND a.stage <> 'closed' AND a.on_date < :today!::date
 * ORDER BY a.on_date, a.starts_at, a.code
 * LIMIT :limit!
 * ```
 */
export const blocksToClose = new PreparedQuery<IBlocksToCloseParams,IBlocksToCloseResult>(blocksToCloseIR);


/** 'RequestCases' parameters type */
export interface IRequestCasesParams {
  limit: NumberOrString;
  requesterId?: string | null | void;
  status: string;
  timeZone: string;
  workspaceId: string;
}

/** 'RequestCases' return type */
export interface IRequestCasesResult {
  date: string;
  id: string;
  late: boolean;
  teacher_name: string | null;
  title: string;
  total: number;
}

/** 'RequestCases' query type */
export interface IRequestCasesQuery {
  params: IRequestCasesParams;
  result: IRequestCasesResult;
}

const requestCasesIR: any = {"usedParamSet":{"timeZone":true,"workspaceId":true,"status":true,"requesterId":true,"limit":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":395,"b":404}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":518,"b":530}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":547,"b":554}]},{"name":"requesterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":563,"b":574},{"a":620,"b":631}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":700,"b":706}]}],"statement":"-- «Solicitudes por programar» (:status submitted) y «Con cambios pedidos» (changes_requested, con :requesterId): las\n-- que esperan desde hace más primero, con el docente y si llegó fuera de plazo. Cada fila lleva el total antes del tope.\nSELECT q.id, coalesce(q.title, '') AS \"title!\", q.teacher_name, coalesce(q.late, false) AS \"late!\",\n  (coalesce(q.submitted_at, q.updated_at) AT TIME ZONE :timeZone!)::date::text AS \"date!\",\n  count(*) OVER ()::integer AS \"total!\"\nFROM labs.requests AS q\nWHERE q.workspace_id = :workspaceId! AND q.status = :status!\n  AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)\nORDER BY coalesce(q.submitted_at, q.updated_at), q.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- «Solicitudes por programar» (:status submitted) y «Con cambios pedidos» (changes_requested, con :requesterId): las
 * -- que esperan desde hace más primero, con el docente y si llegó fuera de plazo. Cada fila lleva el total antes del tope.
 * SELECT q.id, coalesce(q.title, '') AS "title!", q.teacher_name, coalesce(q.late, false) AS "late!",
 *   (coalesce(q.submitted_at, q.updated_at) AT TIME ZONE :timeZone!)::date::text AS "date!",
 *   count(*) OVER ()::integer AS "total!"
 * FROM labs.requests AS q
 * WHERE q.workspace_id = :workspaceId! AND q.status = :status!
 *   AND (:requesterId::uuid IS NULL OR q.requester_principal_id = :requesterId::uuid)
 * ORDER BY coalesce(q.submitted_at, q.updated_at), q.id
 * LIMIT :limit!
 * ```
 */
export const requestCases = new PreparedQuery<IRequestCasesParams,IRequestCasesResult>(requestCasesIR);


