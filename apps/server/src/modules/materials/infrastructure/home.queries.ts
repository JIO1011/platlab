/** Types generated for queries found in "src/modules/materials/infrastructure/home.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'AgendaReturns' parameters type */
export interface IAgendaReturnsParams {
  date: string;
  today: string;
  workspaceId: string;
}

/** 'AgendaReturns' return type */
export interface IAgendaReturnsResult {
  borrower_name: string;
  id: string;
  number: number;
  status: string;
}

/** 'AgendaReturns' query type */
export interface IAgendaReturnsQuery {
  params: IAgendaReturnsParams;
  result: IAgendaReturnsResult;
}

const agendaReturnsIR: any = {"usedParamSet":{"workspaceId":true,"date":true,"today":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":531,"b":543}]},{"name":"date","required":true,"transform":{"type":"scalar"},"locs":[{"a":560,"b":565}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":613,"b":619}]}],"statement":"-- Los préstamos con devolución prevista el :date, con quien se llevó el material.\nSELECT l.id, l.number, l.status, borrower.display_name AS \"borrower_name!\"\nFROM materials.loans AS l\nJOIN LATERAL (\n  SELECT ident.display_name\n  FROM core.principals AS pr\n  JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n  JOIN core.identities AS ident ON ident.id = m.identity_id\n  WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id\n) AS borrower ON true\nWHERE l.workspace_id = :workspaceId! AND l.due_on = :date!::date AND (l.status = 'closed' OR l.due_on >= :today!::date)\nORDER BY l.number"};

/**
 * Query generated from SQL:
 * ```
 * -- Los préstamos con devolución prevista el :date, con quien se llevó el material.
 * SELECT l.id, l.number, l.status, borrower.display_name AS "borrower_name!"
 * FROM materials.loans AS l
 * JOIN LATERAL (
 *   SELECT ident.display_name
 *   FROM core.principals AS pr
 *   JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *   JOIN core.identities AS ident ON ident.id = m.identity_id
 *   WHERE pr.workspace_id = l.workspace_id AND pr.id = l.borrower_principal_id
 * ) AS borrower ON true
 * WHERE l.workspace_id = :workspaceId! AND l.due_on = :date!::date AND (l.status = 'closed' OR l.due_on >= :today!::date)
 * ORDER BY l.number
 * ```
 */
export const agendaReturns = new PreparedQuery<IAgendaReturnsParams,IAgendaReturnsResult>(agendaReturnsIR);


/** 'ReturnsPerDay' parameters type */
export interface IReturnsPerDayParams {
  from: string;
  to: string;
  today: string;
  workspaceId: string;
}

/** 'ReturnsPerDay' return type */
export interface IReturnsPerDayResult {
  count: number;
  date: string;
}

/** 'ReturnsPerDay' query type */
export interface IReturnsPerDayQuery {
  params: IReturnsPerDayParams;
  result: IReturnsPerDayResult;
}

const returnsPerDayIR: any = {"usedParamSet":{"workspaceId":true,"from":true,"to":true,"today":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":198,"b":210}]},{"name":"from","required":true,"transform":{"type":"scalar"},"locs":[{"a":233,"b":238}]},{"name":"to","required":true,"transform":{"type":"scalar"},"locs":[{"a":250,"b":253}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":303,"b":309}]}],"statement":"-- El Calendario: cuántos de agendaReturns tiene cada día de :from a :to, sin ceros.\nSELECT l.due_on::text AS \"date!\", count(*)::integer AS \"count!\"\nFROM materials.loans AS l\nWHERE l.workspace_id = :workspaceId! AND l.due_on BETWEEN :from!::date AND :to!::date\n  AND (l.status = 'closed' OR l.due_on >= :today!::date)\nGROUP BY l.due_on\nORDER BY l.due_on"};

/**
 * Query generated from SQL:
 * ```
 * -- El Calendario: cuántos de agendaReturns tiene cada día de :from a :to, sin ceros.
 * SELECT l.due_on::text AS "date!", count(*)::integer AS "count!"
 * FROM materials.loans AS l
 * WHERE l.workspace_id = :workspaceId! AND l.due_on BETWEEN :from!::date AND :to!::date
 *   AND (l.status = 'closed' OR l.due_on >= :today!::date)
 * GROUP BY l.due_on
 * ORDER BY l.due_on
 * ```
 */
export const returnsPerDay = new PreparedQuery<IReturnsPerDayParams,IReturnsPerDayResult>(returnsPerDayIR);


