/** Types generated for queries found in "src/modules/maintenance/infrastructure/home.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'AgendaMaintenance' parameters type */
export interface IAgendaMaintenanceParams {
  date: string;
  today: string;
  workspaceId: string;
}

/** 'AgendaMaintenance' return type */
export interface IAgendaMaintenanceResult {
  area_id: string | null;
  area_name: string | null;
  asset_code: string;
  asset_id: string;
  asset_name: string;
  done: boolean;
  plan_title: string | null;
}

/** 'AgendaMaintenance' query type */
export interface IAgendaMaintenanceQuery {
  params: IAgendaMaintenanceParams;
  result: IAgendaMaintenanceResult;
}

const agendaMaintenanceIR: any = {"usedParamSet":{"workspaceId":true,"date":true,"today":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":776,"b":788},{"a":1373,"b":1385}]},{"name":"date","required":true,"transform":{"type":"scalar"},"locs":[{"a":835,"b":840},{"a":1403,"b":1408},{"a":1420,"b":1425}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":1436,"b":1442}]}],"statement":"-- Lo registrado el :date (hecho) y, si :date no es pasado, lo que vence ese día, con el equipo, el plan y el área del\n-- equipo, que es su fila en Actividad.\nSELECT r.asset_id AS \"asset_id!\", a.code AS \"asset_code!\", a.name AS \"asset_name!\", p.title AS \"plan_title?\", true AS \"done!\",\n  area.id AS \"area_id?\", area.name AS \"area_name?\"\nFROM maintenance.records AS r\nJOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id\nLEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id\nLEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id\nLEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id\nWHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on = :date!::date\nUNION ALL\nSELECT pa.asset_id, a.code, a.name, p.title, false, area.id, area.name\nFROM maintenance.plan_assets AS pa\nJOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id\nJOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id\nLEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id\nLEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id\nWHERE pa.workspace_id = :workspaceId! AND pa.due_on = :date!::date AND :date!::date >= :today!::date\nORDER BY 5 DESC, 3, 4"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo registrado el :date (hecho) y, si :date no es pasado, lo que vence ese día, con el equipo, el plan y el área del
 * -- equipo, que es su fila en Actividad.
 * SELECT r.asset_id AS "asset_id!", a.code AS "asset_code!", a.name AS "asset_name!", p.title AS "plan_title?", true AS "done!",
 *   area.id AS "area_id?", area.name AS "area_name?"
 * FROM maintenance.records AS r
 * JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id
 * LEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id
 * LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
 * WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on = :date!::date
 * UNION ALL
 * SELECT pa.asset_id, a.code, a.name, p.title, false, area.id, area.name
 * FROM maintenance.plan_assets AS pa
 * JOIN maintenance.plans AS p ON p.workspace_id = pa.workspace_id AND p.id = pa.plan_id
 * JOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id
 * LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
 * WHERE pa.workspace_id = :workspaceId! AND pa.due_on = :date!::date AND :date!::date >= :today!::date
 * ORDER BY 5 DESC, 3, 4
 * ```
 */
export const agendaMaintenance = new PreparedQuery<IAgendaMaintenanceParams,IAgendaMaintenanceResult>(agendaMaintenanceIR);


/** 'MaintenancePerDay' parameters type */
export interface IMaintenancePerDayParams {
  from: string;
  to: string;
  today: string;
  workspaceId: string;
}

/** 'MaintenancePerDay' return type */
export interface IMaintenancePerDayResult {
  count: number;
  date: string;
}

/** 'MaintenancePerDay' query type */
export interface IMaintenancePerDayQuery {
  params: IMaintenancePerDayParams;
  result: IMaintenancePerDayResult;
}

const maintenancePerDayIR: any = {"usedParamSet":{"workspaceId":true,"from":true,"to":true,"today":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":340,"b":352},{"a":624,"b":636}]},{"name":"from","required":true,"transform":{"type":"scalar"},"locs":[{"a":405,"b":410},{"a":669,"b":674}]},{"name":"to","required":true,"transform":{"type":"scalar"},"locs":[{"a":422,"b":425},{"a":702,"b":705}]},{"name":"today","required":true,"transform":{"type":"scalar"},"locs":[{"a":683,"b":689}]}],"statement":"-- El Calendario: cuántos de agendaMaintenance tiene cada día de :from a :to, sin ceros.\nSELECT x.day::text AS \"date!\", count(*)::integer AS \"count!\"\nFROM (\n  SELECT r.performed_on AS day\n  FROM maintenance.records AS r\n  JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id\n  WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on BETWEEN :from!::date AND :to!::date\n  UNION ALL\n  SELECT pa.due_on\n  FROM maintenance.plan_assets AS pa\n  JOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id\n  WHERE pa.workspace_id = :workspaceId! AND pa.due_on BETWEEN greatest(:from!::date, :today!::date) AND :to!::date\n) AS x\nGROUP BY x.day\nORDER BY x.day"};

/**
 * Query generated from SQL:
 * ```
 * -- El Calendario: cuántos de agendaMaintenance tiene cada día de :from a :to, sin ceros.
 * SELECT x.day::text AS "date!", count(*)::integer AS "count!"
 * FROM (
 *   SELECT r.performed_on AS day
 *   FROM maintenance.records AS r
 *   JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id
 *   WHERE r.workspace_id = :workspaceId! AND r.voided_at IS NULL AND r.performed_on BETWEEN :from!::date AND :to!::date
 *   UNION ALL
 *   SELECT pa.due_on
 *   FROM maintenance.plan_assets AS pa
 *   JOIN equipment.asset_directory AS a ON a.workspace_id = pa.workspace_id AND a.id = pa.asset_id
 *   WHERE pa.workspace_id = :workspaceId! AND pa.due_on BETWEEN greatest(:from!::date, :today!::date) AND :to!::date
 * ) AS x
 * GROUP BY x.day
 * ORDER BY x.day
 * ```
 */
export const maintenancePerDay = new PreparedQuery<IMaintenancePerDayParams,IMaintenancePerDayResult>(maintenancePerDayIR);


