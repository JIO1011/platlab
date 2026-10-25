import { moduleCommand, moduleQuery } from '../../core/index.js';

/** Permisos de Laboratorios (manifiesto, ADR 0023): Administrador, Operador y Docente consultan. */
const READ = 'labs.read';
/** Espacios, cierres y anticipación: el Administrador. */
export const SPACE_MANAGE = 'labs.space.manage';
/** El Formato de solicitud: el Administrador. */
export const FORM_MANAGE = 'labs.form.manage';
/** Pedir: el Docente, el tesista y el Administrador (ADR 0023, «Reglas de L-01b»). */
export const REQUEST_CREATE = 'labs.request.create';
/** Consultar las recibidas: el Operador y el Administrador. */
export const REQUEST_VIEW = 'labs.request.view';
/** Pedir cambios y rechazar: el Administrador. */
export const REQUEST_REVIEW = 'labs.request.review';
/** Programar y mover bloques del Cronograma: el Administrador (L-01c). */
export const SCHEDULE_MANAGE = 'labs.schedule.manage';
/** Llevar un bloque como responsable: el Operador y el Administrador. */
export const SCHEDULE_LEAD = 'labs.schedule.lead';

/** Comandos de Laboratorios: una transacción con su admisión, permiso, idempotencia y auditoría. */
export const runCommand = moduleCommand('labs');

/** Consultas de Laboratorios: admisión de consulta y lectura de los espacios y los Formatos, que quien pide llena. */
export const runQuery = moduleQuery('labs', READ);
