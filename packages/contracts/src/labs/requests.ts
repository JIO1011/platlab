import { z } from 'zod';
import { expectedVersion, text } from '../common.js';
import { decimalString } from '../decimal.js';
import type { FormFreeField, FormLayout } from './form.js';

/**
 * Solicitudes de Laboratorios (ADR 0023, «Diseño de L-01b»): el Docente o el tesista llena un formato activo, la guarda
 * como borrador y la envía; el Administrador pide cambios o la rechaza con motivo, y programarla llega con el
 * Cronograma (L-01c). Validar los recursos no reserva nada. `labs.requests` y `labs.request_lines` aplican las mismas
 * formas en SQL.
 */

export const REQUEST_MAX_DATES = 20;
export const REQUEST_MAX_LINES = 90;

export const requestStatus = z.enum(['draft', 'submitted', 'changes_requested', 'scheduled', 'rejected', 'cancelled']);
/** Quien pide la edita en borrador y con cambios solicitados. */
export const REQUEST_EDITABLE: readonly RequestStatus[] = ['draft', 'changes_requested'];
/** Quien pide la cancela mientras no esté cerrada; programada, hasta el día anterior a su primer bloque (L-01c). */
export const REQUEST_CANCELLABLE: readonly RequestStatus[] = ['draft', 'submitted', 'changes_requested', 'scheduled'];

/** El tipo de actividad, dato del sistema «tipo». */
export const activityType = z.enum(['practice', 'research', 'service', 'training']);

/** El número fijo antes de programar: 42 → «SOL-0042». */
export const requestCode = (number: number): string => `SOL-${String(number).padStart(4, '0')}`;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora HH:MM');
const positive = decimalString.refine((value) => !value.startsWith('-') && /[1-9]/.test(value), 'Debe ser mayor que cero');
const count = z.number().int().min(1).max(10_000);

/**
 * Una línea de recursos. Reactivos: del catálogo (en su unidad base) o «no catalogado» con descripción y unidad, siempre
 * en total. Equipos: por tipo o «no catalogado», en unidades, con el total y, si se pidió así, por grupo. Materiales:
 * texto con cantidad, sin inventario hasta Materiales.
 */
export const requestLineInput = z.discriminatedUnion('kind', [
  z
    .object({ kind: z.literal('reagent'), itemId: z.uuid().nullable(), description: text(200).nullable(), quantity: positive, unit: z.string().regex(/^[A-Za-z]{1,10}$/) })
    .strict()
    .refine((line) => (line.itemId === null) !== (line.description === null), 'Del catálogo o no catalogado'),
  z
    .object({ kind: z.literal('equipment'), assetTypeId: z.uuid().nullable(), description: text(200).nullable(), perGroup: count.nullable(), quantity: count })
    .strict()
    .refine((line) => (line.assetTypeId === null) !== (line.description === null), 'Por tipo o no catalogado'),
  z.object({ kind: z.literal('material'), description: text(200), perGroup: positive.nullable(), quantity: positive }).strict(),
]);

/**
 * PUT /requests/:requestId: guarda el borrador (o la corrección pedida) entero, con la versión que la persona vio. Puede
 * estar a medias; enviar exige lo esencial. Asignatura y carrera van por nombre: un nombre nuevo entra a su lista.
 */
export const saveRequestRequest = z
  .object({
    expectedVersion,
    title: text(200).nullable(),
    teacherName: text(120).nullable(),
    activityType: activityType.nullable(),
    subject: text(120).nullable(),
    career: text(120).nullable(),
    dates: z
      .array(z.iso.date())
      .max(REQUEST_MAX_DATES)
      .refine((values) => new Set(values).size === values.length, 'Cada fecha va una vez'),
    startsAt: time.nullable(),
    endsAt: time.nullable(),
    participants: z.number().int().min(1).max(1000).nullable(),
    groups: z.number().int().min(1).max(100),
    areaId: z.uuid().nullable(),
    answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    notes: text(2000).nullable(),
    lines: z.array(requestLineInput).max(REQUEST_MAX_LINES),
  })
  .strict()
  .refine((value) => !value.startsAt || !value.endsAt || value.startsAt < value.endsAt, { message: 'La hora de fin va después del inicio', path: ['endsAt'] });

/** POST /requests: un borrador con la última revisión de un formato activo o, con `from`, la copia de una solicitud propia. */
export const createRequestRequest = z.union([
  z.object({ formId: z.uuid() }).strict(),
  z.object({ from: z.uuid() }).strict(),
]);

/** Enviar y cancelar: con la versión que la persona vio. */
export const requestVersionRequest = z.object({ expectedVersion }).strict();
/** Pedir cambios y rechazar: siempre con motivo. */
export const requestReasonRequest = z.object({ expectedVersion, reason: text(500) }).strict();

export const requestParams = z.object({ workspaceId: z.uuid(), requestId: z.uuid() });
/** GET /requests: `mine`, las propias; `inbox`, las recibidas (sin borradores ajenos), para quien las consulta. */
export const requestListQuery = z.object({ scope: z.enum(['mine', 'inbox']).default('mine') });

/** ✔ alcanza, ⚠ no alcanza, ✖ no catalogado o sin inventario que lo verifique. Se calcula al leer: no reserva. */
export const lineCheck = z.enum(['ok', 'short', 'unverified']);

const requestLine = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reagent'), itemId: z.uuid().nullable(), name: z.string(), quantity: z.string(), unit: z.string(), check: lineCheck, available: z.string().nullable() }),
  z.object({ kind: z.literal('equipment'), assetTypeId: z.uuid().nullable(), name: z.string(), perGroup: z.number().nullable(), quantity: z.number(), check: lineCheck, available: z.number().nullable() }),
  z.object({ kind: z.literal('material'), name: z.string(), perGroup: z.string().nullable(), quantity: z.string(), check: lineCheck }),
]);

const requestEvent = z.object({
  action: z.enum(['submitted', 'changes_requested', 'resubmitted', 'scheduled', 'rejected', 'cancelled']),
  reason: z.string().nullable(),
  by: z.string(),
  at: z.string(),
});

/** Una solicitud en las listas: lo que la bandeja ordena (fuera de plazo y recursos que faltan primero). */
export const requestSummary = z.object({
  id: z.uuid(),
  number: z.number().int().positive(),
  code: z.string(),
  status: requestStatus,
  formName: z.string(),
  title: z.string().nullable(),
  requesterName: z.string(),
  firstDate: z.iso.date().nullable(),
  dateCount: z.number().int(),
  late: z.boolean(),
  /** Líneas con ⚠ o ✖. */
  exceptions: z.number().int(),
  /** Fechas que ya tienen bloque en el Cronograma (L-01c): «1 de 2 programadas». */
  scheduledCount: z.number().int(),
  /** Las fechas pedidas y las ya programadas, con el horario, los participantes y el grupo: la bandeja «Por programar». */
  dates: z.array(z.iso.date()),
  scheduledDates: z.array(z.iso.date()),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  participants: z.number().int().nullable(),
  /** La materia y el «Grupo» del bloque: la asignatura y la carrera, si las tiene. */
  subject: z.string().nullable(),
  group: z.string().nullable(),
  submittedAt: z.string().nullable(),
  version: z.number().int().positive(),
});

export const requestList = z.object({ items: z.array(requestSummary) });

/** GET /requests/:requestId y la respuesta de los comandos: la solicitud con la revisión del formato con que se llena. */
export const labsRequest = requestSummary.extend({
  formId: z.uuid(),
  formRevision: z.number().int().positive(),
  formTitle: z.string(),
  documentCode: z.string().nullable(),
  /** La hoja de esa revisión (`FormLayout`); el cliente la valida con `formLayout` si lo necesita. */
  layout: z.unknown(),
  teacherName: z.string().nullable(),
  activityType: activityType.nullable(),
  subject: z.string().nullable(),
  career: z.string().nullable(),
  dates: z.array(z.iso.date()),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  participants: z.number().int().nullable(),
  groups: z.number().int(),
  areaId: z.uuid().nullable(),
  answers: z.record(z.string(), z.unknown()),
  notes: z.string().nullable(),
  lines: z.array(requestLine),
  events: z.array(requestEvent),
  /** El bloque de cada fecha programada: código, área, hora y responsable. */
  blocks: z.array(z.object({ date: z.iso.date(), code: z.string(), areaId: z.uuid(), areaName: z.string(), startsAt: z.string(), endsAt: z.string(), responsibleName: z.string() })),
  /** Si quien mira la puede editar, enviar o cancelar (es suya y el estado lo admite). */
  mine: z.boolean(),
});

/** GET /request-options: lo que se puede pedir y las listas, con lo disponible hoy. */
export const requestOptions = z.object({
  /** Sin Reactivos o Equipos admitidos, sus líneas van «no catalogadas». */
  reagentsEnabled: z.boolean(),
  equipmentEnabled: z.boolean(),
  reagents: z.array(z.object({ id: z.uuid(), code: z.string(), name: z.string(), unit: z.string(), available: z.string() })),
  equipmentTypes: z.array(z.object({ id: z.uuid(), name: z.string(), available: z.number().int() })),
  subjects: z.array(z.string()),
  careers: z.array(z.string()),
});

/** Los datos libres de una revisión: cada respuesta con su tipo y las obligatorias presentes. */
export function requestAnswers(layout: FormLayout) {
  const fields = layout.rows.flatMap((row) => (row.kind === 'row' ? row.fields : [])).filter((field): field is FormFreeField => 'type' in field);
  const shape = Object.fromEntries(
    fields.map((field) => {
      const value =
        field.type === 'list'
          ? z.enum(field.options as [string, ...string[]])
          : field.type === 'number'
            ? z.number().finite()
            : field.type === 'date'
              ? z.iso.date()
              : field.type === 'boolean'
                ? z.boolean()
                : text(500);
      return [field.key, field.required ? value : value.nullable().optional()];
    }),
  );
  return z.object(shape).strict();
}

export type RequestStatus = z.infer<typeof requestStatus>;
export type ActivityType = z.infer<typeof activityType>;
export type RequestLineInput = z.infer<typeof requestLineInput>;
export type RequestLine = z.infer<typeof requestLine>;
export type RequestSummary = z.infer<typeof requestSummary>;
export type RequestList = z.infer<typeof requestList>;
export type LabsRequest = z.infer<typeof labsRequest>;
export type RequestOptions = z.infer<typeof requestOptions>;
export type SaveRequest = z.infer<typeof saveRequestRequest>;
