import { z } from 'zod';
import { expectedVersion } from '../common.js';
import { positiveQuantity } from '../decimal.js';

/**
 * Cambiar los frascos apartados (ADR 0023, «Cierre de Laboratorios»): en un bloque programado o listo, el Administrador
 * elige de qué frascos sale cada cantidad de un reactivo, hasta lo pedido; lo que no cubre queda «Falta».
 */

export const activityLineParams = z.object({ workspaceId: z.uuid(), activityId: z.uuid(), line: z.coerce.number().int().min(1).max(90) });

/** GET /activities/:activityId/lines/:line/reagent-options: los frascos usables y vigentes ese día, los que vencen antes primero. */
export const reagentPickOptions = z.object({
  /** Lo pedido para esta fecha, en la unidad base del reactivo. */
  needed: z.string(),
  unit: z.string(),
  items: z.array(
    z.object({
      positionId: z.uuid(),
      containerCode: z.string().nullable(),
      lotCode: z.string(),
      expiresOn: z.iso.date().nullable(),
      locationName: z.string(),
      /** Lo que se puede apartar de este frasco, contando lo que el bloque ya apartó de él. */
      available: z.string(),
      /** Lo que el bloque tiene apartado de este frasco. */
      held: z.string(),
    }),
  ),
});

/** PUT /activities/:activityId/lines/:line/reagents: los frascos elegidos con su cantidad; sin frascos, no aparta nada. */
export const reagentPicksRequest = z
  .object({
    expectedVersion,
    picks: z
      .array(z.object({ positionId: z.uuid(), quantity: positiveQuantity }).strict())
      .max(50)
      .refine((picks) => new Set(picks.map((pick) => pick.positionId)).size === picks.length, 'Cada frasco va una sola vez'),
  })
  .strict();

export type ReagentPickOptions = z.infer<typeof reagentPickOptions>;
export type ReagentPicksRequest = z.infer<typeof reagentPicksRequest>;
