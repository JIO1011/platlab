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

/** Las filas de la tabla de Recursos que siempre se reservan; si la hoja no las deja, pasa a una segunda página. */
export const MIN_RESOURCE_ROWS = 30;

/** Lo que de la hoja cambia su presupuesto: las filas de la Sección I (títulos y datos) y si lleva Observaciones. */
interface SheetShape {
  rows: ReadonlyArray<{ kind: 'section' | 'row' }>;
  notes: boolean;
}

/**
 * Las filas de la tabla de Recursos al imprimir: las que llenan lo que sobra de la hoja, y nunca menos de
 * `MIN_RESOURCE_ROWS` (con muchas filas en la Sección I, el resto pasa a otra página). Cada título y cada fila de datos
 * ocupa una línea; las dos filas de encabezado de Recursos van aparte.
 */
export function resourceRows({ rows, notes }: SheetShape): number {
  const fixed = MM.masthead + (rows.length + 2) * MM.row + (notes ? MM.observations : 0) + MM.signatures + MM.slack;
  return Math.max(MIN_RESOURCE_ROWS, Math.floor((MM.page - fixed) / MM.row));
}
