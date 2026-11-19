/** Types generated for queries found in "src/modules/reagents/infrastructure/home.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'ContainerCases' parameters type */
export interface IContainerCasesParams {
  expired: boolean;
  expiringDays: number;
  limit: NumberOrString;
  timeZone: string;
  workspaceId: string;
}

/** 'ContainerCases' return type */
export interface IContainerCasesResult {
  container_code: string | null;
  expires_on: string;
  product_id: string;
  product_name: string;
  total: number;
}

/** 'ContainerCases' query type */
export interface IContainerCasesQuery {
  params: IContainerCasesParams;
  result: IContainerCasesResult;
}

const containerCasesIR: any = {"usedParamSet":{"timeZone":true,"workspaceId":true,"expired":true,"expiringDays":true,"limit":true},"params":[{"name":"timeZone","required":true,"transform":{"type":"scalar"},"locs":[{"a":218,"b":227}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":734,"b":746}]},{"name":"expired","required":true,"transform":{"type":"scalar"},"locs":[{"a":805,"b":813}]},{"name":"expiringDays","required":true,"transform":{"type":"scalar"},"locs":[{"a":911,"b":924}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":986,"b":992}]}],"statement":"-- Frascos con saldo vencidos (:expired) o por vencer (hoy y los próximos :expiringDays días), los que vencen antes\n-- primero, con su reactivo, en la fecha civil del espacio.\nWITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)\nSELECT i.id AS \"product_id!\", i.name AS \"product_name!\", c.code AS \"container_code?\", l.expires_on::text AS \"expires_on!\",\n  count(*) OVER ()::integer AS \"total!\"\nFROM inventory.positions AS p\nCROSS JOIN today\nJOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id\nJOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id\nLEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id\nWHERE p.workspace_id = :workspaceId! AND i.kind = 'reagent' AND p.balance > 0\n  AND CASE WHEN :expired!::boolean THEN l.expires_on < today.d\n           ELSE l.expires_on BETWEEN today.d AND today.d + :expiringDays!::int END\nORDER BY l.expires_on, lower(i.name), c.code\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Frascos con saldo vencidos (:expired) o por vencer (hoy y los próximos :expiringDays días), los que vencen antes
 * -- primero, con su reactivo, en la fecha civil del espacio.
 * WITH today AS (SELECT (now() AT TIME ZONE :timeZone!)::date AS d)
 * SELECT i.id AS "product_id!", i.name AS "product_name!", c.code AS "container_code?", l.expires_on::text AS "expires_on!",
 *   count(*) OVER ()::integer AS "total!"
 * FROM inventory.positions AS p
 * CROSS JOIN today
 * JOIN inventory.items AS i ON i.workspace_id = p.workspace_id AND i.id = p.item_id
 * JOIN inventory.lots AS l ON l.workspace_id = p.workspace_id AND l.id = p.lot_id
 * LEFT JOIN inventory.containers AS c ON c.workspace_id = p.workspace_id AND c.id = p.container_id
 * WHERE p.workspace_id = :workspaceId! AND i.kind = 'reagent' AND p.balance > 0
 *   AND CASE WHEN :expired!::boolean THEN l.expires_on < today.d
 *            ELSE l.expires_on BETWEEN today.d AND today.d + :expiringDays!::int END
 * ORDER BY l.expires_on, lower(i.name), c.code
 * LIMIT :limit!
 * ```
 */
export const containerCases = new PreparedQuery<IContainerCasesParams,IContainerCasesResult>(containerCasesIR);


/** 'BelowMinimumCases' parameters type */
export interface IBelowMinimumCasesParams {
  limit: NumberOrString;
  workspaceId: string;
}

/** 'BelowMinimumCases' return type */
export interface IBelowMinimumCasesResult {
  id: string;
  name: string;
  total: number;
}

/** 'BelowMinimumCases' query type */
export interface IBelowMinimumCasesQuery {
  params: IBelowMinimumCasesParams;
  result: IBelowMinimumCasesResult;
}

const belowMinimumCasesIR: any = {"usedParamSet":{"workspaceId":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":382,"b":394}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":592,"b":598}]}],"statement":"-- Reactivos activos con mínimo cuya existencia física es menor, los más lejos de su mínimo primero.\nSELECT i.id, i.name, count(*) OVER ()::integer AS \"total!\"\nFROM inventory.items AS i\nCROSS JOIN LATERAL (\n  SELECT coalesce(sum(p.balance), 0) AS balance\n  FROM inventory.positions AS p\n  WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id\n) AS stock\nWHERE i.workspace_id = :workspaceId! AND i.kind = 'reagent' AND i.archived_at IS NULL\n  AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity\nORDER BY stock.balance / i.minimum_quantity, lower(i.name), i.id\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Reactivos activos con mínimo cuya existencia física es menor, los más lejos de su mínimo primero.
 * SELECT i.id, i.name, count(*) OVER ()::integer AS "total!"
 * FROM inventory.items AS i
 * CROSS JOIN LATERAL (
 *   SELECT coalesce(sum(p.balance), 0) AS balance
 *   FROM inventory.positions AS p
 *   WHERE p.workspace_id = i.workspace_id AND p.item_id = i.id
 * ) AS stock
 * WHERE i.workspace_id = :workspaceId! AND i.kind = 'reagent' AND i.archived_at IS NULL
 *   AND i.minimum_quantity IS NOT NULL AND stock.balance < i.minimum_quantity
 * ORDER BY stock.balance / i.minimum_quantity, lower(i.name), i.id
 * LIMIT :limit!
 * ```
 */
export const belowMinimumCases = new PreparedQuery<IBelowMinimumCasesParams,IBelowMinimumCasesResult>(belowMinimumCasesIR);


