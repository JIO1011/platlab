/**
 * Límites de Laboratorios que comparten varios contratos (ADR 0023). Viven aquí, sin dependencias, para que la
 * solicitud, lo apartado y el cierre de un bloque usen el mismo número sin importarse entre sí.
 */

/** Líneas de recursos de una solicitud; también el número de línea más alto de un bloque. */
export const REQUEST_MAX_LINES = 90;
