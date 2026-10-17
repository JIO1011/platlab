import { z } from 'zod';
import { text } from '../common.js';
import { assetCondition, assetConservation } from './catalog.js';

/**
 * POST /assets/:assetId/condition (ADR 0019): cambio con motivo. Volver a operativo exige un
 * resultado; dar de baja es del Administrador y es definitivo.
 */
export const conditionChangeRequest = z
  .object({ condition: assetCondition, reason: text(500), result: text(500).optional() })
  .strict()
  .refine((input) => input.condition !== 'operational' || input.result !== undefined, {
    message: 'Volver a operativo exige un resultado',
    path: ['result'],
  });

/** POST /assets/:assetId/transfers: traslado trazado a otra ubicación (01 §6.3). */
export const transferAssetRequest = z.object({ locationId: z.uuid(), note: text(500).optional() }).strict();

const event = { occurredAt: z.string(), actor: z.string().nullable() };

/** Un hecho del historial del equipo, del más reciente al más antiguo. */
export const assetEvent = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('created'), ...event }),
  z.object({
    kind: z.literal('condition'),
    ...event,
    from: assetCondition,
    to: assetCondition,
    reason: z.string(),
    result: z.string().nullable(),
  }),
  z.object({ kind: z.literal('transfer'), ...event, from: z.string(), to: z.string(), note: z.string().nullable() }),
  // Estado físico cambiado desde la ficha (E-01c); nulo es «sin dato».
  z.object({ kind: z.literal('conservation'), ...event, from: assetConservation.nullable(), to: assetConservation.nullable() }),
]);

/** GET /assets/:assetId/history: los últimos hechos (02 §12 no fija otro límite que la página). */
export const assetHistory = z.object({ items: z.array(assetEvent) });

export type AssetEvent = z.infer<typeof assetEvent>;
export type AssetHistory = z.infer<typeof assetHistory>;
