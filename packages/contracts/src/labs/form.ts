import { z } from 'zod';
import { expectedVersion, text } from '../common.js';

/**
 * Formatos de solicitud de Laboratorios (ADR 0023, «Diseño por filas y varios formatos»): cada espacio de trabajo
 * tiene varios; cada uno se renombra y se archiva, y cada guardado publica una revisión nueva e inmutable con el
 * membrete (título y código; la revisión es el número) y la hoja. `labs.form_layout_valid` aplica en SQL las mismas
 * reglas que `formLayout`.
 */

export const FORM_MAX_FREE_FIELDS = 30;
/** Datos por fila de la Sección I y firmas al pie: de 1 a 3. */
export const FORM_MAX_PER_ROW = 3;
export const FORM_MAX_SIGNATURES = 3;

/** Los datos del sistema que el Cronograma y el aforo usan: se renombran y se mueven, pero no se quitan. */
export const FORM_ESSENTIAL_KEYS = ['docente', 'titulo', 'fecha', 'horario', 'participantes'] as const;
/** Los datos del sistema que se pueden quitar; sin ellos se pierde esa métrica. */
export const FORM_OPTIONAL_KEYS = ['asignatura', 'carrera', 'tipo', 'grupos'] as const;
const systemKeys: readonly string[] = [...FORM_ESSENTIAL_KEYS, ...FORM_OPTIONAL_KEYS];

export const formFieldType = z.enum(['text', 'number', 'date', 'list', 'boolean']);

/** Un dato del sistema: conserva su clave en todos los formatos (las métricas siguen comparables) y solo se renombra. */
const formSystemField = z.object({ key: z.enum([...FORM_ESSENTIAL_KEYS, ...FORM_OPTIONAL_KEYS]), label: text(80) }).strict();

const freeBase = {
  /** Clave estable de la respuesta, en minúsculas y distinta de las del sistema: la usan las solicitudes de L-01b. */
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,39}$/, 'Clave en minúsculas, sin espacios')
    .refine((key) => !systemKeys.includes(key), 'Esa clave es de un dato del sistema'),
  label: text(80),
  required: z.boolean(),
};

/** Opciones de una lista: de 1 a 30, sin repetirse. */
const options = z
  .array(text(80))
  .min(1)
  .max(30)
  .refine((values) => new Set(values).size === values.length, 'Las opciones no se repiten');

/** Un dato libre: solo la lista lleva opciones, y en ella son obligatorias. */
const formFreeField = z.union([
  z.object({ ...freeBase, type: z.literal('list'), options }).strict(),
  z.object({ ...freeBase, type: formFieldType.exclude(['list']) }).strict(),
]);

/** Sin `type` es un dato del sistema; con él, uno libre. */
export const formField = z.union([formSystemField, formFreeField]);

/** La Sección I: títulos de sección opcionales y filas de 1 a 3 datos «etiqueta | valor». */
const formRow = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('section'), title: text(80) }).strict(),
  z.object({ kind: z.literal('row'), fields: z.array(formField).min(1).max(FORM_MAX_PER_ROW) }).strict(),
]);

export const formResourceKind = z.enum(['reagents', 'equipment', 'materials']);

/** Las firmas: de 1 a 3 con nombre libre; a lo sumo una es la del solicitante, que imprime su nombre. */
const signature = z.object({ label: text(60), requester: z.boolean() }).strict();

export const formLayout = z
  .object({
    rows: z.array(formRow).min(1).max(60),
    /** Las columnas de Recursos que el formato muestra, de 1 a 3, cada una con su nombre. */
    resources: z
      .array(z.object({ kind: formResourceKind, label: text(40) }).strict())
      .min(1)
      .max(3)
      .refine((values) => new Set(values.map((value) => value.kind)).size === values.length, 'Cada recurso va una vez'),
    /** Si la columna de equipos lleva «Código». */
    equipmentCode: z.boolean(),
    /** Si la hoja lleva Observaciones. */
    notes: z.boolean(),
    signatures: z
      .array(signature)
      .min(1)
      .max(FORM_MAX_SIGNATURES)
      .refine((values) => values.filter((value) => value.requester).length <= 1, 'Solo una firma es del solicitante'),
  })
  .strict()
  .superRefine((layout, context) => {
    const fields = layout.rows.flatMap((row) => (row.kind === 'row' ? row.fields : []));
    const keys = fields.map((field) => field.key);
    if (new Set(keys).size !== keys.length) context.addIssue({ code: 'custom', path: ['rows'], message: 'Cada dato va una vez' });
    const missing = FORM_ESSENTIAL_KEYS.filter((key) => !keys.includes(key));
    if (missing.length > 0) context.addIssue({ code: 'custom', path: ['rows'], message: `Faltan datos esenciales: ${missing.join(', ')}` });
    if (fields.filter((field) => 'type' in field).length > FORM_MAX_FREE_FIELDS) {
      context.addIssue({ code: 'custom', path: ['rows'], message: `Hasta ${FORM_MAX_FREE_FIELDS} datos libres` });
    }
  });

/**
 * La plantilla estándar (ADR 0023, la P69): el punto de partida de todo formato nuevo. Primero los datos del sistema,
 * de a dos por fila, y después los extra; Reactivos, Equipos con código y Materiales; Observaciones; y las firmas del
 * asistente y del docente.
 */
export const FORM_STANDARD_LAYOUT: FormLayout = {
  rows: [
    { kind: 'section', title: 'I. Datos de la actividad' },
    { kind: 'row', fields: [{ key: 'titulo', label: 'Título de la práctica' }] },
    { kind: 'row', fields: [{ key: 'docente', label: 'Docente' }, { key: 'tipo', label: 'Tipo de actividad' }] },
    { kind: 'row', fields: [{ key: 'asignatura', label: 'Asignatura' }, { key: 'carrera', label: 'Carrera' }] },
    { kind: 'row', fields: [{ key: 'fecha', label: 'Fecha(s) programada(s)' }, { key: 'horario', label: 'Horario' }] },
    { kind: 'row', fields: [{ key: 'participantes', label: 'Nº alumnos' }, { key: 'grupos', label: 'Nº grupos' }] },
    {
      kind: 'row',
      fields: [
        { key: 'colaborador', label: 'Colaborador de cátedra', type: 'text', required: false },
        { key: 'curso_paralelo', label: 'Curso-paralelo', type: 'text', required: false },
        { key: 'practica_n', label: 'Práctica Nº', type: 'number', required: false },
      ],
    },
  ],
  resources: [
    { kind: 'reagents', label: 'Reactivos' },
    { kind: 'equipment', label: 'Equipos' },
    { kind: 'materials', label: 'Materiales' },
  ],
  equipmentCode: true,
  notes: true,
  signatures: [
    { label: 'Asistente de laboratorio', requester: false },
    { label: 'Docente', requester: true },
  ],
};

export const formParams = z.object({ formId: z.uuid() });

/** Un formato en la lista: su nombre, su estado y su última revisión. */
const formSummary = z.object({
  id: z.uuid(),
  name: z.string(),
  /** La de las ediciones del formato (nombre y archivo); la de la hoja es `revision`. */
  version: z.number().int().positive(),
  archivedAt: z.string().nullable(),
  revision: z.number().int().positive(),
  title: z.string(),
  publishedAt: z.string(),
});

/** GET /forms: los activos primero; quien no administra los formatos solo ve los activos. */
export const formList = z.object({ items: z.array(formSummary) });

/** GET /forms/:formId y la respuesta de los comandos: el formato con su última revisión completa. */
export const labsForm = formSummary.extend({ documentCode: z.string().nullable(), layout: formLayout });

/** POST /forms: un formato nuevo parte de la plantilla estándar o, con `from`, duplica la última revisión de otro. */
export const createFormRequest = z.object({ name: text(80), from: z.uuid().optional() }).strict();

/** PATCH /forms/:formId: renombra con la versión que la persona vio. */
export const updateFormRequest = z.object({ name: text(80), expectedVersion }).strict();

/**
 * POST /forms/:formId/revisions: publica la revisión siguiente. `expectedRevision` es la que la persona vio; si
 * otra persona publicó antes, VERSION_CONFLICT.
 */
export const publishFormRequest = z
  .object({
    title: text(120),
    documentCode: text(40).nullable(),
    layout: formLayout,
    expectedRevision: z.number().int().positive(),
  })
  .strict();

export type FormSystemField = z.infer<typeof formSystemField>;
export type FormFreeField = z.infer<typeof formFreeField>;
export type FormField = z.infer<typeof formField>;
export type FormRow = z.infer<typeof formRow>;
export type FormLayout = z.infer<typeof formLayout>;
export type FormSummary = z.infer<typeof formSummary>;
export type FormList = z.infer<typeof formList>;
export type LabsForm = z.infer<typeof labsForm>;
