import { z } from 'zod';
import { decimalString, positiveQuantity } from '../decimal.js';
import { list, page, text } from '../common.js';

// ---------------------------------------------------------------------------
// Catálogo de Materiales (ADR 0025)
// ---------------------------------------------------------------------------

/** Consumible (se gasta), reutilizable por cantidad (se presta y se devuelve) o reutilizable identificado (una unidad con código). */
export const materialClass = z.enum(['consumable', 'reusable_counted', 'reusable_identified']);
/**
 * Un consumible se cuenta en la unidad con que se entrega (pieza, par, caja, rollo…), o se mide en masa, volumen o
 * metros; un reutilizable siempre se cuenta en piezas. Sin conversión entre ellas (ADR 0025, MA-01g).
 */
export const materialUnit = z.enum(['u', 'par', 'caja', 'bolsa', 'paquete', 'rollo', 'frasco', 'tubo', 'sobre', 'kit', 'm', 'g', 'kg', 'mL', 'L']);

/** Semáforo de insumos (02 §12, MA-01f): un lote vence pronto a 90 días o menos y se vigila a 180 o menos. */
export const EXPIRY_SOON_DAYS = 90;
export const EXPIRY_WATCH_DAYS = 180;

/**
 * Reglas que cruzan la clase con la unidad y el vencimiento: solo un consumible admite una unidad distinta de la pieza
 * y solo un consumible vence. Devuelve el campo que falla y por qué, o null.
 */
export const classViolation = (fields: {
  class: string;
  baseUnit: string;
  tracksExpiry: boolean;
}): { path: 'baseUnit' | 'tracksExpiry'; message: string } | null => {
  if (fields.class === 'consumable') return null;
  if (fields.baseUnit !== 'u') return { path: 'baseUnit', message: 'Un material reutilizable se cuenta en piezas (u)' };
  if (fields.tracksExpiry) return { path: 'tracksExpiry', message: 'Solo un insumo que se gasta puede vencer' };
  return null;
};

/** Material nuevo: el código es automático a partir del nombre; el mínimo se fija aparte. Por omisión no vence. */
export const newMaterial = z
  .object({ name: text(200), class: materialClass, baseUnit: materialUnit.default('u'), tracksExpiry: z.boolean().default(false) })
  .strict()
  .superRefine((value, context) => {
    const violation = classViolation(value);
    if (violation) context.addIssue({ code: 'custom', message: violation.message, path: [violation.path] });
  });

/**
 * PATCH /products/:productId: cambia solo lo enviado, al menos un campo. La clase no cambia; la unidad, solo sin
 * movimientos. Que el insumo venza cambia cuando sea: los lotes ya ingresados conservan su fecha.
 */
export const updateMaterialRequest = z
  .object({ name: text(200), baseUnit: materialUnit, tracksExpiry: z.boolean() })
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
  /** Si el insumo vence: su ingreso pide la fecha (MA-01f). */
  tracksExpiry: z.boolean(),
});

/** PUT /products/:productId/minimum: null quita el mínimo. */
export const setMaterialMinimumRequest = z.object({ minimum: positiveQuantity.nullable() }).strict();
export const materialMinimumResponse = z.object({ productId: z.uuid(), minimum: decimalString.nullable() });

export const materialParams = z.object({ workspaceId: z.uuid(), productId: z.uuid() });

/**
 * `q`: busca en nombre o código, sin distinguir mayúsculas ni tildes; `class`, deja solo una clase; `areaId`, solo lo
 * que tiene existencia en esa área; `stock=below-minimum`, solo lo que está bajo su mínimo; `stock=expiring`, solo lo
 * que tiene un lote con saldo vencido o que vence en EXPIRY_WATCH_DAYS días o menos.
 */
export const materialListQuery = z
  .object({
    ...page,
    q: z.string().trim().min(2).max(100).optional(),
    class: materialClass.optional(),
    areaId: z.uuid().optional(),
    stock: z.enum(['below-minimum', 'expiring']).optional(),
  })
  .strict();

/** Material con su total en todas las ubicaciones, lo prestado y si está bajo su mínimo. */
export const stockedMaterial = material.extend({
  /** Existencia institucional: incluye lo prestado (03 §4). */
  balance: decimalString,
  /** Lo que se puede sacar o prestar hoy: la existencia menos lo prestado. */
  available: decimalString,
  locationsWithStock: z.number().int().nonnegative(),
  /** Nombres de las ubicaciones con existencia, de más a menos: la tarjeta dice dónde está. */
  locationNames: z.array(z.string()),
  belowMinimum: z.boolean(),
  /** El vencimiento más próximo entre sus lotes con saldo; nulo si ninguno tiene fecha. */
  nextExpiry: z.iso.date().nullable(),
});
export const materialList = list(stockedMaterial);
/** Ficha: además, si la unidad aún puede cambiar (sin movimientos). */
export const materialDetail = stockedMaterial.extend({ unitEditable: z.boolean() });

export type Material = z.infer<typeof material>;
export type MaterialClass = z.infer<typeof materialClass>;
export type MaterialUnit = z.infer<typeof materialUnit>;
export type StockedMaterial = z.infer<typeof stockedMaterial>;
export type MaterialList = z.infer<typeof materialList>;
export type MaterialDetail = z.infer<typeof materialDetail>;

/** GET /summary: las cifras del Resumen y de la tarjeta de Inicio. */
export const materialsSummary = z.object({
  materials: z.number().int().nonnegative(),
  belowMinimum: z.number().int().nonnegative(),
  openLoans: z.number().int().nonnegative(),
  overdueLoans: z.number().int().nonnegative(),
  /** Materiales con un lote con saldo vencido o que vence en EXPIRY_WATCH_DAYS días o menos. */
  expiring: z.number().int().nonnegative(),
});
export type MaterialsSummary = z.infer<typeof materialsSummary>;

/** GET /areas: las áreas con material en existencia y cuántos materiales tienen allí (y cuántos con algo prestado). */
export const materialArea = z.object({
  id: z.uuid(),
  name: z.string(),
  materials: z.number().int().nonnegative(),
  lentMaterials: z.number().int().nonnegative(),
});
export const materialAreaList = z.object({ items: z.array(materialArea) });
export type MaterialArea = z.infer<typeof materialArea>;
export type MaterialAreaList = z.infer<typeof materialAreaList>;
