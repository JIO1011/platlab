import { z } from 'zod';
import { text } from './shared.js';

// ---------------------------------------------------------------------------
// Motivos, destinos (ADR 0012) y áreas (ADR 0015): listas del espacio; se guarda el texto elegido
// ---------------------------------------------------------------------------

const reasonKind = z.enum(['issue', 'adjustment']);
export const reasonListQuery = z.object({ kind: reasonKind }).strict();
const listEntry = z.object({ id: z.uuid(), name: z.string() });
export const entryList = z.object({ items: z.array(listEntry) });
export const createReasonRequest = z.object({ kind: reasonKind, name: text(120) }).strict();
/** Alta de un destino o de un área: listas con solo un nombre. */
export const createEntryRequest = z.object({ name: text(120) }).strict();
export const entryParams = z.object({ workspaceId: z.uuid(), entryId: z.uuid() });

export type ListEntry = z.infer<typeof listEntry>;
export type ReasonKind = z.infer<typeof reasonKind>;
