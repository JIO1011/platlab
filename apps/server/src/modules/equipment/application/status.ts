import type pg from 'pg';
import type { z } from 'zod';
import type { Asset, assetConservation, conditionChangeRequest, transferAssetRequest } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, requirePermission, requires, type CommandRequest, type WorkspaceAccess } from '../../core/index.js';
import { changeAssetCondition, insertConservationChange, moveAsset, setAssetConservation } from '../infrastructure/assets.queries.js';
import { CATALOG, CONDITION, lockActiveAsset, runCommand, TRANSFER } from './command.js';
import { assetById } from './queries.js';

/** Estado del equipo (ADR 0019, 01 §6.3): cambios de condición y traslados, con su historial. */

/**
 * Cambia la condición con motivo; volver a operativo exige un resultado. Dar de baja es del
 * Administrador (01 §5, «bajas») y es definitivo. Quien registra el cambio es su responsable.
 */
export function changeCondition(
  pool: pg.Pool,
  request: CommandRequest,
  assetId: string,
  input: z.infer<typeof conditionChangeRequest>,
): Promise<Asset> {
  return runCommand(
    pool,
    request,
    'equipment.asset.condition',
    { assetId, ...input },
    async (access) => {
      await requirePermission(access, CONDITION);
      if (input.condition === 'retired') await requirePermission(access, CATALOG);
    },
    async (access) => {
      const asset = await lockActiveAsset(access, assetId);
      if (asset.condition === input.condition) throw new AppError('VALIDATION_FAILED', 'El equipo ya está en esa condición');
      await changeAssetCondition.run(
        {
          workspaceId: access.workspace.id,
          assetId,
          fromCondition: asset.condition,
          toCondition: input.condition,
          reason: input.reason,
          result: input.result ?? null,
          actorId: access.principalId,
          caseId: null,
        },
        access.client,
      );
      await recordAudit(access, {
        action: 'equipment.asset.condition',
        entityType: 'equipment.asset',
        entityId: assetId,
        changes: { condition: { from: asset.condition, to: input.condition }, reason: input.reason, result: input.result ?? null },
      });
      return assetById(access, assetId);
    },
  );
}

/** Traslado trazado (01 §6.3): cambia la ubicación y queda en el historial. */
export function transferAsset(
  pool: pg.Pool,
  request: CommandRequest,
  assetId: string,
  input: z.infer<typeof transferAssetRequest>,
): Promise<Asset> {
  return runCommand(pool, request, 'equipment.asset.transfer', { assetId, ...input }, requires(TRANSFER), async (access) => {
    const asset = await lockActiveAsset(access, assetId);
    if (asset.location_id === input.locationId) throw new AppError('VALIDATION_FAILED', 'El equipo ya está en esa ubicación');
    const [moved] = await moveAsset.run(
      {
        workspaceId: access.workspace.id,
        assetId,
        fromLocationId: asset.location_id,
        toLocationId: input.locationId,
        note: input.note ?? null,
        actorId: access.principalId,
      },
      access.client,
    );
    if (!moved) throw new AppError('VALIDATION_FAILED', 'La ubicación no existe o está archivada');
    await recordAudit(access, {
      action: 'equipment.asset.transfer',
      entityType: 'equipment.asset',
      entityId: assetId,
      changes: { location: { from: asset.location_id, to: input.locationId }, note: input.note ?? null },
    });
    return assetById(access, assetId);
  });
}

/**
 * Interfaz para otros módulos (ADR 0020): dentro de su comando, admitido también con Equipos, exige
 * que el equipo exista y no esté dado de baja, y lo deja bloqueado hasta el final de la transacción.
 */
export async function requireActiveAsset(access: WorkspaceAccess, assetId: string): Promise<void> {
  await lockActiveAsset(access, assetId);
}

/**
 * Interfaz para otros módulos (ADR 0020): aplica el estado físico observado con el permiso de Equipos,
 * su historial y la auditoría de la ficha. Si no cambia, no hace nada.
 */
export async function recordConservation(
  access: WorkspaceAccess,
  assetId: string,
  conservation: z.infer<typeof assetConservation>,
): Promise<void> {
  await requirePermission(access, CONDITION);
  const asset = await lockActiveAsset(access, assetId);
  if (asset.conservation === conservation) return;
  await setAssetConservation.run({ workspaceId: access.workspace.id, assetId, conservation }, access.client);
  await insertConservationChange.run(
    {
      workspaceId: access.workspace.id,
      assetId,
      fromConservation: asset.conservation,
      toConservation: conservation,
      actorId: access.principalId,
    },
    access.client,
  );
  await recordAudit(access, {
    action: 'equipment.asset.update',
    entityType: 'equipment.asset',
    entityId: assetId,
    changes: { conservation: { from: asset.conservation, to: conservation } },
  });
}
