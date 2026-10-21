import { z } from 'zod';
import { decimalString } from '../decimal.js';
import { newProduct } from './catalog.js';
import { code, list, page, text } from '../common.js';
import { adjustmentQuantity, operationType, positiveQuantity, sdsKind, unit } from './shared.js';

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

/** GET /containers/:containerId: de qué reactivo es un frasco (enlace corto de su etiqueta QR). */
export const containerParams = z.object({ workspaceId: z.uuid(), containerId: z.uuid() });
export const containerResponse = z.object({ containerId: z.uuid(), productId: z.uuid() });

/**
 * Ingreso en un paso (ADR 0015): un reactivo del catálogo (`productId`) o uno nuevo (`newProduct`,
 * exige el permiso de catálogo), un lote nuevo con código automático y un frasco por código, cada uno
 * de `quantity`. Con `weight`, el peso en g de un frasco lleno: el servidor calcula la tara.
 */
export const receiptRequest = z
  .object({
    productId: z.uuid().optional(),
    newProduct: newProduct.optional(),
    brand: text(200).nullish(),
    expiresOn: z.iso.date().nullish(),
    quantity: positiveQuantity,
    unit,
    codes: z
      .array(code)
      .min(1)
      .max(50)
      .refine(
        (codes) => new Set(codes.map((value) => value.toLowerCase())).size === codes.length,
        'Cada frasco lleva un código distinto',
      ),
    /** Departamento dueño del lote (ADR 0024): activo y del espacio. */
    departmentId: z.uuid().nullish(),
    locationId: z.uuid(),
    weight: z.object({ grossWeight: positiveQuantity, density: positiveQuantity.nullish() }).strict().nullish(),
  })
  .strict()
  .refine((value) => (value.productId === undefined) !== (value.newProduct === undefined), {
    message: 'Indica un reactivo del catálogo o los datos de uno nuevo',
    path: ['productId'],
  });

/** Frasco creado por un ingreso, con su posición, su saldo y su tara (null sin control por peso). */
const receivedContainer = z.object({
  containerId: z.uuid(),
  code: z.string(),
  positionId: z.uuid(),
  quantity: decimalString,
  balance: decimalString,
  tare: decimalString.nullable(),
});

export const receiptResponse = z.object({
  operationId: z.uuid(),
  type: z.literal('receipt'),
  product: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
  lot: z.object({ id: z.uuid(), code: z.string() }),
  unit: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
  containers: z.array(receivedContainer).min(1),
});

/** GET /container-codes/suggestion: la serie del reactivo o una nueva a partir del nombre. */
export const containerCodeSuggestionQuery = z
  .object({
    productId: z.uuid().optional(),
    name: text(200).optional(),
    count: z.coerce.number().int().min(1).max(50).default(1),
  })
  .strict()
  .refine((value) => value.productId !== undefined || value.name !== undefined, {
    message: 'Indica el reactivo o su nombre',
    path: ['productId'],
  });
export const containerCodeSuggestion = z.object({ codes: z.array(z.string()).min(1) });

/** GET /brands: marcas ya usadas en los lotes, las más recientes primero. */
export const brandList = z.object({ items: z.array(z.string()) });

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

/**
 * Ajuste por peso (ADR 0015): con el peso del frasco en la balanza, el servidor calcula el saldo
 * (redondeado a centésimas) y registra un ajuste con motivo «Pesada».
 */
export const weightAdjustmentRequest = z.object({ positionId: z.uuid(), grossWeight: positiveQuantity }).strict();

/** PUT /containers/:containerId/tare: peso en g del frasco con su saldo actual. */
export const setTareRequest = z
  .object({ grossWeight: positiveQuantity, density: positiveQuantity.nullish() })
  .strict();
export const tareResponse = z.object({ containerId: z.uuid(), tare: decimalString, density: decimalString.nullable() });

/** Traslado de un frasco entero a otra ubicación (ADR 0012, entrega 4). */
export const transferRequest = z
  .object({ positionId: z.uuid(), locationId: z.uuid(), reference: text(200).nullish() })
  .strict();

export const transferResponse = z.object({
  operationId: z.uuid(),
  fromPositionId: z.uuid(),
  toPositionId: z.uuid(),
  quantity: decimalString,
  unit: z.string(),
  effectiveAt: z.iso.datetime({ offset: true }),
});

/** Cantidad contada o vista: cero o más, con hasta 15 enteros y 9 decimales. */
const countQuantity = z.string().regex(/^\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal de cero o más');

/**
 * Conteo de una ubicación (ADR 0012, entrega 4): por frasco, el saldo que se vio al contar y lo que
 * hay. Si un saldo cambió entretanto, el conteo se rechaza y se vuelve a cargar.
 */
export const countRequest = z
  .object({
    locationId: z.uuid(),
    lines: z
      .array(z.object({ positionId: z.uuid(), expected: countQuantity, counted: countQuantity }).strict())
      .min(1)
      .max(200)
      .refine((lines) => new Set(lines.map((line) => line.positionId)).size === lines.length, 'Cada frasco se cuenta una vez'),
  })
  .strict();

export const countResponse = z.object({
  operationId: z.uuid().nullable(),
  counted: z.number().int().nonnegative(),
  adjusted: z.number().int().nonnegative(),
  effectiveAt: z.iso.datetime({ offset: true }).nullable(),
});

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

/**
 * POST /issues (ADR 0012): quien puede aprobar registra la salida al instante (`done`); el
 * Operador deja una solicitud pendiente que aparta la cantidad (`pending`).
 */
export const issueResponse = z.discriminatedUnion('status', [
  movementResponse.extend({ status: z.literal('done') }),
  z.object({
    status: z.literal('pending'),
    requestId: z.uuid(),
    positionId: z.uuid(),
    quantity: decimalString,
    unit: z.string(),
    available: decimalString,
    requestedAt: z.iso.datetime({ offset: true }),
  }),
]);

export const positionListQuery = z.object({ ...page, productId: z.uuid().optional(), locationId: z.uuid().optional() }).strict();

/** Posición: un frasco (ADR 0012) en una ubicación; `container` es null solo en datos sin frasco. */
export const position = z.object({
  id: z.uuid(),
  product: z.object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    controlled: z.boolean(),
    /** Ficha de seguridad del reactivo (ADR 0016), para consultarla al entregar: enlace o PDF (ADR 0017). */
    sdsKind: sdsKind.nullable(),
    sdsUrl: z.string().nullable(),
    sdsFileUrl: z.string().nullable(),
  }),
  lot: z.object({
    id: z.uuid(),
    code: z.string(),
    expiresOn: z.string().nullable(),
    /** Marca tal como se registró (ADR 0015) y departamento dueño (ADR 0024); null si no se conocen. */
    brand: z.string().nullable(),
    department: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  }),
  container: z
    .object({
      id: z.uuid(),
      code: z.string(),
      initialQuantity: decimalString,
      receivedAt: z.iso.datetime({ offset: true }),
      /** Actor del ingreso que creó el frasco; null si el frasco no tiene ingreso. */
      receivedBy: z.object({ displayName: z.string().nullable() }).nullable(),
      /** Tara en g y densidad en g/mL con que se calculó; null sin control por peso (ADR 0015). */
      tare: decimalString.nullable(),
      density: decimalString.nullable(),
    })
    .nullable(),
  disposition: z.enum(['usable', 'quarantine', 'restricted']),
  /** `path`: nombres desde el primer nivel bajo la sede hasta esta ubicación; la sede, solo si es ella. */
  location: z.object({ id: z.uuid(), code: z.string(), name: z.string(), path: z.array(z.string()) }),
  balance: decimalString,
  /** Apartado por solicitudes pendientes (ADR 0012); lo disponible es saldo − reservado. */
  reserved: decimalString,
  unit: z.string(),
});

export const positionList = list(position);

export type MovementResponse = z.infer<typeof movementResponse>;
export type Position = z.infer<typeof position>;
export type TareResponse = z.infer<typeof tareResponse>;
export type PositionList = z.infer<typeof positionList>;
export type IssueResponse = z.infer<typeof issueResponse>;
export type ReceiptResponse = z.infer<typeof receiptResponse>;
export type TransferResponse = z.infer<typeof transferResponse>;
export type CountResponse = z.infer<typeof countResponse>;
