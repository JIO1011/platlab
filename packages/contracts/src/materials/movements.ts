import { z } from 'zod';
import { list, page } from '../common.js';
import { decimalString } from '../decimal.js';
import { materialClass } from './catalog.js';
import { issuePurpose } from './stock.js';

// ---------------------------------------------------------------------------
// Movimientos de Materiales (MA-01d, ADR 0025): el libro exportable
// ---------------------------------------------------------------------------

/**
 * Cada renglón del libro: ingreso, salida y ajuste vienen del libro del inventario; la baja es el ajuste que dejó una
 * devolución dañada o perdida; préstamo y devolución (en buen estado) salen de los vales, que apartan y liberan sin
 * mover el saldo.
 */
export const materialMovementKind = z.enum(['receipt', 'issue', 'loan', 'return', 'writeoff', 'adjustment']);
export type MaterialMovementKind = z.infer<typeof materialMovementKind>;

export const materialMovementKindLabel: Record<MaterialMovementKind, string> = {
  receipt: 'Ingreso',
  issue: 'Salida',
  loan: 'Préstamo',
  return: 'Devolución',
  writeoff: 'Baja',
  adjustment: 'Ajuste',
};

export const issuePurposeLabel: Record<z.infer<typeof issuePurpose>, string> = { practice: 'Práctica', clinic: 'Clínica', general: 'General' };

const filterShape = {
  /** Solo los movimientos de ese material (desde su ficha). */
  productId: z.uuid().optional(),
  kind: materialMovementKind.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  purpose: issuePurpose.optional(),
  q: z.string().trim().min(2).max(100).optional(),
};
const inOrder = (filters: { from?: string | undefined; to?: string | undefined }) => !filters.from || !filters.to || filters.from <= filters.to;
const periodError = { message: 'El periodo empieza después de terminar', path: ['to'] };

/** Filtros del libro y de su Excel: tipo, periodo en la fecha civil del espacio, tipo de salida y búsqueda (2+ letras). */
export const materialMovementFilters = z.object(filterShape).strict().refine(inOrder, periodError);
export type MaterialMovementFilters = z.infer<typeof materialMovementFilters>;
export const materialMovementQuery = z
  .object({ ...page, ...filterShape })
  .strict()
  .refine(inOrder, periodError);

const materialMovement = z.object({
  id: z.string(),
  kind: materialMovementKind,
  at: z.iso.datetime({ offset: true }),
  product: z.object({ id: z.uuid(), code: z.string(), name: z.string(), class: materialClass }),
  /** La ubicación del movimiento y el lote del proveedor, si el insumo vence. */
  place: z.string(),
  lot: z.string().nullable(),
  /** Con signo: lo que entra al estante es positivo; lo que sale (salida, préstamo, baja) es negativo. */
  quantity: decimalString,
  unit: z.string(),
  /** El vale (P-0043) o la referencia del ingreso (la factura). */
  reference: z.string().nullable(),
  /** Quién lo pidió o se lo llevó. */
  person: z.string().nullable(),
  /** Quién lo registró. */
  actor: z.string().nullable(),
  purpose: issuePurpose.nullable(),
  /** Daño o pérdida de una baja. */
  outcome: z.enum(['damaged', 'lost']).nullable(),
  /** El servicio, el motivo o la nota. */
  detail: z.string().nullable(),
});
export const materialMovementList = list(materialMovement);
export type MaterialMovement = z.infer<typeof materialMovement>;
export type MaterialMovementList = z.infer<typeof materialMovementList>;
