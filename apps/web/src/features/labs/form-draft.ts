import {
  FORM_ESSENTIAL_KEYS,
  FORM_OPTIONAL_KEYS,
  FORM_STANDARD_LAYOUT,
  formResourceKind,
  type FormField,
  type FormFreeField,
  type FormLayout,
  type FormRow,
  type FormSystemField,
  type LabsForm,
} from '@platlab/contracts';
import type { z } from 'zod';
import { assignKeys } from './field-keys';

export type FieldType = FormFreeField['type'];
export type SystemKey = FormSystemField['key'];
export type ResourceKind = FormLayout['resources'][number]['kind'];

/** Cómo se llama cada tipo de dato libre ante la persona. */
export const typeLabels: Record<FieldType, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Fecha',
  list: 'Lista',
  boolean: 'Sí o no',
};

/** Un dato del sistema mientras se edita: conserva su clave y solo se renombra. */
interface DraftSystemField {
  kind: 'system';
  /** La clave del dato: es única en la hoja. */
  id: string;
  key: SystemKey;
  label: string;
}

/** Un dato libre: las opciones de una lista son un texto, una por línea. */
export interface DraftFreeField {
  kind: 'free';
  /** Identifica el dato en pantalla: la clave si ya está publicado; si es nuevo, un UUID. */
  id: string;
  /** La clave publicada, que no cambia; un dato nuevo la deriva de su etiqueta al publicar. */
  key?: string | undefined;
  label: string;
  type: FieldType;
  required: boolean;
  options: string;
}

export type DraftField = DraftSystemField | DraftFreeField;

/** Un elemento de la Sección I: un título de sección o una fila de 1 a 3 datos. */
export type DraftRow = { kind: 'section'; id: string; title: string } | { kind: 'row'; id: string; fields: DraftField[] };

/** Una columna de Recursos; oculta (`shown` falso) conserva su nombre para volver a mostrarla. */
export interface DraftResource {
  kind: ResourceKind;
  label: string;
  shown: boolean;
}

export interface DraftSignature {
  id: string;
  label: string;
  requester: boolean;
}

/** Lo que se edita del formato, sobre la revisión (`baseRevision`) en que se empezó: es la que el servidor compara. */
export interface Draft {
  baseRevision: number;
  /** El membrete: título del formato y código del documento (vacío si no lleva). */
  title: string;
  documentCode: string;
  rows: DraftRow[];
  /** Las tres columnas en el orden de la hoja: las que se muestran primero y las ocultas después. */
  resources: DraftResource[];
  equipmentCode: boolean;
  notes: boolean;
  signatures: DraftSignature[];
}

/** Las opciones escritas en el dato, una por línea y sin líneas vacías. */
export const optionsOf = (text: string): string[] => text.split('\n').filter((line) => line.trim() !== '');

const ESSENTIAL_KEYS: readonly string[] = FORM_ESSENTIAL_KEYS;
const RESERVED_KEYS: readonly string[] = [...FORM_ESSENTIAL_KEYS, ...FORM_OPTIONAL_KEYS];

/** Los datos del sistema que la plantilla estándar presenta, con el nombre con que lo hace. */
const standardSystemFields = FORM_STANDARD_LAYOUT.rows
  .flatMap((row) => (row.kind === 'row' ? row.fields : []))
  .filter((field): field is FormSystemField => !('type' in field));

/** El nombre con que se vuelve a agregar un dato del sistema que se había quitado. */
export const SYSTEM_LABELS = Object.fromEntries(standardSystemFields.map((field) => [field.key, field.label])) as Record<SystemKey, string>;

/** El nombre de cada columna de Recursos al mostrarla de nuevo. */
export const RESOURCE_LABELS = Object.fromEntries(FORM_STANDARD_LAYOUT.resources.map((resource) => [resource.kind, resource.label])) as Record<ResourceKind, string>;

/** Un dato esencial se renombra y se mueve, pero no se quita: el Cronograma y el aforo lo usan. */
export const isEssential = (field: DraftField): boolean => field.kind === 'system' && ESSENTIAL_KEYS.includes(field.key);

function draftField(field: FormField): DraftField {
  if (!('type' in field)) return { kind: 'system', id: field.key, key: field.key, label: field.label };
  return { kind: 'free', id: field.key, key: field.key, label: field.label, type: field.type, required: field.required, options: field.type === 'list' ? field.options.join('\n') : '' };
}

/** El borrador de una revisión: las filas conservan su orden y las columnas ocultas se agregan al final con su nombre de siempre. */
export function draftFrom(form: LabsForm): Draft {
  const { layout } = form;
  const hidden = formResourceKind.options.filter((kind) => !layout.resources.some((resource) => resource.kind === kind));
  return {
    baseRevision: form.revision,
    title: form.title,
    documentCode: form.documentCode ?? '',
    rows: layout.rows.map((row, at): DraftRow =>
      row.kind === 'section' ? { kind: 'section', id: `row-${at}`, title: row.title } : { kind: 'row', id: `row-${at}`, fields: row.fields.map(draftField) },
    ),
    resources: [...layout.resources.map((resource) => ({ ...resource, shown: true })), ...hidden.map((kind) => ({ kind, label: RESOURCE_LABELS[kind], shown: false }))],
    equipmentCode: layout.equipmentCode,
    notes: layout.notes,
    signatures: layout.signatures.map((signature, at) => ({ id: `signature-${at}`, ...signature })),
  };
}

export const newField = (type: FieldType = 'text'): DraftFreeField => ({ kind: 'free', id: crypto.randomUUID(), label: '', type, required: false, options: '' });

/** Todos los datos de la Sección I, en el orden de la hoja. */
export const fieldsOf = (rows: readonly DraftRow[]): DraftField[] => rows.flatMap((row) => (row.kind === 'row' ? row.fields : []));

/** La clave de cada dato libre (por su id): la publicada o, si es nuevo, la que deriva de su etiqueta sin repetir otra ni una del sistema. */
export function freeKeys(rows: readonly DraftRow[]): Map<string, string> {
  const free = fieldsOf(rows).filter((field): field is DraftFreeField => field.kind === 'free');
  const keys = assignKeys(free, RESERVED_KEYS);
  return new Map(free.map((field, at) => [field.id, keys[at] ?? field.id]));
}

function freePayload(field: DraftFreeField, key: string): FormFreeField {
  const base = { key, label: field.label, required: field.required };
  return field.type === 'list' ? { ...base, type: 'list', options: optionsOf(field.options) } : { ...base, type: field.type };
}

/** El cuerpo de «Publicar revisión», que `publishFormRequest` valida; las claves de los datos libres nuevos se derivan aquí. */
export function publishPayload(draft: Draft) {
  const keys = freeKeys(draft.rows);
  const rows = draft.rows.map(
    (row): FormRow =>
      row.kind === 'section'
        ? { kind: 'section', title: row.title }
        : { kind: 'row', fields: row.fields.map((field): FormField => (field.kind === 'system' ? { key: field.key, label: field.label } : freePayload(field, keys.get(field.id) ?? field.id))) },
  );
  return {
    title: draft.title,
    documentCode: draft.documentCode.trim() === '' ? null : draft.documentCode,
    expectedRevision: draft.baseRevision,
    layout: {
      rows,
      resources: draft.resources.filter((resource) => resource.shown).map(({ kind, label }) => ({ kind, label })),
      equipmentCode: draft.equipmentCode,
      notes: draft.notes,
      signatures: draft.signatures.map(({ label, requester }) => ({ label, requester })),
    } satisfies FormLayout,
  };
}

/** Los textos de una sola línea que el contrato valida, con el aviso de cuando falta y el de cuando sobra. */
const lineMessages = {
  title: { empty: 'Escribe el título del formato.', long: 'El título admite hasta 120 caracteres.' },
  documentCode: { empty: 'Escribe el código o déjalo vacío.', long: 'El código admite hasta 40 caracteres.' },
  section: { empty: 'Escribe el título de la sección.', long: 'El título admite hasta 80 caracteres.' },
  field: { empty: 'Escribe la etiqueta del dato.', long: 'La etiqueta admite hasta 80 caracteres.' },
  resource: { empty: 'Escribe el nombre de la columna.', long: 'El nombre admite hasta 40 caracteres.' },
  signature: { empty: 'Escribe el nombre de la firma.', long: 'El nombre admite hasta 60 caracteres.' },
} as const;

const lineMessage = (kind: keyof typeof lineMessages, issue: z.core.$ZodIssue): string => lineMessages[kind][issue.code === 'too_big' ? 'long' : 'empty'];

/** Lo que el contrato rechazó de la hoja, dicho donde la persona lo corrige. */
export interface FormIssues {
  title?: string;
  documentCode?: string;
  /** Por id de sección. */
  sections: Record<string, string>;
  /** Por id de dato. */
  fields: Record<string, { label?: string; options?: string }>;
  resources: Partial<Record<ResourceKind, string>>;
  /** Por id de firma. */
  signatures: Record<string, string>;
  general?: string;
}

export const noIssues: FormIssues = { sections: {}, fields: {}, resources: {}, signatures: {} };

const tooMany = 'Una lista admite hasta 30 opciones de hasta 80 caracteres.';

type Leaf = { path: readonly PropertyKey[]; issue: z.core.$ZodIssue };

/** Las causas de un error con su ruta completa: una unión (un dato es del sistema o libre, y libre es de lista o no) trae las de cada rama. */
function leaves(issue: z.core.$ZodIssue, base: readonly PropertyKey[] = []): Leaf[] {
  const path = [...base, ...issue.path];
  return issue.code === 'invalid_union' ? issue.errors.flat().flatMap((inner) => leaves(inner, path)) : [{ path, issue }];
}

/** Lo que el contrato rechazó de un dato, desde la ruta que sigue al dato; las opciones solo cuentan en una lista, porque las ramas que no son suyas las echan en falta. */
function fieldIssue(field: DraftField, tail: readonly PropertyKey[], issue: z.core.$ZodIssue): { label?: string; options?: string } | undefined {
  if (tail[0] === 'label') return { label: lineMessage('field', issue) };
  if (tail[0] !== 'options' || field.kind !== 'free' || field.type !== 'list') return undefined;
  if (issue.code === 'custom') return { options: issue.message };
  return { options: issue.code === 'too_small' && tail.length === 1 ? 'Agrega al menos una opción.' : tooMany };
}

/** Los errores de `publishFormRequest` en palabras de la pantalla. */
export function formIssues(error: z.ZodError, draft: Draft): FormIssues {
  const result: FormIssues = { sections: {}, fields: {}, resources: {}, signatures: {} };
  const shown = draft.resources.filter((resource) => resource.shown);
  for (const issue of error.issues) {
    let placed = false;
    for (const { path, issue: leaf } of leaves(issue)) {
      const [head, group, index, ...rest] = path;
      if ((head === 'title' || head === 'documentCode') && path.length === 1) {
        result[head] ??= lineMessage(head, leaf);
        placed = true;
      } else if (head === 'layout' && typeof index === 'number') {
        const row = group === 'rows' ? draft.rows[index] : undefined;
        const resource = group === 'resources' ? shown[index] : undefined;
        const signature = group === 'signatures' ? draft.signatures[index] : undefined;
        if (row?.kind === 'section' && rest[0] === 'title') {
          result.sections[row.id] ??= lineMessage('section', leaf);
          placed = true;
        } else if (row?.kind === 'row' && rest[0] === 'fields' && typeof rest[1] === 'number') {
          const field = row.fields[rest[1]];
          const found = field ? fieldIssue(field, rest.slice(2), leaf) : undefined;
          if (field && found) {
            result.fields[field.id] = { ...found, ...result.fields[field.id] };
            placed = true;
          }
        } else if (resource && rest[0] === 'label') {
          result.resources[resource.kind] ??= lineMessage('resource', leaf);
          placed = true;
        } else if (signature && rest[0] === 'label') {
          result.signatures[signature.id] ??= lineMessage('signature', leaf);
          placed = true;
        }
      }
    }
    if (!placed) result.general ??= issue.code === 'custom' ? issue.message : 'Revisa la hoja antes de publicar.';
  }
  return result;
}
