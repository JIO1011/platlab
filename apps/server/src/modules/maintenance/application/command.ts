import { moduleCommand, moduleQuery, type WorkspaceAccess } from '../../core/index.js';
import { workspaceToday as workspaceTodayQuery } from '../infrastructure/work.queries.js';

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

/** Hoy en la zona del espacio, por el reloj de la base: el mismo con que las consultas calculan las fechas. */
export async function workspaceToday(access: WorkspaceAccess): Promise<string> {
  const [row] = await workspaceTodayQuery.run({ timeZone: access.workspace.timeZone }, access.client);
  // Un SELECT sin FROM devuelve siempre una fila.
  return row!.today;
}
