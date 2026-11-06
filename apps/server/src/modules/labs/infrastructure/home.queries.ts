/** Types generated for queries found in "src/modules/labs/infrastructure/home.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'PendingRequestCounts' parameters type */
export interface IPendingRequestCountsParams {
  workspaceId: string;
}

/** 'PendingRequestCounts' return type */
export interface IPendingRequestCountsResult {
  late: number;
  pending: number;
}

/** 'PendingRequestCounts' query type */
export interface IPendingRequestCountsQuery {
  params: IPendingRequestCountsParams;
  result: IPendingRequestCountsResult;
}

const pendingRequestCountsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":199,"b":211}]}],"statement":"-- Lo que espera programarse y, de ello, lo que llegó fuera de plazo.\nSELECT count(*)::integer AS \"pending!\", count(*) FILTER (WHERE late)::integer AS \"late!\"\nFROM labs.requests\nWHERE workspace_id = :workspaceId! AND status = 'submitted'"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo que espera programarse y, de ello, lo que llegó fuera de plazo.
 * SELECT count(*)::integer AS "pending!", count(*) FILTER (WHERE late)::integer AS "late!"
 * FROM labs.requests
 * WHERE workspace_id = :workspaceId! AND status = 'submitted'
 * ```
 */
export const pendingRequestCounts = new PreparedQuery<IPendingRequestCountsParams,IPendingRequestCountsResult>(pendingRequestCountsIR);


/** 'RequestsSentPerDay' parameters type */
export interface IRequestsSentPerDayParams {
  days: number;
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

const requestsSentPerDayIR: any = {"usedParamSet":{"today":true,"days":true,"workspaceId":true,"timeZone":true},"params":[{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":235,"b":241},{"a":286,"b":292}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":252,"b":257}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":398,"b":410}]},{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":470,"b":479}]}],"statement":"-- Solicitudes enviadas por primera vez cada día de los últimos :days días hasta :today, en la zona del espacio, con ceros.\nSELECT to_char(d.day, 'YYYY-MM-DD') AS \"date!\", count(e.request_id)::integer AS \"value!\"\nFROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)\nLEFT JOIN labs.request_events AS e\n  ON e.workspace_id = :workspaceId! AND e.action = 'submitted' AND (e.created_at AT TIME ZONE :timeZone!)::date = d.day::date\nGROUP BY d.day\nORDER BY d.day"};

/**
 * Query generated from SQL:
 * ```
 * -- Solicitudes enviadas por primera vez cada día de los últimos :days días hasta :today, en la zona del espacio, con ceros.
 * SELECT to_char(d.day, 'YYYY-MM-DD') AS "date!", count(e.request_id)::integer AS "value!"
 * FROM generate_series((:today!::date - (:days!::integer - 1))::timestamp, :today!::date::timestamp, interval '1 day') AS d (day)
 * LEFT JOIN labs.request_events AS e
 *   ON e.workspace_id = :workspaceId! AND e.action = 'submitted' AND (e.created_at AT TIME ZONE :timeZone!)::date = d.day::date
 * GROUP BY d.day
 * ORDER BY d.day
 * ```
 */
export const requestsSentPerDay = new PreparedQuery<IRequestsSentPerDayParams,IRequestsSentPerDayResult>(requestsSentPerDayIR);


