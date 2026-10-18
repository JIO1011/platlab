import type pg from 'pg';
import type { z } from 'zod';
import type { createProviderRequest, Provider, ProviderList, updateProviderRequest } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, requires, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  archiveProvider as archiveProviderQuery,
  insertProvider,
  listProviders as listProvidersQuery,
  lockProvider,
  updateProvider as updateProviderQuery,
  type IListProvidersResult,
} from '../infrastructure/providers.queries.js';
import { PLAN_MANAGE, requireEditable, runCommand, runQuery } from './command.js';

/** Proveedores de servicio (ADR 0020): los crea, edita y archiva el Administrador; quien registra los elige. */

const toProvider = (row: IListProvidersResult): Provider => ({
  id: row.id,
  name: row.name,
  contact: row.contact,
  archivedAt: row.archived_at?.toISOString() ?? null,
  version: row.version,
});

async function providerById(access: WorkspaceAccess, providerId: string): Promise<Provider> {
  const [row] = await listProvidersQuery.run({ workspaceId: access.workspace.id, providerId }, access.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toProvider(row);
}

/** Un nombre activo repetido (providers_name), también si otra persona lo tomó a la vez, es NAME_TAKEN. */
async function withUniqueName<T>(name: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if ((error as { constraint?: unknown }).constraint === 'providers_name') {
      throw new AppError('NAME_TAKEN', `Ya existe el proveedor «${name}»`);
    }
    throw error;
  }
}

/** Los activos, para la lista de Planes y para elegir al registrar. */
export function listProviders(pool: pg.Pool, request: QueryRequest): Promise<ProviderList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listProvidersQuery.run({ workspaceId: access.workspace.id, providerId: null }, access.client);
    return { items: rows.map(toProvider) };
  });
}

export function createProvider(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof createProviderRequest>): Promise<Provider> {
  return runCommand(pool, request, 'maintenance.provider.create', input, requires(PLAN_MANAGE), async (access) => {
    const [created] = await withUniqueName(input.name, () =>
      insertProvider.run({ workspaceId: access.workspace.id, name: input.name, contact: input.contact }, access.client),
    );
    await recordAudit(access, { action: 'maintenance.provider.create', entityType: 'maintenance.provider', entityId: created!.id, changes: input });
    return providerById(access, created!.id);
  });
}

/** Cambia solo lo que llega, con la versión que la persona vio. */
export function updateProvider(
  pool: pg.Pool,
  request: CommandRequest,
  providerId: string,
  { expectedVersion, ...changes }: z.infer<typeof updateProviderRequest>,
): Promise<Provider> {
  return runCommand(pool, request, 'maintenance.provider.update', { providerId, expectedVersion, ...changes }, requires(PLAN_MANAGE), async (access) => {
    const [current] = await lockProvider.run({ workspaceId: access.workspace.id, providerId }, access.client);
    requireEditable(current, expectedVersion);
    const name = changes.name ?? current.name;
    await withUniqueName(name, () =>
      updateProviderQuery.run(
        { workspaceId: access.workspace.id, providerId, name, contact: changes.contact === undefined ? current.contact : changes.contact },
        access.client,
      ),
    );
    await recordAudit(access, { action: 'maintenance.provider.update', entityType: 'maintenance.provider', entityId: providerId, changes });
    return providerById(access, providerId);
  });
}

/** Deja de ofrecerse al registrar; los registros hechos con él lo conservan. */
export function archiveProvider(pool: pg.Pool, request: CommandRequest, providerId: string): Promise<Provider> {
  return runCommand(pool, request, 'maintenance.provider.archive', { providerId }, requires(PLAN_MANAGE), async (access) => {
    const [current] = await lockProvider.run({ workspaceId: access.workspace.id, providerId }, access.client);
    requireEditable(current);
    await archiveProviderQuery.run({ workspaceId: access.workspace.id, providerId }, access.client);
    await recordAudit(access, { action: 'maintenance.provider.archive', entityType: 'maintenance.provider', entityId: providerId, changes: { archived: true } });
    return providerById(access, providerId);
  });
}
