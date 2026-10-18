import { z } from 'zod';
import { list, money, page, text } from '../common.js';
import { assetCondition, assetConservation } from '../equipment/catalog.js';
import { maintenanceAssetRef, planRef, workKind } from './plans.js';
import { expectedVersion } from './providers.js';

/**
 * Trabajo de Mantenimiento (ADR 0020): «Por hacer» se calcula desde los planes al consultar; el registro
 * de lo hecho es inmutable, con un certificado PDF como mucho. Fechas en la zona del espacio.
 */

const tally = z.number().int().nonnegative();
const date = z.iso.date();

const workResult = z.enum(['pass', 'pass_with_observations', 'fail']);

const area = { area: z.string().nullable() };

/**
 * El resultado del último registro del plan para el equipo; null si nunca se hizo. Mientras sea «fail»,
 * el trabajo sigue pendiente aunque su fecha haya avanzado (No conforme, ADR 0020).
 */
const lastResult = workResult.nullable();

/**
 * GET /due: los no conformes, sea cual sea su fecha, y después lo que vence hasta dentro de 30 días, de la
 * fecha más antigua a la más nueva (hasta 300; `total` cuenta todos).
 */
export const dueList = z.object({
  today: date,
  items: z.array(
    z.object({
      plan: planRef,
      asset: maintenanceAssetRef.extend(area),
      dueOn: date,
      /** El último registro del plan para el equipo; null si nunca se hizo. */
      lastRecord: z.object({ id: z.uuid(), performedOn: date }).nullable(),
      lastResult,
    }),
  ),
  total: tally,
  truncated: z.boolean(),
});

/**
 * GET /summary: trabajos vencidos (antes de hoy) o no conformes, cuántos de ellos son no conformes, y los
 * demás que tocan desde hoy hasta dentro de 30 días.
 */
export const maintenanceSummary = z.object({ today: date, overdue: tally, nonconforming: tally, next30: tally });

export const record = z.object({
  id: z.uuid(),
  asset: maintenanceAssetRef,
  /** Sin plan, el registro lleva solo su tipo de trabajo. */
  plan: planRef.nullable(),
  kind: workKind,
  performedOn: date,
  /** null es un trabajo interno. */
  provider: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  result: workResult,
  observations: z.string().nullable(),
  checklist: z.array(z.object({ item: z.string(), done: z.boolean() })),
  cost: money.nullable(),
  validUntil: date.nullable(),
  /** El criterio de aceptación del plan con que se evaluó, copiado al registrar; null sin plan o sin criterio. */
  acceptanceCriteria: z.string().nullable(),
  /** Quién lo registró; null si ya no es miembro. */
  recordedBy: z.object({ name: z.string() }).nullable(),
  recordedAt: z.string(),
  certificate: z.object({ url: z.string(), byteSize: z.number().int().positive(), uploadedAt: z.string() }).nullable(),
});

/** POST /records responde el registro con la próxima fecha del plan para el equipo (null sin plan). */
export const recordCreated = record.extend({ nextDueOn: date.nullable() });

/**
 * POST /records, «Registrar mantenimiento»: con el plan que se elige y la versión que se vio o, sin plan,
 * con su tipo de trabajo. `checklist` marca, en orden, cada ítem de la lista del plan; el servidor guarda la
 * lista con sus marcas y el criterio del plan. `conservation` es el estado físico actual que se fija: Equipos
 * lo aplica hoy con su permiso y su historial, aunque el trabajo sea de una fecha pasada, y el registro no
 * lo guarda.
 */
export const createRecordRequest = z
  .object({
    assetId: z.uuid(),
    planId: z.uuid().nullable().default(null),
    planVersion: expectedVersion.optional(),
    kind: workKind.optional(),
    performedOn: date,
    providerId: z.uuid().nullable().default(null),
    result: workResult,
    observations: text(2000).nullable().default(null),
    checklist: z.array(z.boolean()).max(30).default([]),
    cost: money.nullable().default(null),
    validUntil: date.nullable().default(null),
    conservation: assetConservation.nullable().default(null),
  })
  .strict()
  .refine((input) => input.planId !== null || input.kind !== undefined, { message: 'Sin plan, indica el tipo de trabajo' })
  .refine((input) => (input.planId === null) === (input.planVersion === undefined), {
    message: 'La versión es la del plan elegido',
    path: ['planVersion'],
  })
  .refine((input) => input.result === 'pass' || input.observations !== null, {
    message: 'Con observaciones o no conforme, las observaciones son obligatorias',
    path: ['observations'],
  })
  .refine((input) => input.validUntil === null || input.validUntil >= input.performedOn, {
    message: 'La fecha «válida hasta» no puede ser anterior a la del trabajo',
    path: ['validUntil'],
  });

/** GET /records: los completados, del más reciente al más antiguo; con `assetId`, los de un equipo. */
export const recordListQuery = z.object({ ...page, assetId: z.uuid().optional() }).strict();
export const recordList = list(record);

export const recordParams = z.object({ workspaceId: z.uuid(), recordId: z.uuid() });

/** GET /assets: para registrar por búsqueda (`q`, en el código o el nombre) o por el código exacto. */
export const maintenanceAssetQuery = z
  .object({ q: z.string().trim().min(2).max(100).optional(), code: z.string().trim().min(1).max(64).optional() })
  .strict()
  .refine((input) => (input.q === undefined) !== (input.code === undefined), { message: 'Busca por texto o por código' });

const maintenanceAsset = maintenanceAssetRef.extend({ ...area, condition: assetCondition });

/** Hasta 20 equipos no dados de baja, por código. */
export const maintenanceAssetList = z.object({ items: z.array(maintenanceAsset) });

export const maintenanceAssetParams = z.object({ workspaceId: z.uuid(), assetId: z.uuid() });

/** GET /assets/:assetId, la pestaña Mantenimiento de la ficha: sus planes, sus exclusiones y sus últimos 20 registros. */
export const assetMaintenance = z.object({
  asset: maintenanceAsset,
  plans: z.array(z.object({ plan: planRef, dueOn: date, lastPerformedOn: date.nullable(), lastResult })),
  exclusions: z.array(z.object({ plan: planRef, reason: z.string(), createdAt: z.string() })),
  records: z.array(record),
});

/** GET /next-due?assetIds=a,b: hasta 100 equipos, separados por comas. */
export const nextDueQuery = z
  .object({
    assetIds: z
      .string()
      .transform((value) => [...new Set(value.split(','))])
      .pipe(z.array(z.uuid()).min(1).max(100)),
  })
  .strict();

/**
 * Para la columna «Próximo mantenimiento», de cada equipo con algún plan: su plan no conforme o, si no hay,
 * la fecha más cercana.
 */
export const nextDueList = z.object({ items: z.array(z.object({ assetId: z.uuid(), dueOn: date, plan: planRef, lastResult })) });

export type WorkResult = z.infer<typeof workResult>;
export type DueList = z.infer<typeof dueList>;
export type MaintenanceSummary = z.infer<typeof maintenanceSummary>;
export type MaintenanceRecord = z.infer<typeof record>;
export type RecordCreated = z.infer<typeof recordCreated>;
export type RecordList = z.infer<typeof recordList>;
export type MaintenanceAsset = z.infer<typeof maintenanceAsset>;
export type MaintenanceAssetList = z.infer<typeof maintenanceAssetList>;
export type AssetMaintenance = z.infer<typeof assetMaintenance>;
export type NextDueList = z.infer<typeof nextDueList>;
