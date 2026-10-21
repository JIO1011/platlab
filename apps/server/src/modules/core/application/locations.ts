import type { Location } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { freeCodeFor, lockKey } from '../../../platform/db/codes.js';
import {
  archiveLocations,
  findActiveLocation,
  insertLocation,
  listActiveLocations,
  locationCodesLike,
  lockArea,
  lockLocation,
  lockLocationTree,
  setAreaManager,
  setLocationName,
  siblingNamed,
} from '../infrastructure/locations.queries.js';
import type { WorkspaceAccess } from './access.js';
import { recordAudit } from './audit.js';

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

/**
 * Serializa, por espacio, los códigos, los nombres y los archivos de las ubicaciones. Se toma antes que
 * cualquier fila de ubicación, para que el orden sea el mismo en todos los comandos.
 */
const treeLock = (access: WorkspaceAccess) => `core.locations/${access.workspace.id}`;

const nameTaken = (name: string) =>
  new AppError('NAME_TAKEN', `Ya existe «${name}» en ese nivel: elige otro nombre`);

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
 * Crea un área o un estante (ADR 0015, 0024) con código automático a partir del nombre. El bloqueo de
 * ubicaciones del espacio va primero y serializa códigos, nombres y archivos; después, el padre queda
 * bloqueado (compartido). Un nombre activo repetido bajo el mismo padre responde NAME_TAKEN.
 */
export async function createLocation(
  access: WorkspaceAccess,
  input: { name: string; parentId: string | null },
): Promise<Location> {
  const workspaceId = access.workspace.id;
  await lockKey(access.client, treeLock(access));
  let parentKind: string | null = null;
  if (input.parentId !== null) {
    const [parent] = await findActiveLocation.run({ workspaceId, locationId: input.parentId }, access.client);
    if (!parent) throw notFound();
    parentKind = parent.kind;
  }
  const kind = childKind(parentKind);
  const code = await freeCodeFor(access.client, {
    lockKey: treeLock(access),
    name: input.name,
    fallback: 'UBICACION',
    takenLike: async (base) =>
      (await locationCodesLike.run({ workspaceId, base }, access.client)).map((row) => row.code),
  });
  const [row] = await insertLocation.run(
    { workspaceId, parentId: input.parentId, kind, code, name: input.name },
    access.client,
  );
  if (!row) throw nameTaken(input.name);
  const location = { id: row.id, code: row.code, name: row.name, kind: row.kind, parentId: row.parent_id };
  await recordAudit(access, { action: 'core.location.create', entityType: 'core.location', entityId: row.id, changes: location });
  return location;
}

/**
 * Renombra la ubicación bloqueada; sin cambio, no escribe ni audita. El bloqueo de ubicaciones del espacio
 * va antes que la fila, en el mismo orden que el alta y el archivo.
 */
export async function renameLocation(access: WorkspaceAccess, locationId: string, name: string): Promise<{ id: string; name: string }> {
  const workspaceId = access.workspace.id;
  await lockKey(access.client, treeLock(access));
  const [location] = await lockLocation.run({ workspaceId, locationId }, access.client);
  if (!location) throw notFound();
  if (location.name === name) return { id: locationId, name };
  const [taken] = await siblingNamed.run({ workspaceId, parentId: location.parent_id, name, exceptId: locationId }, access.client);
  if (taken) throw nameTaken(taken.name);
  await setLocationName.run({ workspaceId, locationId, name }, access.client);
  await recordAudit(access, {
    action: 'core.location.rename',
    entityType: 'core.location',
    entityId: locationId,
    changes: { name: { from: location.name, to: name } },
  });
  return { id: locationId, name };
}

/** ¿Qué módulos tienen algo en estas ubicaciones? Lo responde la composición (ADR 0024). */
export type OccupantsOf = (access: WorkspaceAccess, locationIds: string[]) => Promise<string[]>;

/**
 * Archiva un área o un estante con toda su descendencia (ADR 0024). El bloqueo de ubicaciones del espacio
 * va primero: un estante creado al mismo tiempo ya está confirmado cuando se lee el árbol y no queda activo
 * bajo un área archivada. Después las bloquea en orden antes de preguntar a los módulos, así un ingreso,
 * un traslado o un alta simultáneos esperan y la encuentran archivada, o terminan antes y el archivo los
 * ve. Con algo dentro, se rechaza: primero se traslada.
 */
export async function archiveLocation(
  access: WorkspaceAccess,
  locationId: string,
  occupantsOf: OccupantsOf,
): Promise<{ ids: string[] }> {
  const workspaceId = access.workspace.id;
  await lockKey(access.client, treeLock(access));
  const tree = await lockLocationTree.run({ workspaceId, locationId }, access.client);
  const root = tree.find((row) => row.id === locationId);
  if (!root) throw notFound();
  if (root.kind === 'site' || root.kind === 'building') {
    throw new AppError('VALIDATION_FAILED', 'Desde Áreas se archivan áreas y estantes, no una sede ni un edificio');
  }
  const ids = tree.map((row) => row.id);
  const occupants = await occupantsOf(access, ids);
  if (occupants.length > 0) {
    throw new AppError(
      'VALIDATION_FAILED',
      `«${root.name}» todavía guarda ${occupants.join(' y ')}: trasládalos antes de archivarla`,
    );
  }
  await archiveLocations.run({ workspaceId, locationIds: ids }, access.client);
  await recordAudit(access, { action: 'core.location.archive', entityType: 'core.location', entityId: locationId, changes: { ids } });
  return { ids };
}

/** Ubicación activa con su área y, si es un área, su encargado (ADR 0019, E-01c). */
export interface ActiveLocation extends Location {
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
 * Asigna o quita el encargado de un área (ADR 0019, E-01c; desde Áreas, ADR 0024). El área queda
 * bloqueada hasta el final de la transacción; sin cambio, no escribe ni audita.
 */
export async function assignAreaManager(
  access: WorkspaceAccess,
  input: { areaId: string; managerId: string | null },
): Promise<{ areaId: string; managerId: string | null }> {
  const workspaceId = access.workspace.id;
  const [area] = await lockArea.run({ workspaceId, areaId: input.areaId, managerId: input.managerId }, access.client);
  if (!area) throw notFound();
  if (!area.manager_ok) throw new AppError('VALIDATION_FAILED', 'El encargado debe ser un miembro activo del espacio');
  if (area.manager_principal_id !== input.managerId) {
    await setAreaManager.run({ workspaceId, areaId: input.areaId, managerId: input.managerId }, access.client);
    await recordAudit(access, {
      action: 'core.area.manager',
      entityType: 'core.location',
      entityId: input.areaId,
      changes: { managerId: { from: area.manager_principal_id, to: input.managerId } },
    });
  }
  return { areaId: input.areaId, managerId: input.managerId };
}
