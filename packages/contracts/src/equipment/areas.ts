import { z } from 'zod';
import { assetListQuery } from './catalog.js';

/**
 * GET /areas (ADR 0019, E-01c): las tarjetas del Inventario. Un área es el primer nivel de ubicación
 * debajo de la sede o el edificio; cuenta los equipos de todos sus niveles, sin los dados de baja, y
 * solo aparece si tiene alguno. En orden alfabético.
 */
export const area = z.object({
  id: z.uuid(),
  name: z.string(),
  /** La sede o el edificio que la contiene; nulo si está en la raíz. */
  parentName: z.string().nullable(),
  manager: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  total: z.number().int(),
  faulted: z.number().int(),
  restricted: z.number().int(),
  /** Dados de baja: no cuentan en `total`; el área los muestra aparte. */
  retired: z.number().int(),
});

export const areaList = z.object({ items: z.array(area) });

export const areaParams = z.object({ workspaceId: z.uuid(), areaId: z.uuid() });

/**
 * GET /areas/:areaId/types: el área agrupada por tipo, con sus cifras por estado sin los dados de baja y
 * la foto de uno de sus equipos. Las unidades de un tipo salen de GET /assets con `location` y `type`.
 */
export const areaTypeList = z.object({
  items: z.array(
    z.object({
      type: z.object({ id: z.uuid(), name: z.string() }),
      total: z.number().int(),
      operational: z.number().int(),
      restricted: z.number().int(),
      faulted: z.number().int(),
      photoUrl: z.string().nullable(),
    }),
  ),
});

/** PUT /areas/:areaId/manager: asigna el encargado del área o lo quita con `null`. */
export const assignAreaManagerRequest = z.object({ managerId: z.uuid().nullable() }).strict();

export const areaManager = z.object({ areaId: z.uuid(), managerId: z.uuid().nullable() });

/** Los filtros del Informe sin paginar: el Excel (GET /assets/export, ADR 0017) y los indicadores (GET /assets/totals). */
export const assetFilterQuery = assetListQuery.omit({ cursor: true, limit: true });

/**
 * GET /assets/totals: indicadores del Informe con sus filtros (E-01c). El valor de reposición es la suma
 * exacta en cadena decimal (USD).
 */
export const assetTotals = z.object({
  count: z.number().int(),
  replacementValue: z.string(),
  withoutResponsible: z.number().int(),
  warrantyExpiring: z.number().int(),
  usefulLifeReached: z.number().int(),
});

export type Area = z.infer<typeof area>;
export type AreaList = z.infer<typeof areaList>;
export type AreaTypeList = z.infer<typeof areaTypeList>;
export type AreaManager = z.infer<typeof areaManager>;
export type AssetTotals = z.infer<typeof assetTotals>;
