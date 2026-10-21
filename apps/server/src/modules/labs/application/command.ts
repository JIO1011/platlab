import { moduleCommand, moduleQuery } from '../../core/index.js';

/** Permisos de Laboratorios (manifiesto, ADR 0023): Administrador, Operador y Docente consultan. */
const READ = 'labs.space.read';
/** Espacios, cierres y anticipación: el Administrador. */
export const SPACE_MANAGE = 'labs.space.manage';
/** El Formato de solicitud: el Administrador. */
export const FORM_MANAGE = 'labs.form.manage';

/** Comandos de Laboratorios: una transacción con su admisión, permiso, idempotencia y auditoría. */
export const runCommand = moduleCommand('labs');

/** Consultas de Laboratorios: admisión de consulta y lectura de los espacios (también el Formato, que el Docente llenará en L-01b). */
export const runQuery = moduleQuery('labs', READ);
