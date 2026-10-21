import { type FormField, type LabsForm } from '@platlab/contracts';
import type { z } from 'zod';
import { assignKeys } from './field-keys';

/** Cómo se llama cada tipo de campo ante la persona. */
export const typeLabels: Record<FormField['type'], string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Fecha',
  list: 'Lista',
  boolean: 'Sí o no',
};

/** Un campo libre mientras se edita: las opciones de una lista son un texto, una por línea. */
export interface DraftField {
  /** Identifica la fila en pantalla: la clave si el campo ya está publicado; si es nuevo, un UUID. */
  id: string;
  /** La clave publicada, que no cambia; un campo nuevo la deriva de su etiqueta al publicar. */
  key?: string | undefined;
  label: string;
  type: FormField['type'];
  required: boolean;
  options: string;
}

/** Lo que se edita del Formato, sobre la versión (`baseVersion`) en que se empezó: es la que el servidor compara. */
export interface Draft {
  baseVersion: number;
  /** El membrete: título del formato y código del documento (vacío si no lleva). */
  title: string;
  documentCode: string;
  /** Cómo se llaman «Asignatura» y «Carrera» en el núcleo de la solicitud. */
  subjectLabel: string;
  unitLabel: string;
  fields: DraftField[];
}

/** Las opciones escritas en el campo, una por línea y sin líneas vacías. */
export const optionsOf = (text: string): string[] => text.split('\n').filter((line) => line.trim() !== '');

export function draftFrom(form: LabsForm): Draft {
  return {
    baseVersion: form.version,
    title: form.title ?? '',
    documentCode: form.documentCode ?? '',
    subjectLabel: form.subjectLabel,
    unitLabel: form.unitLabel,
    fields: form.fields.map((field) => ({
      id: field.key,
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.type === 'list' ? field.options.join('\n') : '',
    })),
  };
}

export const newField = (type: FormField['type'] = 'text'): DraftField => ({ id: crypto.randomUUID(), label: '', type, required: false, options: '' });

/**
 * Los elementos con el de la posición `from` llevado a `to` (acotada a la lista): lo usan el arrastre, los botones y
 * Alt + flecha. Una posición que no existe, o la misma, devuelve la lista sin cambios.
 */
export function moveField<T>(items: readonly T[], from: number, to: number): T[] {
  const target = Math.min(Math.max(to, 0), items.length - 1);
  const item = items[from];
  if (item === undefined || from === target) return [...items];
  const next = [...items];
  next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

/** El cuerpo de «Publicar versión», que `publishFormRequest` valida; las claves de los campos nuevos se derivan aquí. */
export function publishPayload(draft: Draft) {
  const keys = assignKeys(draft.fields);
  return {
    title: draft.title,
    documentCode: draft.documentCode.trim() === '' ? null : draft.documentCode,
    subjectLabel: draft.subjectLabel,
    unitLabel: draft.unitLabel,
    expectedVersion: draft.baseVersion,
    fields: draft.fields.map((field, index) => ({
      key: keys[index],
      label: field.label,
      type: field.type,
      required: field.required,
      ...(field.type === 'list' ? { options: optionsOf(field.options) } : {}),
    })),
  };
}

/**
 * Las claves de los datos del sistema de la Sección I (título, asignatura, carrera, tipo, docente, fecha, horario,
 * alumnos, grupos): un dato extra que las repite es un aviso, no un error, porque esos datos ya se piden y entran en las
 * métricas.
 */
const coreKeys: ReadonlySet<string> = new Set(['titulo', 'asignatura', 'carrera', 'tipo', 'docente', 'fecha', 'horario', 'participantes', 'alumnos', 'grupos']);

export const repeatsCore = (key: string | undefined): boolean => key !== undefined && coreKeys.has(key);

/** Los datos de una sola línea del borrador que el contrato valida, con el límite y el nombre con que se dicen. */
const lineFields = {
  title: { empty: 'Escribe el título del formato.', long: 'El título admite hasta 120 caracteres.' },
  documentCode: { empty: 'Escribe el código o déjalo vacío.', long: 'El código admite hasta 40 caracteres.' },
  subjectLabel: { empty: 'Escribe cómo se llama la asignatura.', long: 'El nombre admite hasta 40 caracteres.' },
  unitLabel: { empty: 'Escribe cómo se llama la carrera.', long: 'El nombre admite hasta 40 caracteres.' },
} as const;

type LineField = keyof typeof lineFields;

const isLineField = (head: unknown): head is LineField => typeof head === 'string' && head in lineFields;

/** Lo que el contrato rechazó del Formato, dicho donde la persona lo corrige. */
export interface FormIssues extends Partial<Record<LineField, string>> {
  /** Por posición del campo. */
  fields: Record<number, { label?: string; options?: string }>;
  general?: string;
}

const tooMany = 'Una lista admite hasta 30 opciones de hasta 80 caracteres.';

type Leaf = { path: readonly PropertyKey[]; issue: z.core.$ZodIssue };

/** El motivo, dicho en palabras de la pantalla, de lo que el contrato rechazó de la etiqueta o de las opciones de un campo. */
function fieldIssue({ path, issue }: Leaf): { field: 'label' | 'options'; message: string } | undefined {
  if (path[0] === 'label') {
    return { field: 'label', message: issue.code === 'too_big' ? 'La etiqueta admite hasta 80 caracteres.' : 'Escribe la etiqueta del campo.' };
  }
  if (path[0] !== 'options') return undefined;
  if (issue.code === 'custom') return { field: 'options', message: issue.message };
  return { field: 'options', message: issue.code === 'too_small' && path.length === 1 ? 'Agrega al menos una opción.' : tooMany };
}

/**
 * Los errores de `publishFormRequest` en palabras de la pantalla. Un campo es una unión (la lista lleva opciones y los
 * demás no): se leen los errores de la rama que corresponde a su tipo.
 */
export function formIssues(error: z.ZodError, draft: Draft): FormIssues {
  const result: FormIssues = { fields: {} };
  const general = (issue: z.core.$ZodIssue) => (result.general ??= issue.code === 'custom' ? issue.message : 'Revisa los campos antes de publicar.');
  for (const issue of error.issues) {
    const [head, index, ...rest] = issue.path;
    if (isLineField(head)) {
      result[head] ??= issue.code === 'too_big' ? lineFields[head].long : lineFields[head].empty;
    } else if (head === 'fields' && typeof index === 'number') {
      const branch = draft.fields[index]?.type === 'list' ? 0 : 1;
      const leaves: Leaf[] =
        issue.code === 'invalid_union' ? (issue.errors[branch] ?? []).map((leaf) => ({ path: leaf.path, issue: leaf })) : [{ path: rest, issue }];
      for (const leaf of leaves) {
        const found = fieldIssue(leaf);
        if (!found) {
          general(leaf.issue);
          continue;
        }
        const entry = (result.fields[index] ??= {});
        entry[found.field] ??= found.message;
      }
    } else {
      general(issue);
    }
  }
  return result;
}
