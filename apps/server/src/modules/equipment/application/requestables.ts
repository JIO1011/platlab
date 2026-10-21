import type { WorkspaceAccess } from '../../core/index.js';
import { requestableAssetTypes as requestableAssetTypesQuery } from '../infrastructure/requestables.queries.js';

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
