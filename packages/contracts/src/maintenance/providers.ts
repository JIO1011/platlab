import { z } from 'zod';
import { text } from '../common.js';

/** Proveedores de servicio del espacio (ADR 0020): los crea, edita y archiva el Administrador; nunca se borran. */

/** La versión que la persona vio al editar: si otra persona cambió el recurso antes, VERSION_CONFLICT. */
export const expectedVersion = z.number().int().positive();

export const provider = z.object({
  id: z.uuid(),
  name: z.string(),
  /** Teléfono, correo o persona de contacto, como texto libre. */
  contact: z.string().nullable(),
  archivedAt: z.string().nullable(),
  version: z.number().int().positive(),
});

/** GET /providers: los activos, en orden alfabético. */
export const providerList = z.object({ items: z.array(provider) });

/** POST /providers: un nombre activo repetido, sin tildes ni mayúsculas, responde NAME_TAKEN. */
export const createProviderRequest = z.object({ name: text(120), contact: text(300).nullable().default(null) }).strict();

/** PATCH /providers/:providerId: solo lo que llega cambia; `contact: null` lo borra. */
export const updateProviderRequest = z
  .object({ name: text(120).optional(), contact: text(300).nullable().optional(), expectedVersion })
  .strict();

export const providerParams = z.object({ workspaceId: z.uuid(), providerId: z.uuid() });

export type Provider = z.infer<typeof provider>;
export type ProviderList = z.infer<typeof providerList>;
