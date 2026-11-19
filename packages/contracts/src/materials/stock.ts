import { z } from 'zod';
import { list, page, text } from '../common.js';
import { adjustmentQuantity, decimalString, positiveQuantity, unit } from '../decimal.js';
// La respuesta de un movimiento es de la capacidad inventario; hoy vive con los contratos de Reactivos.
export { movementResponse as materialMovementResponse } from '../reagents/movements.js';

// ---------------------------------------------------------------------------
// Existencias de Materiales (ADR 0025): ingreso, salida y ajuste por ubicación, sin envases
// ---------------------------------------------------------------------------

/**
 * POST /receipts: suma existencias del material a una ubicación activa, en su unidad base. Si el insumo vence
 * (MA-01f), `expiresOn` es obligatoria y `lot` (el lote impreso por el proveedor) opcional; si no vence, no van.
 * El mismo lote y la misma fecha suman al mismo lote.
 */
export const materialReceiptRequest = z
  .object({
    productId: z.uuid(),
    locationId: z.uuid(),
    quantity: positiveQuantity,
    unit,
    reference: text(200).optional(),
    expiresOn: z.iso.date().optional(),
    lot: text(100).optional(),
  })
  .strict()
  .refine((value) => value.lot === undefined || value.expiresOn !== undefined, {
    message: 'El lote va con su fecha de vencimiento',
    path: ['expiresOn'],
  });

/** Para qué sale un insumo (MA-01f): las tres hojas de egresos de la planilla del cliente. */
export const issuePurpose = z.enum(['practice', 'clinic', 'general']);

/**
 * POST /issues: la salida de un material desde una posición; la hace quien la registra, sin aprobación. Lleva su tipo,
 * quién la pidió (un miembro activo del espacio, opcional) y un detalle: la práctica, el servicio o el motivo.
 */
export const materialIssueRequest = z
  .object({
    positionId: z.uuid(),
    quantity: positiveQuantity,
    unit,
    purpose: issuePurpose,
    requesterId: z.uuid().optional(),
    detail: text(500),
  })
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
  /** Lote impreso por el proveedor; nulo si no se anotó. */
  lot: z.string().nullable(),
  /** Vencimiento del lote; nulo si el insumo no vence o se ingresó sin fecha. */
  expiresOn: z.iso.date().nullable(),
});

/** GET /stock: existencias por ubicación, de un material o de todos. */
export const materialStockQuery = z
  .object({ ...page, productId: z.uuid().optional(), locationId: z.uuid().optional() })
  .strict();
export const materialStockList = list(materialStockLine);

export type IssuePurpose = z.infer<typeof issuePurpose>;
export type MaterialStockLine = z.infer<typeof materialStockLine>;
export type MaterialStockList = z.infer<typeof materialStockList>;
