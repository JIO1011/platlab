import { z } from 'zod';
import { expectedVersion, list, many, money, page, text } from '../common.js';
import { assetCondition, assetConservation } from '../equipment/catalog.js';
import { faultType } from '../equipment/faults.js';
import { maintenanceAssetRef, planRef, workKind } from './plans.js';

/**
 * Trabajo de Mantenimiento (ADR 0020): «Por hacer» se calcula desde los planes al consultar; el registro
 * de lo hecho es inmutable, con un certificado PDF como mucho. Fechas en la zona del espacio.
 */

const tally = z.number().int().nonnegative();
const date = z.iso.date();

const workResult = z.enum(['pass', 'pass_with_observations', 'fail']);

const area = { area: z.string().nullable() };

/** Un registro por su fecha de trabajo: la anulación y la corrección se señalan así. */
const recordRef = z.object({ id: z.uuid(), performedOn: date });

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
 * GET /summary: trabajos vencidos (antes de hoy) o no conformes, cuántos de ellos son no conformes, los
 * demás que tocan desde hoy hasta dentro de 30 días y, para quien lo descarta, cuántos equipos piden
 * «Evaluar reemplazo» (M-01c); null para los demás.
 */
export const maintenanceSummary = z.object({
  today: date,
  overdue: tally,
  nonconforming: tally,
  next30: tally,
  uncovered: tally,
  replacement: tally.nullable(),
});

export const record = z.object({
  id: z.uuid(),
  /** Con el área en que está hoy el equipo (M-01d). */
  asset: maintenanceAssetRef.extend(area),
  /** Sin plan, el registro lleva solo su tipo de trabajo. El requisito es el que el plan dice hoy (M-01c). */
  plan: planRef.extend({ requirement: z.string().nullable() }).nullable(),
  kind: workKind,
  performedOn: date,
  /**
   * La fecha que tocaba según el plan al registrarlo (M-01c): mide si se hizo a tiempo. null sin plan, en la
   * historia cargada y al repetir un «No conforme».
   */
  dueOn: date.nullable(),
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
  /** El incidente de Equipos que atiende un correctivo (M-01b). */
  faultId: z.uuid().nullable(),
  /** El registro anulado que este corrige. */
  corrects: recordRef.nullable(),
  /**
   * Anulado por el Administrador (M-01b): sigue a la vista, con motivo, quién y cuándo, y deja de contar para
   * la próxima fecha. `correctedBy` es el registro que lo reemplazó, si lo hay.
   */
  voided: z
    .object({ at: z.string(), by: z.object({ name: z.string() }).nullable(), reason: z.string(), correctedBy: recordRef.nullable() })
    .nullable(),
});

/** POST /records responde el registro con la próxima fecha del plan para el equipo (null sin plan). */
export const recordCreated = record.extend({ nextDueOn: date.nullable() });

/**
 * POST /records, «Registrar mantenimiento»: con el plan que se elige y la versión que se vio o, sin plan,
 * con su tipo de trabajo. `checklist` marca, en orden, cada ítem de la lista del plan; el servidor guarda la
 * lista con sus marcas y el criterio del plan. `conservation` es el estado físico actual que se fija: Equipos
 * lo aplica hoy con su permiso y su historial, aunque el trabajo sea de una fecha pasada, y el registro no
 * lo guarda. Un correctivo dice qué se hizo y puede ligar un incidente del equipo (`faultId`); con
 * `resolveFault`, Equipos lo soluciona con ese texto y, si se pide, devuelve el equipo a operativo.
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
    faultId: z.uuid().nullable().default(null),
    resolveFault: z.object({ returnToOperational: z.boolean() }).strict().nullable().default(null),
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
  })
  .refine((input) => input.kind !== 'corrective' || (input.planId === null && input.observations !== null), {
    message: 'En un correctivo, escribe qué se hizo',
    path: ['observations'],
  })
  .refine((input) => input.faultId === null || (input.planId === null && input.kind === 'corrective'), {
    message: 'Solo un correctivo atiende un incidente',
    path: ['faultId'],
  })
  .refine((input) => input.resolveFault === null || (input.faultId !== null && input.result !== 'fail'), {
    message: 'Solo un correctivo Conforme o Con observaciones soluciona su incidente',
    path: ['resolveFault'],
  });

const reason = text(500);

/** POST /records/:recordId/void: el Administrador anula un registro con su motivo (M-01b). */
export const voidRecordRequest = z.object({ reason }).strict();

/**
 * POST /records/:recordId/correction: el Administrador anula el registro y registra el correcto, del mismo
 * equipo, en un solo paso (M-01b). Con `keepCertificate`, el nuevo lleva el certificado del anulado.
 */
export const correctRecordRequest = z.object({ reason, keepCertificate: z.boolean(), record: createRecordRequest }).strict();

/**
 * Filtros del Historial (M-01d): con `assetId`, los de un equipo; el periodo va por la fecha del trabajo, ambos
 * extremos incluidos; el área es la del equipo hoy; `internal` es el trabajo sin proveedor.
 */
const recordFilters = {
  assetId: z.uuid().optional(),
  from: date.optional(),
  to: date.optional(),
  kind: many(workKind),
  result: many(workResult),
  area: many(z.uuid()),
  provider: many(z.union([z.uuid(), z.literal('internal')])),
};

const periodInOrder = (input: { from?: string | undefined; to?: string | undefined }) =>
  input.from === undefined || input.to === undefined || input.from <= input.to;
const periodMessage = { message: '«Desde» no puede ser posterior a «Hasta»', path: ['to'] };

/** GET /records: los completados, del más reciente al más antiguo, con los filtros del Historial. */
export const recordListQuery = z
  .object({ ...page, ...recordFilters })
  .strict()
  .refine(periodInOrder, periodMessage);

/** GET /records/export: el Excel del Historial, con los mismos filtros y sin paginar (M-01d). */
export const recordFilterQuery = z.object(recordFilters).strict().refine(periodInOrder, periodMessage);
export const recordList = list(record);

export const recordParams = z.object({ workspaceId: z.uuid(), recordId: z.uuid() });

/** GET /areas: las áreas con algún equipo no dado de baja, para el filtro del Historial (M-01d). */
export const maintenanceAreaList = z.object({ items: z.array(z.object({ id: z.uuid(), name: z.string() })) });

/** GET /assets: para registrar por búsqueda (`q`, en el código o el nombre) o por el código exacto. */
export const maintenanceAssetQuery = z
  .object({ q: z.string().trim().min(2).max(100).optional(), code: z.string().trim().min(1).max(64).optional() })
  .strict()
  .refine((input) => (input.q === undefined) !== (input.code === undefined), { message: 'Busca por texto o por código' });

// El estado físico actual: la hoja lo muestra y solo lo cambia si se elige otro (ADR 0020).
const maintenanceAsset = maintenanceAssetRef.extend({ ...area, condition: assetCondition, conservation: assetConservation.nullable() });

/** Hasta 20 equipos no dados de baja, por código. */
export const maintenanceAssetList = z.object({ items: z.array(maintenanceAsset) });

export const maintenanceAssetParams = z.object({ workspaceId: z.uuid(), assetId: z.uuid() });

/** Un incidente abierto del equipo, que un correctivo puede atender (M-01b). */
const openFault = z.object({
  id: z.uuid(),
  faultType,
  description: z.string(),
  usable: z.boolean(),
  status: z.enum(['open', 'in_progress']),
  reportedAt: z.string(),
});

/**
 * GET /assets/:assetId, la pestaña Mantenimiento de la ficha y la hoja de registro: sus planes, sus exclusiones,
 * sus últimos 20 registros y, para quien atiende incidentes, los abiertos.
 */
export const assetMaintenance = z.object({
  asset: maintenanceAsset,
  openFaults: z.array(openFault),
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

/**
 * GET /plans/:planId/assets: los equipos que alcanza el plan (los no dados de baja de su tipo, o su equipo),
 * por código. Incluido, con su próxima fecha y su último resultado; excluido, con el motivo y el plan propio
 * que lo reemplaza, si lo hay. Así se muestra «Incluido» por equipo (ADR 0020).
 */
export const planAssetList = z.object({
  items: z.array(
    z.object({
      asset: maintenanceAssetRef.extend(area),
      dueOn: date.nullable(),
      lastResult,
      exclusion: z.object({ reason: z.string(), replacedBy: planRef.nullable() }).nullable(),
    }),
  ),
});

export type WorkResult = z.infer<typeof workResult>;
export type PlanAssetList = z.infer<typeof planAssetList>;
export type DueList = z.infer<typeof dueList>;
export type MaintenanceSummary = z.infer<typeof maintenanceSummary>;
export type MaintenanceRecord = z.infer<typeof record>;
export type RecordCreated = z.infer<typeof recordCreated>;
export type RecordList = z.infer<typeof recordList>;
export type RecordFilters = z.infer<typeof recordFilterQuery>;
export type MaintenanceAreaList = z.infer<typeof maintenanceAreaList>;
export type MaintenanceAsset = z.infer<typeof maintenanceAsset>;
export type MaintenanceAssetList = z.infer<typeof maintenanceAssetList>;
export type AssetMaintenance = z.infer<typeof assetMaintenance>;
export type OpenFault = z.infer<typeof openFault>;
export type NextDueList = z.infer<typeof nextDueList>;
