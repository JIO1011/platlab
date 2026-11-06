import { z } from 'zod';
import { expectedVersion, text } from '../common.js';
import { nonNegativeQuantity } from '../decimal.js';
import { reportFaultRequest } from '../equipment/faults.js';

/**
 * Preparación y cierre de cada bloque (ADR 0023, «Cierre de Laboratorios», L-01e): programada → lista → en curso →
 * cerrada, por quien tenga `labs.schedule.lead`. Al cerrar, lo utilizado de cada reactivo sale del inventario y lo
 * demás vuelve a estar disponible.
 */

export const activityStage = z.enum(['scheduled', 'ready', 'running', 'closed']);

/** Mover o cambiar lo apartado, solo antes de empezar. */
export const ACTIVITY_CHANGEABLE: readonly ActivityStage[] = ['scheduled', 'ready'];

const lineNumber = z.number().int().min(1).max(90);
/** Sin líneas repetidas. */
const uniqueLines = (lines: readonly number[]) => new Set(lines).size === lines.length;

/** PUT /activities/:activityId/checklist: las líneas ya preparadas. No bloquea «Lista». */
export const practiceChecklistRequest = z
  .object({ expectedVersion, lines: z.array(lineNumber).max(90).refine(uniqueLines, 'Cada línea va una sola vez') })
  .strict();

/** POST /activities/:activityId/ready y /start: un paso adelante con la versión que se vio. */
export const practiceStepRequest = z.object({ expectedVersion }).strict();

/** POST /activities/:activityId/close: lo utilizado de cada reactivo apartado, hasta lo apartado, y las observaciones. */
export const closePracticeRequest = z
  .object({
    expectedVersion,
    usage: z
      .array(z.object({ line: lineNumber, used: nonNegativeQuantity }).strict())
      .max(90)
      .refine((usage) => uniqueLines(usage.map((item) => item.line)), 'Cada línea va una sola vez'),
    notes: text(1000).nullable(),
  })
  .strict();

/** POST /activities/:activityId/incidents: el incidente de un equipo apartado, que nace en Equipos. */
export const practiceIncidentRequest = reportFaultRequest;

/** Lo apartado, utilizado y devuelto de un reactivo al cerrar. */
export const practiceUsage = z.object({ line: z.number().int(), held: z.string(), used: z.string(), returned: z.string() });

/** GET /assets/:assetId/bookings: las próximas reservas de un equipo en el Cronograma («Reservado» en Equipos). */
export const assetBookings = z.object({
  items: z.array(
    z.object({
      activityId: z.uuid(),
      code: z.string(),
      date: z.iso.date(),
      startsAt: z.string(),
      endsAt: z.string(),
      areaName: z.string(),
      requesterName: z.string(),
      stage: activityStage,
    }),
  ),
});

/** GET /incidents/:faultId/practice: la práctica en que se reportó un incidente, si nació de una. */
export const incidentPractice = z.object({
  practice: z
    .object({
      activityId: z.uuid(),
      code: z.string(),
      title: z.string(),
      requesterName: z.string(),
      date: z.iso.date(),
      startsAt: z.string(),
      endsAt: z.string(),
      areaName: z.string(),
    })
    .nullable(),
});

export const assetBookingParams = z.object({ workspaceId: z.uuid(), assetId: z.uuid() });
export const incidentPracticeParams = z.object({ workspaceId: z.uuid(), faultId: z.uuid() });

export type ActivityStage = z.infer<typeof activityStage>;
export type PracticeChecklistRequest = z.infer<typeof practiceChecklistRequest>;
export type ClosePracticeRequest = z.infer<typeof closePracticeRequest>;
export type PracticeUsage = z.infer<typeof practiceUsage>;
export type AssetBookings = z.infer<typeof assetBookings>;
export type IncidentPractice = z.infer<typeof incidentPractice>;
