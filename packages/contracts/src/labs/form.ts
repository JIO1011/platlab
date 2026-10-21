import { z } from 'zod';
import { expectedVersion, text } from '../common.js';

/**
 * Formato de solicitud de Laboratorios (ADR 0023): uno por espacio de trabajo. Cada guardado publica una
 * versión nueva e inmutable con el título y los campos libres; el núcleo es fijo y no se guarda.
 */

export const FORM_MAX_FIELDS = 30;

export const formFieldType = z.enum(['text', 'number', 'date', 'list', 'boolean']);

const fieldBase = {
  /** Clave estable de la respuesta, en minúsculas: la usan las solicitudes de L-01b. */
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, 'Clave en minúsculas, sin espacios'),
  label: text(80),
  required: z.boolean(),
};

/** Opciones de una lista: de 1 a 30, sin repetirse. */
const options = z
  .array(text(80))
  .min(1)
  .max(30)
  .refine((values) => new Set(values).size === values.length, 'Las opciones no se repiten');

/** Solo la lista lleva opciones, y en ella son obligatorias (la misma regla que valida SQL). */
export const formField = z.union([
  z.object({ ...fieldBase, type: z.literal('list'), options }).strict(),
  z.object({ ...fieldBase, type: formFieldType.exclude(['list']) }).strict(),
]);

const fields = z
  .array(formField)
  .max(FORM_MAX_FIELDS)
  .refine((values) => new Set(values.map((field) => field.key)).size === values.length, 'Las claves no se repiten');

/** GET /form: la última versión; sin ninguna publicada, la versión 0 sin título ni campos. */
export const labsForm = z.object({
  version: z.number().int().nonnegative(),
  title: z.string().nullable(),
  fields: z.array(formField),
  publishedAt: z.string().nullable(),
});

/**
 * POST /form: publica la versión siguiente. `expectedVersion` es la que la persona vio (0 si no había
 * ninguna); si otra persona publicó antes, VERSION_CONFLICT.
 */
export const publishFormRequest = z
  .object({ title: text(120), fields, expectedVersion: expectedVersion.or(z.literal(0)) })
  .strict();

export type FormField = z.infer<typeof formField>;
export type LabsForm = z.infer<typeof labsForm>;
