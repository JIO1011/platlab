/**
 * El presupuesto de la hoja A4 impresa (ADR 0023): cuántas filas vacías de Recursos caben tras lo que ya ocupa la hoja.
 * Las alturas son las del CSS de impresión de `form-paper.tsx` (en mm) y deben cambiar juntas.
 */
const MM = {
  /** El alto útil de la página: A4 menos sus márgenes. */
  page: 265,
  row: 4.5,
  masthead: 14,
  observations: 12,
  signatures: 18,
  /** Las líneas finas entre bloques y filas, que el CSS no cuenta. */
  slack: 6,
} as const;

/** Los datos del sistema que van de a dos por fila: asignatura, carrera, tipo, docente, fecha, horario, alumnos y grupos. */
const SYSTEM_DATA = 8;

/** Las filas que siempre se reservan en Recursos; si la hoja no las deja, pasa a una segunda página. */
export const MIN_RESOURCE_ROWS = 30;

/** Las filas de la Sección I: el título de la práctica a lo ancho y los demás datos, de a dos. */
const dataRows = (extras: number): number => 1 + Math.ceil((SYSTEM_DATA + extras) / 2);

/** Con datos impares, la última fila de la Sección I queda con media celda libre. */
export const hasTrailingGap = (extras: number): boolean => (SYSTEM_DATA + extras) % 2 === 1;

/**
 * Las filas de la tabla de Recursos al imprimir: las que llenan lo que sobra de la hoja, y nunca menos de
 * `MIN_RESOURCE_ROWS` (con muchos datos extra, el resto pasa a otra página). Las dos filas de encabezado van aparte.
 */
export function resourceRows(extras: number): number {
  const fixed = MM.masthead + (1 + dataRows(extras) + 2) * MM.row + MM.observations + MM.signatures + MM.slack;
  return Math.max(MIN_RESOURCE_ROWS, Math.floor((MM.page - fixed) / MM.row));
}
