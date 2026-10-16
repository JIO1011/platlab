import type pg from 'pg';
import type { z } from 'zod';
import {
  assetRuleViolation,
  type Asset,
  type AssetType,
  type createAssetTypeRequest,
  type createLocationRequest,
  type Location,
  type newAsset,
  type updateAssetRequest,
} from '@platlab/contracts';
import { freeCodeFor, lockKey } from '../../../platform/db/codes.js';
import { AppError } from '../../../platform/errors.js';
import { definedFields } from '../../../platform/objects.js';
import { createAuditedLocation, recordAudit, requires, type CommandRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  activeTypeNamed,
  archiveAssetType as archiveAssetTypeQuery,
  assetCodesLike,
  assetCodeTaken,
  assetReferences,
  insertAsset,
  insertAssetType,
  updateAssetFields,
  type IAssetReferencesParams,
} from '../infrastructure/assets.queries.js';
import { CATALOG, lockActiveAsset, runCommand } from './command.js';
import { assetById } from './queries.js';

/** Catálogo de Equipos (ADR 0019): tipos, alta y ficha del equipo, y ubicaciones de Core. */

/** Serializa, por espacio, los códigos automáticos y los cambios de código. */
const codesLock = (access: WorkspaceAccess) => `equipment.assets/${access.workspace.id}`;

/** POST /asset-types: un nombre activo no se repite, sin tildes ni mayúsculas (lo decide su índice). */
export function createAssetType(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof createAssetTypeRequest>,
): Promise<AssetType> {
  return runCommand(pool, request, 'equipment.type.create', input, requires(CATALOG), async (access) => {
    const [type] = await insertAssetType.run({ workspaceId: access.workspace.id, name: input.name }, access.client);
    if (!type) {
      const [taken] = await activeTypeNamed.run({ workspaceId: access.workspace.id, name: input.name }, access.client);
      throw new AppError('NAME_TAKEN', `Ya existe el tipo «${taken?.name ?? input.name}»: elígelo de la lista`);
    }
    await recordAudit(access, {
      action: 'equipment.type.create',
      entityType: 'equipment.asset_type',
      entityId: type.id,
      changes: { ...type },
    });
    return type;
  });
}

/** Archiva un tipo: sus equipos lo conservan y deja de ofrecerse en el alta. */
export function archiveAssetType(pool: pg.Pool, request: CommandRequest, typeId: string): Promise<AssetType> {
  return runCommand(pool, request, 'equipment.type.archive', { typeId }, requires(CATALOG), async (access) => {
    const [type] = await archiveAssetTypeQuery.run({ workspaceId: access.workspace.id, typeId }, access.client);
    if (!type) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    await recordAudit(access, {
      action: 'equipment.type.archive',
      entityType: 'equipment.asset_type',
      entityId: type.id,
      changes: { archived: true },
    });
    return type;
  });
}

/** Valida en un viaje tipo, ubicación y responsable; lo que no se envía no se comprueba. */
async function requireReferences(
  access: WorkspaceAccess,
  references: Omit<IAssetReferencesParams, 'workspaceId'>,
): Promise<void> {
  const [row] = await assetReferences.run({ ...references, workspaceId: access.workspace.id }, access.client);
  if (!row?.type_ok) throw new AppError('VALIDATION_FAILED', 'El tipo de equipo no existe o está archivado');
  if (!row.location_ok) throw new AppError('VALIDATION_FAILED', 'La ubicación no existe o está archivada');
  if (!row.responsible_ok) throw new AppError('VALIDATION_FAILED', 'El responsable no es un miembro activo del espacio');
}

const codeTaken = (code: string) => new AppError('CODE_TAKEN', `El código ${code} ya existe en el espacio`);

/**
 * El código enviado o uno automático a partir del nombre (ADR 0015). El enviado no se comprueba
 * antes: si está ocupado, el alta no inserta nada (assets_code) y responde CODE_TAKEN.
 */
function assetCode(access: WorkspaceAccess, input: { code?: string | undefined; name: string }): Promise<string> | string {
  if (input.code !== undefined) return input.code;
  return freeCodeFor(access.client, {
    lockKey: codesLock(access),
    name: input.name,
    fallback: 'EQUIPO',
    takenLike: async (base) =>
      (await assetCodesLike.run({ workspaceId: access.workspace.id, base }, access.client)).map((row) => row.code),
  });
}

function requireRules(asset: { acquiredOn: string | null; warrantyUntil: string | null }): void {
  const violation = assetRuleViolation(asset);
  if (violation) throw new AppError('VALIDATION_FAILED', violation);
}

/** POST /assets: alta en una ventana (ADR 0019), con su ubicación, su tipo y su responsable activos. */
export function createAsset(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof newAsset>): Promise<Asset> {
  return runCommand(pool, request, 'equipment.asset.create', input, requires(CATALOG), async (access) => {
    const fields = {
      brand: input.brand ?? null,
      model: input.model ?? null,
      serialNumber: input.serialNumber ?? null,
      powerSupply: input.powerSupply ?? null,
      responsibleId: input.responsibleId ?? null,
      conservation: input.conservation ?? null,
      supplier: input.supplier ?? null,
      acquiredOn: input.acquiredOn ?? null,
      warrantyUntil: input.warrantyUntil ?? null,
      usefulLifeYears: input.usefulLifeYears ?? null,
      replacementValue: input.replacementValue ?? null,
    };
    requireRules(fields);
    await requireReferences(access, { typeId: input.typeId, locationId: input.locationId, responsibleId: fields.responsibleId });
    const code = await assetCode(access, input);
    const [row] = await insertAsset.run(
      {
        ...fields,
        workspaceId: access.workspace.id,
        typeId: input.typeId,
        code,
        name: input.name,
        locationId: input.locationId,
        condition: input.condition,
        createdBy: access.principalId,
      },
      access.client,
    );
    if (!row) throw codeTaken(code);
    const asset = await assetById(access, row.id);
    await recordAudit(access, {
      action: 'equipment.asset.create',
      entityType: 'equipment.asset',
      entityId: asset.id,
      changes: { ...asset },
    });
    return asset;
  });
}

/**
 * Edita la ficha con el equipo bloqueado: cambia solo lo enviado, valida la ficha combinada y audita
 * lo que cambió, antes y después. Ubicación y condición cambian por sus comandos.
 */
export function updateAsset(
  pool: pg.Pool,
  request: CommandRequest,
  assetId: string,
  input: z.infer<typeof updateAssetRequest>,
): Promise<Asset> {
  return runCommand(pool, request, 'equipment.asset.update', { assetId, ...input }, requires(CATALOG), async (access) => {
    const locked = await lockActiveAsset(access, assetId);
    const before = {
      name: locked.name,
      typeId: locked.type_id,
      code: locked.code,
      brand: locked.brand,
      model: locked.model,
      serialNumber: locked.serial_number,
      powerSupply: locked.power_supply,
      responsibleId: locked.responsible_principal_id,
      conservation: locked.conservation,
      supplier: locked.supplier,
      acquiredOn: locked.acquired_on,
      warrantyUntil: locked.warranty_until,
      usefulLifeYears: locked.useful_life_years,
      replacementValue: locked.replacement_value,
    };
    const after = { ...before, ...definedFields(input) };
    requireRules(after);
    const typeId = after.typeId !== before.typeId ? after.typeId : null;
    const responsibleId = after.responsibleId !== before.responsibleId ? after.responsibleId : null;
    if (typeId !== null || responsibleId !== null) await requireReferences(access, { typeId, locationId: null, responsibleId });
    // Un código nuevo se comprueba bajo el bloqueo de códigos: un UPDATE no tiene ON CONFLICT.
    if (after.code.toLowerCase() !== before.code.toLowerCase()) {
      await lockKey(access.client, codesLock(access));
      const [taken] = await assetCodeTaken.run({ workspaceId: access.workspace.id, code: after.code, exceptId: assetId }, access.client);
      if (taken) throw codeTaken(taken.code);
    }
    await updateAssetFields.run({ ...after, workspaceId: access.workspace.id, assetId }, access.client);
    const changes = Object.fromEntries(
      (Object.keys(before) as Array<keyof typeof before>)
        .filter((field) => before[field] !== after[field])
        .map((field) => [field, { from: before[field], to: after[field] }]),
    );
    await recordAudit(access, { action: 'equipment.asset.update', entityType: 'equipment.asset', entityId: assetId, changes });
    return assetById(access, assetId);
  });
}

/** Crea una ubicación de Core desde Equipos (ADR 0015) con el permiso de catálogo del módulo. */
export function createEquipmentLocation(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof createLocationRequest>,
): Promise<Location> {
  return runCommand(pool, request, 'equipment.location.create', input, requires(CATALOG), (access) =>
    createAuditedLocation(access, input, 'equipment.location.create'),
  );
}
