import { AppError } from '../../../platform/errors.js';
import { freeCodeFor } from '../../../platform/db/codes.js';
import {
  findActiveLocation,
  insertLocation,
  listActiveLocations,
  locationCodesLike,
  lockArea,
  setAreaManager,
} from '../infrastructure/locations.queries.js';
import type { WorkspaceAccess } from './access.js';
import { recordAudit } from './audit.js';

export interface LocationRecord {
  id: string;
  code: string;
  name: string;
  kind: string;
  parentId: string | null;
  /** false si ya existía con ese nombre bajo el mismo padre. */
  created: boolean;
}

/**
 * Tipo de una ubicación nueva según su padre (ADR 0015): laboratorio o bodega en la raíz o bajo una
 * sede o un edificio; estante o nivel bajo otro. Bajo custodia o tránsito no se crean.
 */
function childKind(parentKind: string | null): 'room' | 'storage' {
  if (parentKind === null || parentKind === 'site' || parentKind === 'building') return 'room';
  if (parentKind === 'room' || parentKind === 'storage') return 'storage';
  throw new AppError('VALIDATION_FAILED', 'No se crean ubicaciones dentro de una custodia o un tránsito');
}

/**
 * Crea una ubicación del espacio con código automático a partir del nombre (ADR 0015). Quien llama ya
 * comprobó su permiso; el bloqueo de códigos es el mismo que serializa los cambios del árbol.
 */
async function createLocation(
  access: WorkspaceAccess,
  input: { name: string; parentId: string | null },
): Promise<LocationRecord> {
  const workspaceId = access.workspace.id;
  let parentKind: string | null = null;
  if (input.parentId !== null) {
    const [parent] = await findActiveLocation.run({ workspaceId, locationId: input.parentId }, access.client);
    if (!parent) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    parentKind = parent.kind;
  }
  const kind = childKind(parentKind);
  const code = await freeCodeFor(access.client, {
    lockKey: `core.locations/${workspaceId}`,
    name: input.name,
    fallback: 'UBICACION',
    takenLike: async (base) =>
      (await locationCodesLike.run({ workspaceId, base }, access.client)).map((row) => row.code),
  });
  const [row] = await insertLocation.run(
    { workspaceId, parentId: input.parentId, kind, code, name: input.name },
    access.client,
  );
  if (!row) throw new Error('La ubicación no devolvió fila');
  return { id: row.id, code: row.code, name: row.name, kind: row.kind, parentId: row.parent_id, created: row.created };
}

/** Ubicación activa con su área y, si es un área, su encargado (ADR 0019, E-01c). */
export interface ActiveLocation extends Omit<LocationRecord, 'created'> {
  areaId: string;
  managerId: string | null;
}

/** Ubicaciones activas del espacio, con su padre para armar los niveles (ADR 0015) y su área. */
export async function activeLocations(access: WorkspaceAccess): Promise<ActiveLocation[]> {
  const rows = await listActiveLocations.run({ workspaceId: access.workspace.id }, access.client);
  return rows.map(({ id, code, name, kind, parent_id, area_id, manager_principal_id }) => ({
    id,
    code,
    name,
    kind,
    parentId: parent_id,
    areaId: area_id,
    managerId: manager_principal_id,
  }));
}

/**
 * Asigna o quita el encargado de un área (ADR 0019, E-01c) y lo audita con la acción del módulo que
 * llama, que ya exigió su permiso: Core no tiene permisos propios. El área queda bloqueada hasta el
 * final de la transacción; sin cambio, no escribe ni audita.
 */
export async function assignAreaManager(
  access: WorkspaceAccess,
  input: { areaId: string; managerId: string | null },
  action: string,
): Promise<{ areaId: string; managerId: string | null }> {
  const workspaceId = access.workspace.id;
  const [area] = await lockArea.run({ workspaceId, areaId: input.areaId, managerId: input.managerId }, access.client);
  if (!area) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  if (!area.manager_ok) throw new AppError('VALIDATION_FAILED', 'El encargado debe ser un miembro activo del espacio');
  if (area.manager_principal_id !== input.managerId) {
    await setAreaManager.run({ workspaceId, areaId: input.areaId, managerId: input.managerId }, access.client);
    await recordAudit(access, {
      action,
      entityType: 'core.location',
      entityId: input.areaId,
      changes: { managerId: { from: area.manager_principal_id, to: input.managerId } },
    });
  }
  return { areaId: input.areaId, managerId: input.managerId };
}

/**
 * Crea la ubicación desde un módulo (ADR 0015) y la audita con la acción de ese módulo: Core no tiene
 * permisos propios, así que quien llama ya exigió el permiso de catálogo del módulo.
 */
export async function createAuditedLocation(
  access: WorkspaceAccess,
  input: { name: string; parentId: string | null },
  action: string,
): Promise<Omit<LocationRecord, 'created'>> {
  const { created, ...location } = await createLocation(access, input);
  await recordAudit(access, { action, entityType: 'core.location', entityId: location.id, changes: { ...location, created } });
  return location;
}
