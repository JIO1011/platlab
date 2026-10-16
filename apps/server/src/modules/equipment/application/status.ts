import type pg from 'pg';
import type { z } from 'zod';
import type { Asset, conditionChangeRequest, transferAssetRequest } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, requirePermission, requires, type CommandRequest } from '../../core/index.js';
import { changeAssetCondition, moveAsset } from '../infrastructure/assets.queries.js';
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
