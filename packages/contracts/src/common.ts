import { z } from 'zod';

/**
 * Piezas comunes a los contratos de los módulos (ADR 0019): códigos, textos, paginación y las
 * ubicaciones de Core. Los esquemas de entrada son estrictos en cada módulo.
 */
export const code = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'Código inválido');
export const text = (max: number) => z.string().trim().min(1).max(max);
/** Importe exacto con dos decimales (numeric(14,2)); nunca se opera como number. */
export const money = z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, 'Debe ser un importe con hasta dos decimales');

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

/** Ubicación activa con su área (ADR 0019, E-01c) y, si es un área, su encargado. */
const activeLocation = location.extend({ areaId: z.uuid(), managerId: z.uuid().nullable() });

export const locationList = z.object({ items: z.array(activeLocation) });

export type Location = z.infer<typeof location>;
export type ActiveLocation = z.infer<typeof activeLocation>;
export type LocationList = z.infer<typeof locationList>;
