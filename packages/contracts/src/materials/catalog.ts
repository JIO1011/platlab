import { z } from 'zod';
import { decimalString, positiveQuantity } from '../decimal.js';
import { list, page, text } from '../common.js';

// ---------------------------------------------------------------------------
// Catálogo de Materiales (ADR 0025)
// ---------------------------------------------------------------------------

/** Consumible (se gasta), reutilizable por cantidad (se presta y se devuelve) o reutilizable identificado (una unidad con código). */
export const materialClass = z.enum(['consumable', 'reusable_counted', 'reusable_identified']);
/** Un consumible se mide en pieza, masa o volumen; un reutilizable siempre se cuenta en piezas. */
const materialUnit = z.enum(['u', 'g', 'kg', 'mL', 'L']);

/** Regla que cruza clase y unidad: solo un consumible admite una unidad distinta de la pieza. */
export const unitViolation = (fields: { class: string; baseUnit: string }): string | null =>
  fields.class !== 'consumable' && fields.baseUnit !== 'u' ? 'Un material reutilizable se cuenta en piezas (u)' : null;

/** Material nuevo: el código es automático a partir del nombre; el mínimo se fija aparte. */
export const newMaterial = z
  .object({ name: text(200), class: materialClass, baseUnit: materialUnit.default('u') })
  .strict()
  .superRefine((value, context) => {
    const message = unitViolation(value);
    if (message) context.addIssue({ code: 'custom', message, path: ['baseUnit'] });
  });

/** PATCH /products/:productId: cambia solo lo enviado, al menos un campo. La clase no cambia; la unidad, solo sin movimientos. */
export const updateMaterialRequest = z
  .object({ name: text(200), baseUnit: materialUnit })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Indica al menos un campo');

export const material = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  class: materialClass,
  baseUnit: z.string(),
  minimum: decimalString.nullable(),
});

/** PUT /products/:productId/minimum: null quita el mínimo. */
export const setMaterialMinimumRequest = z.object({ minimum: positiveQuantity.nullable() }).strict();
export const materialMinimumResponse = z.object({ productId: z.uuid(), minimum: decimalString.nullable() });

export const materialParams = z.object({ workspaceId: z.uuid(), productId: z.uuid() });

/** `q`: busca en nombre o código, sin distinguir mayúsculas ni tildes. */
export const materialListQuery = z.object({ ...page, q: z.string().trim().min(2).max(100).optional() }).strict();

/** Material con su total en todas las ubicaciones, lo prestado y si está bajo su mínimo. */
export const stockedMaterial = material.extend({
  /** Existencia institucional: incluye lo prestado (03 §4). */
  balance: decimalString,
  /** Lo que se puede sacar o prestar hoy: la existencia menos lo prestado. */
  available: decimalString,
  locationsWithStock: z.number().int().nonnegative(),
  belowMinimum: z.boolean(),
});
export const materialList = list(stockedMaterial);
/** Ficha: además, si la unidad aún puede cambiar (sin movimientos). */
export const materialDetail = stockedMaterial.extend({ unitEditable: z.boolean() });

export type Material = z.infer<typeof material>;
export type MaterialClass = z.infer<typeof materialClass>;
export type StockedMaterial = z.infer<typeof stockedMaterial>;
export type MaterialList = z.infer<typeof materialList>;
export type MaterialDetail = z.infer<typeof materialDetail>;
