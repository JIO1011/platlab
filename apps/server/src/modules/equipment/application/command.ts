import { AppError } from '../../../platform/errors.js';
import { moduleCommand, moduleQuery, type WorkspaceAccess } from '../../core/index.js';
import { lockAsset, type ILockAssetResult } from '../infrastructure/assets.queries.js';

/** Permisos de Equipos (manifiesto, ADR 0019; matriz de 01 §5). */
const READ = 'equipment.catalog.read';
/** Tipos, alta y ficha del equipo, ubicaciones y bajas: Administrador y Propietario. */
export const CATALOG = 'equipment.catalog.manage';
export const CONDITION = 'equipment.condition.change';
export const TRANSFER = 'equipment.transfer.create';
/** Incidentes: todos reportan; el Operador y el Administrador empiezan la reparación y los solucionan. */
export const FAULT_REPORT = 'equipment.fault.report';
export const FAULT_MANAGE = 'equipment.fault.manage';
/** Exportar el Informe es un reporte (01 §5): Administrador y Propietario. */
export const REPORT = 'equipment.report.read';

/** Comandos de Equipos: una transacción con su admisión, permiso, idempotencia y auditoría. */
export const runCommand = moduleCommand('equipment');

/** Consultas de Equipos: admisión de consulta y lectura del catálogo. */
export const runQuery = moduleQuery('equipment', READ);

/**
 * Bloquea el equipo, lo último del orden de bloqueo (02 §6). Un equipo dado de baja es definitivo
 * (ADR 0019): no se edita, no cambia de condición ni se traslada.
 */
export async function lockActiveAsset(access: WorkspaceAccess, assetId: string): Promise<ILockAssetResult> {
  const [asset] = await lockAsset.run({ workspaceId: access.workspace.id, assetId }, access.client);
  if (!asset) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  if (asset.condition === 'retired') throw new AppError('VALIDATION_FAILED', 'Un equipo dado de baja no se modifica');
  return asset;
}
