import type pg from 'pg';
import type { z } from 'zod';
import type {
  Asset,
  AssetHistory,
  AssetList,
  assetListQuery,
  AssetTotals,
  AssetTypeList,
  LocationList,
  ResponsibleList,
} from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import { activeLocations, hasPermission, type HomeContribution, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  assetTotals,
  equipmentSummary,
  listAssetHistory,
  listAssets as listAssetsQuery,
  listAssetTypes,
  listResponsibles as listResponsiblesQuery,
  type IListAssetHistoryResult,
  type IListAssetsResult,
} from '../infrastructure/assets.queries.js';
import { FAULT_MANAGE, runQuery } from './command.js';
import { assetFilterParams, type AssetFilters } from './filters.js';

/** Hechos del historial de un equipo que se devuelven (02 §12 no fija otro límite). */
const HISTORY_LIMIT = 200;

export const toAsset = (row: IListAssetsResult): Asset => ({
  id: row.id,
  code: row.code,
  name: row.name,
  type: { id: row.type_id, name: row.type_name },
  brand: row.brand,
  model: row.model,
  serialNumber: row.serial_number,
  powerSupply: row.power_supply,
  location: {
    id: row.location_id,
    code: row.location_code,
    name: row.location_name,
    path: row.location_path,
    areaId: row.location_area_id,
  },
  responsible:
    row.responsible_principal_id && row.responsible_name
      ? { id: row.responsible_principal_id, name: row.responsible_name }
      : null,
  condition: row.condition as Asset['condition'],
  conservation: row.conservation as Asset['conservation'],
  availability: row.availability as Asset['availability'],
  supplier: row.supplier,
  acquiredOn: row.acquired_on,
  warrantyUntil: row.warranty_until,
  usefulLifeYears: row.useful_life_years,
  replacementValue: row.replacement_value,
  photoUrl: row.photo_url,
  createdAt: row.created_at.toISOString(),
});

/** Ficha de un equipo del espacio, también dado de baja; NOT_FOUND si no es de este espacio. */
export async function assetById(access: WorkspaceAccess, assetId: string): Promise<Asset> {
  const [row] = await listAssetsQuery.run({ workspaceId: access.workspace.id, assetId, limit: 1 }, access.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toAsset(row);
}

export function getAsset(pool: pg.Pool, request: QueryRequest, assetId: string): Promise<Asset> {
  return runQuery(pool, request, (access) => assetById(access, assetId));
}

/** Inventario e Informe (ADR 0019): página por código, con búsqueda y filtros de varios valores. */
export function listAssets(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof assetListQuery>): Promise<AssetList> {
  return runQuery(pool, request, async (access) => {
    // El código en minúsculas es único en el espacio: basta como cursor (índice assets_code).
    const after = decodeCursor(query.cursor, 1);
    const rows = await listAssetsQuery.run(
      {
        workspaceId: access.workspace.id,
        ...assetFilterParams(access.workspace.timeZone, query),
        afterCode: after?.[0] ?? null,
        limit: query.limit + 1,
      },
      access.client,
    );
    const visible = rows.slice(0, query.limit);
    const last = visible.at(-1);
    return {
      items: visible.map(toAsset),
      nextCursor: rows.length > query.limit && last ? encodeCursor([last.sort_code]) : null,
    };
  });
}

/** Indicadores del Informe (E-01c): se recalculan con sus filtros. */
export function getAssetTotals(pool: pg.Pool, request: QueryRequest, filters: AssetFilters): Promise<AssetTotals> {
  return runQuery(pool, request, async (access) => {
    const [row] = await assetTotals.run(
      { workspaceId: access.workspace.id, ...assetFilterParams(access.workspace.timeZone, filters) },
      access.client,
    );
    if (!row) throw new Error('Los indicadores no devolvieron fila');
    return {
      count: row.count,
      replacementValue: row.replacement_value,
      withReplacementValue: row.with_replacement_value,
      withoutResponsible: row.without_responsible,
      warrantyExpiring: row.warranty_expiring,
      usefulLifeReached: row.useful_life_reached,
    };
  });
}

const toEvent = (row: IListAssetHistoryResult): AssetHistory['items'][number] => {
  const base = { occurredAt: row.occurred_at.toISOString(), actor: row.actor };
  if (row.kind === 'condition') {
    return {
      kind: 'condition',
      ...base,
      from: row.from_value as Asset['condition'],
      to: row.to_value as Asset['condition'],
      reason: row.reason ?? '',
      result: row.result,
    };
  }
  if (row.kind === 'conservation') {
    return {
      kind: 'conservation',
      ...base,
      from: row.from_value as Asset['conservation'],
      to: row.to_value as Asset['conservation'],
    };
  }
  if (row.kind === 'transfer') {
    return { kind: 'transfer', ...base, from: row.from_value ?? '', to: row.to_value ?? '', note: row.note };
  }
  return { kind: 'created', ...base };
};

/** Historial del equipo (01 §6.3): alta, cambios de estado y de estado físico, y traslados, del más reciente al más antiguo. */
export function getAssetHistory(pool: pg.Pool, request: QueryRequest, assetId: string): Promise<AssetHistory> {
  return runQuery(pool, request, async (access) => {
    await assetById(access, assetId);
    const rows = await listAssetHistory.run(
      { workspaceId: access.workspace.id, assetId, limit: HISTORY_LIMIT },
      access.client,
    );
    return { items: rows.map(toEvent) };
  });
}

export function listTypes(pool: pg.Pool, request: QueryRequest): Promise<AssetTypeList> {
  return runQuery(pool, request, async (access) => ({
    items: await listAssetTypes.run({ workspaceId: access.workspace.id }, access.client),
  }));
}

/** Miembros activos que pueden ser responsables de un equipo. */
export function listResponsibles(pool: pg.Pool, request: QueryRequest): Promise<ResponsibleList> {
  return runQuery(pool, request, async (access) => ({
    items: await listResponsiblesQuery.run({ workspaceId: access.workspace.id }, access.client),
  }));
}

/** Ubicaciones activas del espacio, con su padre para armar los niveles (ADR 0015). */
export function listLocations(pool: pg.Pool, request: QueryRequest): Promise<LocationList> {
  return runQuery(pool, request, async (access) => ({ items: await activeLocations(access) }));
}

/**
 * Tarjeta de Inicio (01 §7) y Resumen: equipos sin los dados de baja, por condición, y fallas abiertas.
 * Lo pendiente depende de quién mira: quien atiende fallas, las que nadie atiende; quien solo reporta,
 * las suyas abiertas. La actividad llega con el Resumen completo (E-01d). Quien la llama ya autorizó.
 */
export async function equipmentHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  const [row] = await equipmentSummary.run(
    { workspaceId: access.workspace.id, principalId: access.principalId },
    access.client,
  );
  const attends = await hasPermission(access, FAULT_MANAGE);
  return {
    summary: {
      assets: Number(row?.assets ?? 0),
      operational: Number(row?.operational ?? 0),
      restricted: Number(row?.restricted ?? 0),
      faulted: Number(row?.faulted ?? 0),
      openFaults: Number(row?.open_faults ?? 0),
      pendingRequests: Number((attends ? row?.unattended_faults : row?.my_open_faults) ?? 0),
    },
    activity: [],
    trend: null,
  };
}

/** Resumen de la app de Equipos (ADR 0011): lo mismo que su tarjeta de Inicio. */
export function getSummary(pool: pg.Pool, request: QueryRequest): Promise<HomeContribution> {
  return runQuery(pool, request, equipmentHomeSummary);
}
