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


