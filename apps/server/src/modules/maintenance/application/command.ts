import { AppError } from '../../../platform/errors.js';
import { moduleCommand, moduleQuery } from '../../core/index.js';

/** Permisos de Mantenimiento (manifiesto, ADR 0020): Administrador y Operador consultan y registran. */
const READ = 'maintenance.work.read';
export const RECORD = 'maintenance.work.record';
/** Planes y proveedores: el Administrador. */
export const PLAN_MANAGE = 'maintenance.plan.manage';
/** Anular y corregir registros: el Administrador (M-01b). */
export const VOID = 'maintenance.record.void';
/** Descartar «Evaluar reemplazo»: el Administrador (M-01c). */
export const REVIEW = 'maintenance.replacement.review';
/** El Excel del Historial: un reporte del Administrador (01 §5, M-01d). */
export const REPORT = 'maintenance.report.export';

/** Comandos de Mantenimiento: una transacción con su admisión, permiso, idempotencia y auditoría. */
export const runCommand = moduleCommand('maintenance');

/**
 * Registrar y corregir escriben también por la interfaz de Equipos (el estado físico y el incidente que
 * soluciona un correctivo, ADR 0020): se admiten con los dos módulos en la misma consulta.
 */
export const runRecordCommand = moduleCommand('maintenance', 'equipment');

/** Consultas de Mantenimiento: admisión de consulta y lectura del trabajo. */
export const runQuery = moduleQuery('maintenance', READ);

/**
 * Edición con la versión que la persona vio (02): un recurso archivado no se modifica, y uno que otra
 * persona cambió antes responde VERSION_CONFLICT.
 */
export function requireEditable(
  row: { archived_at: Date | null; version: number } | undefined,
  expectedVersion?: number,
): asserts row is { archived_at: null; version: number } {
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  if (row.archived_at) throw new AppError('VALIDATION_FAILED', 'Lo archivado no se modifica');
  if (expectedVersion !== undefined && row.version !== expectedVersion) {
    throw new AppError('VERSION_CONFLICT', 'Otra persona lo cambió mientras editabas: vuelve a cargarlo');
  }
}
