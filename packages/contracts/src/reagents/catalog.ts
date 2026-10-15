import { z } from 'zod';
import { decimalString } from '../decimal.js';
import { hazard, list, page, physicalState, positiveQuantity, sdsKind, text } from './shared.js';

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/** Dígito de control del CAS: suma ponderada de los demás dígitos, de derecha a izquierda, módulo 10. */
function casCheckDigitMatches(cas: string): boolean {
  const digits = cas.replace(/-/g, '');
  const body = [...digits.slice(0, -1)].reverse();
  const sum = body.reduce((total, digit, index) => total + Number(digit) * (index + 1), 0);
  return sum % 10 === Number(digits.at(-1));
}

const casNumber = z
  .string()
  .regex(/^\d{2,7}-\d{2}-\d$/, 'CAS inválido')
  .refine(casCheckDigitMatches, 'El dígito de control del CAS no coincide');
/** Unidades de un reactivo (ADR 0015): las que admiten control por peso. */
const productUnit = z.enum(['g', 'kg', 'mL', 'L']);
const hazards = z
  .array(hazard)
  .max(9)
  .refine((values) => new Set(values).size === values.length, 'Cada pictograma va una vez');
const sdsUrl = z.string().trim().max(2000).regex(/^https?:\/\//, 'El enlace empieza por http:// o https://');

interface ProductRuleFields {
  casNumber?: string | null | undefined;
  physicalState?: string | null | undefined;
  sdsKind?: string | null | undefined;
  sdsUrl?: string | null | undefined;
}

/**
 * Reglas de la ficha que cruzan campos (ADR 0015): el CAS es obligatorio salvo en mezclas y el enlace
 * de la ficha de seguridad solo acompaña a una digital. Las aplican el alta y la edición, esta sobre
 * la ficha ya combinada y con la del CAS solo si cambian el CAS o el estado (`cas: false` la omite).
 * Devuelve el primer incumplimiento o null.
 */
export function productRuleViolation(fields: ProductRuleFields, { cas = true } = {}): string | null {
  if (cas && !fields.casNumber && fields.physicalState !== 'mixture') return 'Indica el CAS: solo una mezcla puede no tenerlo';
  if (fields.sdsUrl && fields.sdsKind !== 'digital') return 'El enlace solo acompaña a una ficha de seguridad digital';
  return null;
}

const productRules = (value: ProductRuleFields, context: z.RefinementCtx) => {
  const message = productRuleViolation(value);
  if (message) context.addIssue({ code: 'custom', message });
};

/**
 * Reactivo nuevo (ADR 0015), del catálogo o desde el ingreso. El código es automático a partir del
 * nombre; el mínimo se fija en la ficha.
 */
export const newProduct = z
  .object({
    name: text(200),
    casNumber: casNumber.nullish(),
    physicalState,
    baseUnit: productUnit,
    hazards: hazards.default([]),
    controlled: z.boolean().default(false),
    sdsKind: sdsKind.nullish(),
    sdsUrl: sdsUrl.nullish(),
    /** g/mL, para pesar los frascos que se miden en volumen. */
    density: positiveQuantity.nullish(),
  })
  .strict()
  .superRefine(productRules);

/**
 * PATCH /products/:productId (ADR 0015): cambia solo los campos enviados, al menos uno. La unidad
 * solo cambia mientras el reactivo no tenga movimientos.
 */
export const updateProductRequest = z
  .object({
    name: text(200),
    casNumber: casNumber.nullable(),
    physicalState,
    hazards,
    controlled: z.boolean(),
    sdsKind: sdsKind.nullable(),
    sdsUrl: sdsUrl.nullable(),
    density: positiveQuantity.nullable(),
    baseUnit: productUnit,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Indica al menos un campo');

export const product = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  baseUnit: z.string(),
  casNumber: z.string().nullable(),
  physicalState: physicalState.nullable(),
  minimum: decimalString.nullable(),
  hazards: z.array(hazard),
  controlled: z.boolean(),
  sdsKind: sdsKind.nullable(),
  /** Enlace del fabricante; el PDF subido va en `sdsFileUrl`. Solo hay uno vigente (ADR 0017). */
  sdsUrl: z.string().nullable(),
  sdsFileUrl: z.string().nullable(),
  density: decimalString.nullable(),
});

/** PUT /products/:productId/minimum: null quita el mínimo. */
export const setMinimumRequest = z.object({ minimum: positiveQuantity.nullable() }).strict();
export const minimumResponse = z.object({ productId: z.uuid(), minimum: decimalString.nullable() });


export const productParams = z.object({ workspaceId: z.uuid(), productId: z.uuid() });

/** `q`: busca en nombre, código o CAS, sin distinguir mayúsculas ni tildes (el buscador del ingreso). */
export const productListQuery = z.object({ ...page, q: z.string().trim().min(2).max(100).optional() }).strict();

/** Ubicación donde el miembro puede registrar el movimiento (su ámbito y descendencia). */
export const location = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  parentId: z.uuid().nullable(),
});

/**
 * POST /locations (ADR 0015): una ubicación bajo otra, o en la raíz; el tipo y el código los decide el
 * servidor. Un nombre activo repetido bajo el mismo padre devuelve la existente.
 */
export const createLocationRequest = z.object({ name: text(200), parentId: z.uuid().nullable() }).strict();

/** Reactivo con su total y sus frascos con saldo en las ubicaciones que el miembro puede consultar. */
export const stockedProduct = product.extend({
  balance: decimalString,
  containersWithStock: z.number().int().nonnegative(),
  /** Sus avisos de caducidad: frascos con saldo vencidos y por vencer (ADR 0012, 05-10-2026). */
  expiredContainers: z.number().int().nonnegative(),
  expiringContainers: z.number().int().nonnegative(),
  /** Existencia física menor que su mínimo (ADR 0012, 05-10-2026); false si no tiene mínimo. */
  belowMinimum: z.boolean(),
});
export const productList = list(stockedProduct);
/** Ficha (GET /products/:productId): además, si la unidad aún puede cambiar (sin movimientos). */
export const productDetail = stockedProduct.extend({ unitEditable: z.boolean() });
export const locationList = z.object({ items: z.array(location) });

export type Product = z.infer<typeof product>;
export type ProductList = z.infer<typeof productList>;
export type ProductDetail = z.infer<typeof productDetail>;
export type Location = z.infer<typeof location>;
export type LocationList = z.infer<typeof locationList>;
export type StockedProduct = z.infer<typeof stockedProduct>;
