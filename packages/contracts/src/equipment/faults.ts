import { z } from 'zod';
import { list, many, page, text } from '../common.js';

/** Incidentes, que son las fallas (ADR 0019): la capacidad incidencias con rutas y permisos de Equipos. */

export const faultType = z.enum(['electrical', 'mechanical', 'spare_part', 'other']);
/** Reportado → en reparación → solucionado (definitivo). */
export const faultStatus = z.enum(['open', 'in_progress', 'resolved']);

/** POST /faults: quien reporta dice si el equipo se puede seguir usando; si no, pasa a fuera de servicio. */
export const reportFaultRequest = z
  .object({ assetId: z.uuid(), faultType, description: text(2000), usable: z.boolean() })
  .strict();

/** POST /faults/:faultId/resolve, «Marcar como solucionado»: qué se hizo es obligatorio; puede devolver el equipo a operativo. */
export const resolveFaultRequest = z.object({ resolution: text(2000), returnToOperational: z.boolean() }).strict();

export const faultParams = z.object({ workspaceId: z.uuid(), faultId: z.uuid() });

const person = z.object({ name: z.string() }).nullable();

export const fault = z.object({
  id: z.uuid(),
  asset: z.object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    photoUrl: z.string().nullable(),
    location: z.object({ name: z.string(), path: z.array(z.string()) }),
  }),
  faultType,
  description: z.string(),
  usable: z.boolean(),
  status: faultStatus,
  reportedBy: person,
  reportedAt: z.string(),
  attendedBy: person,
  attendedAt: z.string().nullable(),
  resolution: z.string().nullable(),
  resolvedBy: person,
  resolvedAt: z.string().nullable(),
});

/**
 * GET /faults: del más reciente al más antiguo. Quien atiende fallas ve todas; quien solo reporta, las
 * suyos. Sin `status`, todos.
 */
export const faultListQuery = z.object({ ...page, status: many(faultStatus), asset: z.uuid().optional() }).strict();
export const faultList = list(fault);

const tally = z.number().int().nonnegative();

/** GET /faults/counts: cuántos incidentes hay en cada paso, con el alcance de la lista (las pestañas de Incidentes). */
export const faultCounts = z.object({ open: tally, inProgress: tally, resolved: tally });

/**
 * GET /faults/stats, «Incidentes en 12 meses» del Resumen (ADR 0019), para quien atiende: los 12 meses de
 * calendario hasta el actual en la zona del espacio («2026-10»), del más antiguo al actual.
 */
export const faultStats = z.object({
  months: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), reported: tally, resolved: tally })).length(12),
  /** De reportado a solucionado, en promedio, entre los solucionados en el período; sin ninguno, null. */
  meanRepairSeconds: tally.nullable(),
  /** La suma de lo que cada equipo pasó fuera de servicio en el período, con el tramo en curso, y cuántos equipos. */
  outOfService: z.object({ seconds: tally, assets: tally }),
});

/** GET /faults/assets: para reportar, quien no consulta el inventario busca el equipo por código o nombre. */
export const reportableAssetQuery = z.object({ q: z.string().trim().min(2).max(100) }).strict();
/** Lo que identifica al equipo para reportarlo, sin su ficha completa. */
export const reportableAsset = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  photoUrl: z.string().nullable(),
  location: z.object({ name: z.string(), path: z.array(z.string()) }),
});
export const reportableAssetList = z.object({ items: z.array(reportableAsset) });

export type FaultType = z.infer<typeof faultType>;
export type FaultStatus = z.infer<typeof faultStatus>;
export type Fault = z.infer<typeof fault>;
export type FaultList = z.infer<typeof faultList>;
export type FaultCounts = z.infer<typeof faultCounts>;
export type FaultStats = z.infer<typeof faultStats>;
export type ReportableAsset = z.infer<typeof reportableAsset>;
export type ReportableAssetList = z.infer<typeof reportableAssetList>;
