import { z } from 'zod';
import { decimalString } from '../decimal.js';
import { text } from '../common.js';

/** Solicitud de salida en la bandeja o en «mis solicitudes». */
const issueRequestItem = z.object({
  id: z.uuid(),
  /** Rechazada: la decidió quien aprueba, con motivo. Cancelada: la retiró quien la pidió. */
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  quantity: decimalString,
  unit: z.string(),
  reason: z.string(),
  destination: z.string(),
  decisionReason: z.string().nullable(),
  requestedAt: z.iso.datetime({ offset: true }),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  positionId: z.uuid(),
  product: z.object({ id: z.uuid(), name: z.string() }),
  container: z.object({ code: z.string() }),
  location: z.object({ code: z.string(), name: z.string() }),
  requester: z.object({ principalId: z.uuid(), displayName: z.string().nullable() }),
  /** La pidió quien consulta: solo esa persona la cancela. */
  mine: z.boolean(),
  decider: z.object({ displayName: z.string().nullable() }).nullable(),
});

export const issueRequestList = z.object({
  /** true si quien consulta puede aprobar: ve la bandeja de su ámbito, no solo las suyas. */
  canApprove: z.boolean(),
  items: z.array(issueRequestItem),
});
export const issueRequestListQuery = z.object({ estado: z.enum(['pendientes', 'todas']).default('pendientes') }).strict();
export const issueRequestParams = z.object({ workspaceId: z.uuid(), requestId: z.uuid() });
export const rejectIssueRequest = z.object({ reason: text(500) }).strict();
export const releasedRequest = z.object({ requestId: z.uuid(), positionId: z.uuid(), status: z.literal('released') });

export type IssueRequestItem = z.infer<typeof issueRequestItem>;
