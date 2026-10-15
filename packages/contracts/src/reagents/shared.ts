import { z } from 'zod';

/**
 * Contratos de Reactivos (R-00 y R-01A, ADR 0012). Las cantidades viajan como
 * cadenas decimales con la precisión de numeric(24,9) (02 §12) y nunca se operan como number.
 * Los esquemas de entrada son estrictos: no se aceptan campos, filtros ni órdenes arbitrarios.
 */
export const code = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'Código inválido');
export const text = (max: number) => z.string().trim().min(1).max(max);
export const unit = z.string().regex(/^[A-Za-z]{1,10}$/, 'Unidad inválida');

/** Cantidad mayor que cero, con hasta 15 enteros y 9 decimales. */
export const positiveQuantity = z
  .string()
  .regex(/^(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal mayor que cero');

/** Ajuste con signo y distinto de cero. */
export const adjustmentQuantity = z
  .string()
  .regex(/^-?(?!0+(?:\.0+)?$)\d{1,15}(?:\.\d{1,9})?$/, 'Debe ser una cantidad decimal distinta de cero');

/** «Por vencer»: caduca entre hoy y los próximos días (02 §12, ADR 0012); lo usan el servidor y la web. */
export const EXPIRING_DAYS = 30;
/** PDF de la ficha de seguridad (02 §12, ADR 0017); lo usan el servidor y la web. */
export const SAFETY_SHEET_MAX_BYTES = 6 * 1024 * 1024;

export const physicalState = z.enum(['solid', 'liquid', 'aqueous', 'mixture', 'gas']);
/** Los nueve pictogramas SGA (ADR 0015). */
export const hazard = z.enum(['GHS01', 'GHS02', 'GHS03', 'GHS04', 'GHS05', 'GHS06', 'GHS07', 'GHS08', 'GHS09']);
/** Ficha de seguridad: digital (con enlace), solo en físico o no tiene; null es «sin dato». */
export const sdsKind = z.enum(['digital', 'physical', 'none']);
/** `transfer`: un frasco entero cambia de ubicación en un paso (ADR 0012, entrega 4). */
export const operationType = z.enum(['receipt', 'issue', 'adjustment', 'transfer']);

// ---------------------------------------------------------------------------
// Consultas paginadas
// ---------------------------------------------------------------------------

export const page = {
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
};

/** Valores por filtro: como mucho los de una página de opciones (02 §12 no fija otro límite). */
const MAX_FILTER_VALUES = 100;

/**
 * Filtro con varios valores en parámetros repetidos (`?type=issue&type=adjustment`); un valor suelto
 * también vale, así los enlaces anteriores siguen funcionando. Los repetidos cuentan una vez.
 */
export const many = <T extends z.ZodType>(item: T) =>
  z
    .preprocess((value) => (value === undefined || Array.isArray(value) ? value : [value]), z.array(item).min(1).max(MAX_FILTER_VALUES))
    .transform((values) => [...new Set(values)])
    .optional();

export const list = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
