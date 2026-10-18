import { z } from 'zod';
import { text } from '../common.js';
import { expectedVersion } from './providers.js';

/**
 * Planes de Mantenimiento (ADR 0020): por tipo de equipo, que cubre todas sus unidades y las nuevas, o
 * por un equipo, con exclusiones por equipo. Los crea, edita y archiva el Administrador.
 */

/** Lo que se planifica; el correctivo no tiene plan (M-01b). */
export const planKind = z.enum(['preventive', 'calibration', 'verification', 'cleaning']);
export const workKind = z.enum([...planKind.options, 'corrective']);
/** Tipos de trabajo cuyo registro puede llevar «válida hasta»: el certificado vence en esa fecha. */
export const VALIDITY_KINDS: readonly WorkKind[] = ['calibration', 'verification'];
/** Frecuencia: cada N días, semanas, meses o años. */
const intervalUnit = z.enum(['day', 'week', 'month', 'year']);

const tally = z.number().int().nonnegative();

/** Lo que identifica a un equipo o a un plan en las listas de Mantenimiento. */
export const maintenanceAssetRef = z.object({ id: z.uuid(), code: z.string(), name: z.string() });
export const planRef = z.object({ id: z.uuid(), title: z.string(), kind: planKind });

/** Lista de verificación: hasta 30 ítems de 1 a 200 caracteres. */
const checklist = z.array(text(200)).max(30);

const planFields = {
  title: text(120),
  intervalCount: z.number().int().min(1).max(999),
  intervalUnit,
  startsOn: z.iso.date(),
  checklist,
  acceptanceCriteria: text(1000).nullable(),
};

/**
 * POST /plans: de un tipo de equipo o de un equipo. Con `replacesPlanId`, el plan propio del equipo lo
 * excluye en el mismo paso del plan de su tipo, con motivo «Plan propio»; archivarlo lo devuelve a él.
 */
export const createPlanRequest = z
  .object({
    kind: planKind,
    assetTypeId: z.uuid().optional(),
    assetId: z.uuid().optional(),
    replacesPlanId: z.uuid().optional(),
    ...planFields,
    checklist: checklist.default([]),
    acceptanceCriteria: planFields.acceptanceCriteria.default(null),
  })
  .strict()
  .refine((input) => (input.assetTypeId === undefined) !== (input.assetId === undefined), {
    message: 'El plan es de un tipo de equipo o de un equipo',
  })
  .refine((input) => input.replacesPlanId === undefined || input.assetId !== undefined, {
    message: 'Solo el plan de un equipo reemplaza al de su tipo',
  });

/** PATCH /plans/:planId: el tipo de trabajo y el alcance no cambian; solo lo que llega cambia. */
export const updatePlanRequest = z.object(planFields).partial().extend({ expectedVersion }).strict();

/** POST /plans/:planId/exclusions: un equipo del tipo del plan, con motivo. */
export const createExclusionRequest = z.object({ assetId: z.uuid(), reason: text(500) }).strict();

export const planParams = z.object({ workspaceId: z.uuid(), planId: z.uuid() });
export const exclusionParams = z.object({ workspaceId: z.uuid(), planId: z.uuid(), assetId: z.uuid() });

export const plan = z.object({
  id: z.uuid(),
  kind: planKind,
  title: z.string(),
  /** Alcance: un tipo de equipo o un equipo; el otro es null. */
  assetType: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  asset: maintenanceAssetRef.nullable(),
  intervalCount: z.number().int().positive(),
  intervalUnit,
  startsOn: z.iso.date(),
  checklist: z.array(z.string()),
  acceptanceCriteria: z.string().nullable(),
  /** Cuántos equipos cubre hoy: los no dados de baja ni excluidos. */
  assetCount: tally,
  /** La próxima fecha más cercana de sus equipos; null si no cubre ninguno. */
  nextDueOn: z.iso.date().nullable(),
  /** Sus trabajos vencidos o no conformes. */
  overdueCount: tally,
  /** Las exclusiones activas, con su motivo. */
  exclusions: z.array(z.object({ asset: maintenanceAssetRef, reason: z.string(), createdAt: z.string() })),
  archivedAt: z.string().nullable(),
  version: z.number().int().positive(),
});

/**
 * GET /plans: los activos y la cobertura: los equipos no dados de baja sin ningún plan (el total y los
 * primeros 50 por código).
 */
export const planList = z.object({
  items: z.array(plan),
  uncovered: z.object({ total: tally, items: z.array(maintenanceAssetRef) }),
});

export type PlanKind = z.infer<typeof planKind>;
export type WorkKind = z.infer<typeof workKind>;
export type IntervalUnit = z.infer<typeof intervalUnit>;
export type Plan = z.infer<typeof plan>;
export type PlanList = z.infer<typeof planList>;
