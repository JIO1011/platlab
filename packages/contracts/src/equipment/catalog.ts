import { z } from 'zod';
import { homeActivity, homeTrend } from '../access.js';
import { code, list, many, page, text } from '../common.js';

// ---------------------------------------------------------------------------
// Estado del equipo (ADR 0019): cuatro dimensiones, nunca una sola lista
// ---------------------------------------------------------------------------

/** Condición: si se puede usar. `retired` es «dado de baja» y es definitivo. */
export const assetCondition = z.enum(['operational', 'restricted', 'faulted', 'retired']);
/** Conservación: estado físico; null es «sin dato». */
export const assetConservation = z.enum(['good', 'fair', 'poor']);
/**
 * Disponibilidad: se calcula, nadie la edita. «Prestado» y «en mantenimiento» llegan con su entrega
 * (E-01b, E-01c) y «reservado», con la agenda (F3).
 */
export const assetAvailability = z.enum(['available', 'unavailable']);

/** Foto del equipo (ADR 0019, 02 §12): la web la envía reducida; lo usan el servidor y la web. */
export const ASSET_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const assetPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Importe exacto con dos decimales (numeric(14,2)); nunca se opera como number. */
const money = z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, 'Debe ser un importe con hasta dos decimales');

// ---------------------------------------------------------------------------
// Tipos de equipo
// ---------------------------------------------------------------------------

export const assetType = z.object({ id: z.uuid(), name: z.string() });
export const assetTypeList = z.object({ items: z.array(assetType) });
/** POST /asset-types: un nombre activo repetido, sin mayúsculas, responde NAME_TAKEN. */
export const createAssetTypeRequest = z.object({ name: text(120) }).strict();
export const assetTypeParams = z.object({ workspaceId: z.uuid(), typeId: z.uuid() });

// ---------------------------------------------------------------------------
// Ficha del equipo
// ---------------------------------------------------------------------------

/** Datos opcionales de la ficha; null es «sin dato». */
const optionalFields = {
  brand: text(120).nullable(),
  model: text(120).nullable(),
  serialNumber: text(120).nullable(),
  powerSupply: text(60).nullable(),
  /** Miembro responsable (su principal). */
  responsibleId: z.uuid().nullable(),
  conservation: assetConservation.nullable(),
  supplier: text(120).nullable(),
  acquiredOn: z.iso.date().nullable(),
  warrantyUntil: z.iso.date().nullable(),
  usefulLifeYears: z.number().int().min(1).max(100).nullable(),
  replacementValue: money.nullable(),
};

/** Campos editables de la ficha. */
const assetFields = { name: text(200), typeId: z.uuid(), ...optionalFields };

/**
 * POST /assets: alta en una ventana (ADR 0019). Sin código, el servidor lo propone a partir del
 * nombre. Un equipo puede registrarse averiado o restringido, pero nunca nace dado de baja.
 */
export const newAsset = z
  .object({
    name: assetFields.name,
    typeId: assetFields.typeId,
    ...z.object(optionalFields).partial().shape,
    code: code.optional(),
    locationId: z.uuid(),
    condition: assetCondition.exclude(['retired']).default('operational'),
  })
  .strict();

/** PATCH /assets/:assetId: solo lo enviado. Ubicación y condición cambian por sus propios comandos. */
export const updateAssetRequest = z
  .object({ ...assetFields, code })
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, 'No hay cambios');

export const assetParams = z.object({ workspaceId: z.uuid(), assetId: z.uuid() });

/** Regla de la ficha combinada, la misma en el servidor y en la web: la garantía no precede a la compra. */
export function assetRuleViolation(asset: { acquiredOn: string | null; warrantyUntil: string | null }): string | null {
  if (asset.acquiredOn && asset.warrantyUntil && asset.warrantyUntil < asset.acquiredOn) {
    return 'La garantía no puede terminar antes de la compra';
  }
  return null;
}

export const asset = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  type: assetType,
  brand: z.string().nullable(),
  model: z.string().nullable(),
  serialNumber: z.string().nullable(),
  powerSupply: z.string().nullable(),
  /** `path`: nombres desde la raíz hasta la ubicación, para mostrar sus niveles. */
  location: z.object({ id: z.uuid(), code: z.string(), name: z.string(), path: z.array(z.string()) }),
  responsible: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  condition: assetCondition,
  conservation: assetConservation.nullable(),
  availability: assetAvailability,
  supplier: z.string().nullable(),
  acquiredOn: z.iso.date().nullable(),
  warrantyUntil: z.iso.date().nullable(),
  usefulLifeYears: z.number().int().nullable(),
  replacementValue: z.string().nullable(),
  /** Enlace público de la foto vigente; null sin foto. */
  photoUrl: z.string().nullable(),
  createdAt: z.string(),
});

/**
 * GET /assets: `q` busca en nombre, código, marca, modelo y serie, sin mayúsculas ni tildes. Los
 * filtros admiten varios valores; la ubicación incluye sus niveles inferiores. Sin `condition`, los
 * dados de baja no aparecen.
 */
export const assetListQuery = z
  .object({
    ...page,
    q: z.string().trim().min(2).max(100).optional(),
    type: many(z.uuid()),
    condition: many(assetCondition),
    location: many(z.uuid()),
  })
  .strict();

export const assetList = list(asset);

/** Miembros activos del espacio que pueden ser responsables de un equipo. */
export const responsibleList = z.object({ items: z.array(z.object({ id: z.uuid(), name: z.string() })) });

/**
 * GET /summary (ADR 0011, 0019): cifras de la tarjeta de Inicio y del Resumen, sin los dados de baja.
 * La actividad y el gráfico llegan con el Resumen completo (E-01d).
 */
export const equipmentSummary = z.object({
  summary: z.object({
    assets: z.number().int().nonnegative(),
    operational: z.number().int().nonnegative(),
    restricted: z.number().int().nonnegative(),
    faulted: z.number().int().nonnegative(),
    /** Fallas abiertas o en atención del espacio (E-01b). */
    openFaults: z.number().int().nonnegative(),
    /** Lo pendiente de la tarjeta (ADR 0019): para quien atiende, las fallas que nadie atiende; para quien reporta, las suyas abiertas. */
    pendingRequests: z.number().int().nonnegative(),
  }),
  activity: z.array(homeActivity).max(10),
  trend: homeTrend.nullable(),
});

export type AssetCondition = z.infer<typeof assetCondition>;
export type AssetConservation = z.infer<typeof assetConservation>;
export type AssetAvailability = z.infer<typeof assetAvailability>;
export type AssetType = z.infer<typeof assetType>;
export type AssetTypeList = z.infer<typeof assetTypeList>;
export type Asset = z.infer<typeof asset>;
export type AssetList = z.infer<typeof assetList>;
export type ResponsibleList = z.infer<typeof responsibleList>;
export type EquipmentSummary = z.infer<typeof equipmentSummary>;
