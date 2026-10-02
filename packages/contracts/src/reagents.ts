import { z } from 'zod';
import { decimalString } from './decimal.js';

/**
 * Contratos de Reactivos para R-00 (primer incremento, «Rutas»). Las cantidades viajan como
 * cadenas decimales con la precisión de numeric(24,9) (02 §12) y nunca se operan como number.
 * Los esquemas de entrada son estrictos: no se aceptan campos, filtros ni órdenes arbitrarios.
 */
const code = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'Código inválido');
const text = (max: number) => z.string().trim().min(1).max(max);
const unit = z.string().regex(/^[A-Za-z]{1,10}$/, 'Unidad inválida');

/** Cantidad mayor que cero, con hasta 15 enteros y 9 decimales. */
const positiveQuantity = z
  .string()
  .regex(/^(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal mayor que cero');

/** Ajuste con signo y distinto de cero. */
const adjustmentQuantity = z
  .string()
  .regex(/^-?(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal distinta de cero');

export const physicalState = z.enum(['solid', 'liquid', 'gas']);
export const operationType = z.enum(['receipt', 'issue', 'adjustment']);

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export const createProductRequest = z
  .object({
    code,
    name: text(200),
    baseUnit: unit,
    casNumber: z.string().regex(/^\d{2,7}-\d{2}-\d$/, 'CAS inválido').nullish(),
    physicalState: physicalState.nullish(),
  })
  .strict();

export const product = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  baseUnit: z.string(),
  casNumber: z.string().nullable(),
  physicalState: physicalState.nullable(),
});

export const productParams = z.object({ workspaceId: z.uuid(), productId: z.uuid() });

/** Si la caducidad o el lote del proveedor se desconocen, se envían como null (quedan desconocidos). */
export const createLotRequest = z
  .object({
    code,
    supplierName: text(200).nullish(),
    supplierLot: text(100).nullish(),
    expiresOn: z.iso.date().nullish(),
  })
  .strict();

export const lot = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  code: z.string(),
  supplierName: z.string().nullable(),
  supplierLot: z.string().nullable(),
  expiresOn: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

export const receiptRequest = z
  .object({
    lotId: z.uuid(),
    locationId: z.uuid(),
    quantity: positiveQuantity,
    unit,
    reference: text(200).nullish(),
  })
  .strict();

export const issueRequest = z
  .object({
    positionId: z.uuid(),
    quantity: positiveQuantity,
    unit,
    reason: text(500),
    destination: text(200),
  })
  .strict();

export const adjustmentRequest = z
  .object({
    positionId: z.uuid(),
    quantity: adjustmentQuantity,
    unit,
    reason: text(500),
  })
  .strict();

/** La respuesta de un movimiento indica la operación, la cantidad aplicada, el saldo y la unidad. */
export const movementResponse = z.object({
  operationId: z.uuid(),
  type: operationType,
  positionId: z.uuid(),
  appliedQuantity: decimalString,
  balance: decimalString,
  unit: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
});

// ---------------------------------------------------------------------------
// Consultas paginadas
// ---------------------------------------------------------------------------

const page = {
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
};

export const productListQuery = z.object(page).strict();
export const positionListQuery = z.object({ ...page, productId: z.uuid().optional() }).strict();
export const operationListQuery = z
  .object({
    ...page,
    productId: z.uuid().optional(),
    locationId: z.uuid().optional(),
    positionId: z.uuid().optional(),
  })
  .strict();

export const position = z.object({
  id: z.uuid(),
  product: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
  lot: z.object({ id: z.uuid(), code: z.string(), expiresOn: z.string().nullable() }),
  location: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
  balance: decimalString,
  unit: z.string(),
});

export const operation = z.object({
  id: z.uuid(),
  type: operationType,
  effectiveAt: z.iso.datetime({ offset: true }),
  actor: z.object({ principalId: z.uuid(), displayName: z.string().nullable() }),
  reason: z.string().nullable(),
  destination: z.string().nullable(),
  reference: z.string().nullable(),
  positionId: z.uuid(),
  product: z.object({ code: z.string(), name: z.string() }),
  lot: z.object({ code: z.string() }),
  location: z.object({ code: z.string() }),
  quantity: decimalString,
  balanceAfter: decimalString,
  unit: z.string(),
});

const list = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });

/** Ubicación donde el miembro puede registrar el movimiento (su ámbito y descendencia). */
export const location = z.object({ id: z.uuid(), code: z.string(), name: z.string(), kind: z.string() });

/** En la lista, cada reactivo lleva su total en las ubicaciones que el miembro puede consultar. */
export const productList = list(product.extend({ balance: decimalString }));
export const lotList = z.object({ items: z.array(lot.extend({ condition: z.string() })) });
export const locationList = z.object({ items: z.array(location) });
export const positionList = list(position);
export const operationList = list(operation);

export type Product = z.infer<typeof product>;
export type Lot = z.infer<typeof lot>;
export type MovementResponse = z.infer<typeof movementResponse>;
export type Position = z.infer<typeof position>;
export type Operation = z.infer<typeof operation>;
export type ProductList = z.infer<typeof productList>;
export type LotList = z.infer<typeof lotList>;
export type LocationList = z.infer<typeof locationList>;
export type PositionList = z.infer<typeof positionList>;
export type OperationList = z.infer<typeof operationList>;
