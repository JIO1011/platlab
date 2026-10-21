import { z } from 'zod';
import { text } from '../common.js';

// ---------------------------------------------------------------------------
// Motivos (ADR 0012): lista del espacio; se guarda el texto elegido. Destinos y áreas pasaron a los
// departamentos del Núcleo (ADR 0024)
// ---------------------------------------------------------------------------

const reasonKind = z.enum(['issue', 'adjustment']);
export const reasonListQuery = z.object({ kind: reasonKind }).strict();
const listEntry = z.object({ id: z.uuid(), name: z.string() });
export const entryList = z.object({ items: z.array(listEntry) });
export const createReasonRequest = z.object({ kind: reasonKind, name: text(120) }).strict();
export const entryParams = z.object({ workspaceId: z.uuid(), entryId: z.uuid() });

export type ListEntry = z.infer<typeof listEntry>;
export type ReasonKind = z.infer<typeof reasonKind>;
