import { z } from 'zod';
import { list, page, text } from '../common.js';
import { decimalString } from '../decimal.js';
import { adjustmentQuantity, positiveQuantity, unit } from '../reagents/shared.js';
export { movementResponse as materialMovementResponse } from '../reagents/movements.js';

// ---------------------------------------------------------------------------
// Existencias de Materiales (ADR 0025): ingreso, salida y ajuste por ubicación, sin envases
// ---------------------------------------------------------------------------

/** POST /receipts: suma existencias del material a una ubicación activa, en su unidad base. */
export const materialReceiptRequest = z
  .object({
    productId: z.uuid(),
    locationId: z.uuid(),
    quantity: positiveQuantity,
    unit,
    reference: text(200).optional(),
  })
  .strict();

/** POST /issues: la salida de un material desde una posición; la hace quien la registra, sin aprobación. */
export const materialIssueRequest = z
  .object({ positionId: z.uuid(), quantity: positiveQuantity, unit, reason: text(500), destination: text(200) })
  .strict();

/** POST /adjustments: corrige el saldo con signo y motivo; es del Administrador. */
export const materialAdjustmentRequest = z
  .object({ positionId: z.uuid(), quantity: adjustmentQuantity, unit, reason: text(500) })
  .strict();

/** Lo que un material tiene en una ubicación: la posición sobre la que se registran salidas y ajustes. */
const materialStockLine = z.object({
  positionId: z.uuid(),
  productId: z.uuid(),
  locationId: z.uuid(),
  locationName: z.string(),
  /** Ruta desde el primer nivel bajo la sede, para distinguir «Estante 2» de dos áreas. */
  locationPath: z.array(z.string()),
  /** Existencia institucional: incluye lo prestado. */
  balance: decimalString,
  /** Lo que se puede sacar o prestar hoy: el saldo menos lo prestado. */
  available: decimalString,
  unit: z.string(),
});

/** GET /stock: existencias por ubicación, de un material o de todos. */
export const materialStockQuery = z
  .object({ ...page, productId: z.uuid().optional(), locationId: z.uuid().optional() })
  .strict();
export const materialStockList = list(materialStockLine);

export type MaterialStockLine = z.infer<typeof materialStockLine>;
export type MaterialStockList = z.infer<typeof materialStockList>;
