import type { WorkspaceAccess } from '../../core/index.js';
import { assetCodes as assetCodesQuery, operationalAssetsOfTypes as operationalAssetsOfTypesQuery, requestableAssetTypes as requestableAssetTypesQuery } from '../infrastructure/requestables.queries.js';

export interface RequestableAssetType {
  id: string;
  name: string;
  /** Equipos del tipo en condición operativa. */
  available: number;
}

/** Tipos de equipo que Laboratorios ofrece y valida en una solicitud (ADR 0023), sin reservar nada. */
export async function requestableAssetTypes(access: WorkspaceAccess, typeIds?: string[]): Promise<RequestableAssetType[]> {
  return requestableAssetTypesQuery.run({ workspaceId: access.workspace.id, typeIds: typeIds ?? null }, access.client);
}

/** Equipos operativos de esos tipos (código y nombre), para asignar los concretos a un bloque de Laboratorios. */
export async function operationalAssetsOfTypes(access: WorkspaceAccess, typeIds: readonly string[]) {
  if (typeIds.length === 0) return [];
  const rows = await operationalAssetsOfTypesQuery.run({ workspaceId: access.workspace.id, typeIds: [...typeIds] }, access.client);
  return rows.map((row) => ({ id: row.id, typeId: row.type_id, code: row.code, name: row.name }));
}

/** El código de cada equipo, para mostrar los apartados por un bloque de Laboratorios. */
export async function assetCodes(access: WorkspaceAccess, assetIds: readonly string[]): Promise<Map<string, string>> {
  if (assetIds.length === 0) return new Map();
  const rows = await assetCodesQuery.run({ workspaceId: access.workspace.id, assetIds: [...assetIds] }, access.client);
  return new Map(rows.map((row) => [row.id, row.code]));
}
