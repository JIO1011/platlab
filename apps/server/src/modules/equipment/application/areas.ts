import type pg from 'pg';
import type { AreaList, AreaTypeList } from '@platlab/contracts';
import type { QueryRequest } from '../../core/index.js';
import { listAreas as listAreasQuery, listAreaTypes } from '../infrastructure/areas.queries.js';
import { runQuery } from './command.js';

/** Tarjetas del Inventario (ADR 0019, E-01c): áreas con equipos, su encargado y sus cifras. */
export function listAreas(pool: pg.Pool, request: QueryRequest): Promise<AreaList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listAreasQuery.run({ workspaceId: access.workspace.id }, access.client);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        parentName: row.parent_name,
        manager:
          row.manager_principal_id && row.manager_name ? { id: row.manager_principal_id, name: row.manager_name } : null,
        total: row.total,
        faulted: row.faulted,
        restricted: row.restricted,
        retired: row.retired,
      })),
    };
  });
}

/** El área agrupada por tipo (E-01c): «Microscopio óptico ×50» con sus cifras por estado. */
export function listTypesOfArea(pool: pg.Pool, request: QueryRequest, areaId: string): Promise<AreaTypeList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listAreaTypes.run({ workspaceId: access.workspace.id, areaId }, access.client);
    return {
      items: rows.map((row) => ({
        type: { id: row.id, name: row.name },
        total: row.total,
        operational: row.operational,
        restricted: row.restricted,
        faulted: row.faulted,
        photoUrl: row.photo_url,
      })),
    };
  });
}
