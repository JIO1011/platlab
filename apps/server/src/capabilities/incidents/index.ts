/**
 * Interfaz pública de la capacidad incidencias (ADR 0019, 02 §3–§4). No tiene rutas propias: la usan
 * los módulos dueños de cada recurso, con sus rutas y permisos, dentro de su transacción admitida.
 */
export {
  attendFault,
  lockFault,
  reportCase,
  resolveFault,
  type IncidentsContext,
} from './application/cases.js';
