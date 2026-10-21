import { FORM_MAX_FREE_FIELDS, FORM_MAX_PER_ROW, FORM_MAX_SIGNATURES, FORM_OPTIONAL_KEYS } from '@platlab/contracts';
import {
  SYSTEM_LABELS,
  fieldsOf,
  isEssential,
  type DraftField,
  type DraftFreeField,
  type DraftResource,
  type DraftRow,
  type DraftSignature,
  type ResourceKind,
  type SystemKey,
} from './form-draft';

/**
 * Las ediciones del borrador (ADR 0023), todas puras: devuelven la lista nueva o, si el contrato no admite el cambio
 * (un dato esencial que se quita, una fila de cuatro datos, una columna menos de la mínima…), `undefined`, y la pantalla
 * lo explica. Nada se guarda hasta «Publicar revisión».
 */

/** Los elementos con el de la posición `from` llevado a `to` (acotada a la lista); una posición que no existe, o la misma, devuelve la lista sin cambios. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const target = Math.min(Math.max(to, 0), items.length - 1);
  const item = items[from];
  if (item === undefined || from === target) return [...items];
  const next = [...items];
  next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

const newRow = (field: DraftField): DraftRow => ({ kind: 'row', id: crypto.randomUUID(), fields: [field] });

/** La fila y la posición de un dato. */
function locate(rows: readonly DraftRow[], fieldId: string): { row: number; at: number } | undefined {
  for (const [row, item] of rows.entries()) {
    if (item.kind !== 'row') continue;
    const at = item.fields.findIndex((field) => field.id === fieldId);
    if (at >= 0) return { row, at };
  }
  return undefined;
}

/** Las filas sin el dato; la fila que se queda sin datos desaparece. */
function without(rows: readonly DraftRow[], fieldId: string): DraftRow[] {
  return rows.flatMap((row): DraftRow[] => {
    if (row.kind === 'section') return [row];
    const fields = row.fields.filter((field) => field.id !== fieldId);
    return fields.length > 0 ? [{ ...row, fields }] : [];
  });
}

const replaceAt = (rows: readonly DraftRow[], at: number, row: DraftRow): DraftRow[] => rows.map((item, index) => (index === at ? row : item));

/** Los datos libres que lleva la hoja, para frenar el alta en el máximo del contrato. */
const freeCount = (rows: readonly DraftRow[]): number => fieldsOf(rows).filter((field) => field.kind === 'free').length;
export const canAddFree = (rows: readonly DraftRow[]): boolean => freeCount(rows) < FORM_MAX_FREE_FIELDS;

/** Un dato nuevo va en una fila propia, al final de la Sección I; después se mueve a donde se quiera. */
export const addField = (rows: readonly DraftRow[], field: DraftField): DraftRow[] => [...rows, newRow(field)];

export const addSection = (rows: readonly DraftRow[]): DraftRow[] => [...rows, { kind: 'section', id: crypto.randomUUID(), title: '' }];

/** Los datos del sistema opcionales que la hoja ya no lleva y se pueden volver a agregar. */
export function removedOptional(rows: readonly DraftRow[]): SystemKey[] {
  const present = new Set(fieldsOf(rows).map((field) => field.id));
  return FORM_OPTIONAL_KEYS.filter((key) => !present.has(key));
}

/** Vuelve a agregar un dato opcional del sistema, con su nombre de la plantilla estándar. */
export const restoreSystemField = (rows: readonly DraftRow[], key: SystemKey): DraftRow[] => addField(rows, { kind: 'system', id: key, key, label: SYSTEM_LABELS[key] });

/** Quita un dato. Un esencial no se quita (`undefined`): el Cronograma y el aforo lo usan. */
export function removeField(rows: readonly DraftRow[], fieldId: string): DraftRow[] | undefined {
  const field = fieldsOf(rows).find((item) => item.id === fieldId);
  return field && !isEssential(field) ? without(rows, fieldId) : undefined;
}

export const removeSection = (rows: readonly DraftRow[], id: string): DraftRow[] => rows.filter((row) => row.id !== id);

export function renameSection(rows: readonly DraftRow[], id: string, title: string): DraftRow[] {
  return rows.map((row) => (row.kind === 'section' && row.id === id ? { ...row, title } : row));
}

function mapField(rows: readonly DraftRow[], fieldId: string, change: (field: DraftField) => DraftField): DraftRow[] {
  return rows.map((row) => (row.kind === 'row' ? { ...row, fields: row.fields.map((field) => (field.id === fieldId ? change(field) : field)) } : row));
}

export const renameField = (rows: readonly DraftRow[], fieldId: string, label: string): DraftRow[] => mapField(rows, fieldId, (field) => ({ ...field, label }));

/** Cambia el tipo, las opciones o si es obligatorio de un dato libre; un dato del sistema no los tiene. */
export function updateFree(rows: readonly DraftRow[], fieldId: string, patch: Partial<Pick<DraftFreeField, 'type' | 'options' | 'required'>>): DraftRow[] {
  return mapField(rows, fieldId, (field) => (field.kind === 'free' ? { ...field, ...patch } : field));
}

/** Un título de sección sube o baja un lugar entre los elementos de la Sección I. */
export function shiftSection(rows: readonly DraftRow[], id: string, step: -1 | 1): DraftRow[] | undefined {
  const at = rows.findIndex((row) => row.id === id);
  const target = at + step;
  return at < 0 || target < 0 || target >= rows.length ? undefined : moveItem(rows, at, target);
}

/**
 * Lleva un dato a la posición `index` de una fila. En su misma fila solo se reordena; en otra, cabe si la fila tiene menos
 * de tres datos (`undefined` si no). La fila que se queda sin datos desaparece.
 */
export function placeInRow(rows: readonly DraftRow[], fieldId: string, rowId: string, index: number): DraftRow[] | undefined {
  const from = locate(rows, fieldId);
  const target = rows.findIndex((row) => row.kind === 'row' && row.id === rowId);
  const source = from ? rows[from.row] : undefined;
  const destination = rows[target];
  if (!from || source?.kind !== 'row' || destination?.kind !== 'row') return undefined;
  if (from.row === target) return replaceAt(rows, target, { ...destination, fields: moveItem(destination.fields, from.at, index) });
  const field = source.fields[from.at];
  if (!field || destination.fields.length >= FORM_MAX_PER_ROW) return undefined;
  const fields = [...destination.fields];
  fields.splice(Math.min(Math.max(index, 0), fields.length), 0, field);
  return without(rows, fieldId).map((row) => (row.id === rowId && row.kind === 'row' ? { ...row, fields } : row));
}

/** Saca un dato a una fila propia en la posición `index` entre los elementos (contada antes de moverlo). */
export function placeInNewRow(rows: readonly DraftRow[], fieldId: string, index: number): DraftRow[] | undefined {
  const from = locate(rows, fieldId);
  const source = from ? rows[from.row] : undefined;
  const field = source?.kind === 'row' && from ? source.fields[from.at] : undefined;
  if (!from || source?.kind !== 'row' || !field) return undefined;
  const alone = source.fields.length === 1;
  if (alone && (index === from.row || index === from.row + 1)) return [...rows];
  const rest = without(rows, fieldId);
  const target = alone && index > from.row ? index - 1 : index;
  return [...rest.slice(0, target), newRow(field), ...rest.slice(target)];
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Mueve un dato un paso, para el teclado y los botones: a izquierda o derecha, cambia de lugar en su fila; arriba o abajo,
 * pasa a la fila vecina si le cabe. Si no, un dato que comparte fila se separa en una propia y uno que está solo salta la
 * fila o el título vecinos. `undefined` si no hay a dónde.
 */
export function shiftField(rows: readonly DraftRow[], fieldId: string, direction: Direction): DraftRow[] | undefined {
  const from = locate(rows, fieldId);
  const row = from ? rows[from.row] : undefined;
  if (!from || row?.kind !== 'row') return undefined;
  if (direction === 'left' || direction === 'right') {
    const to = from.at + (direction === 'left' ? -1 : 1);
    return to < 0 || to >= row.fields.length ? undefined : replaceAt(rows, from.row, { ...row, fields: moveItem(row.fields, from.at, to) });
  }
  const step = direction === 'up' ? -1 : 1;
  const next = rows[from.row + step];
  if (next?.kind === 'row' && next.fields.length < FORM_MAX_PER_ROW) return placeInRow(rows, fieldId, next.id, Math.min(from.at, next.fields.length));
  if (row.fields.length > 1) return placeInNewRow(rows, fieldId, step < 0 ? from.row : from.row + 1);
  return next ? moveItem(rows, from.row, from.row + step) : undefined;
}

/** Cada columna de Recursos se renombra, y se oculta o se muestra mientras quede al menos una. */
export const renameResource = (resources: readonly DraftResource[], kind: ResourceKind, label: string): DraftResource[] =>
  resources.map((resource) => (resource.kind === kind ? { ...resource, label } : resource));

export function setResourceShown(resources: readonly DraftResource[], kind: ResourceKind, shown: boolean): DraftResource[] | undefined {
  const next = resources.map((resource) => (resource.kind === kind ? { ...resource, shown } : resource));
  return next.some((resource) => resource.shown) ? next : undefined;
}

export const addSignature = (signatures: readonly DraftSignature[]): DraftSignature[] | undefined =>
  signatures.length >= FORM_MAX_SIGNATURES ? undefined : [...signatures, { id: crypto.randomUUID(), label: '', requester: false }];

export const removeSignature = (signatures: readonly DraftSignature[], id: string): DraftSignature[] | undefined =>
  signatures.length <= 1 ? undefined : signatures.filter((signature) => signature.id !== id);

export const renameSignature = (signatures: readonly DraftSignature[], id: string, label: string): DraftSignature[] =>
  signatures.map((signature) => (signature.id === id ? { ...signature, label } : signature));

/** A lo sumo una firma es la del solicitante: marcar una desmarca la otra. */
export const setRequester = (signatures: readonly DraftSignature[], id: string, requester: boolean): DraftSignature[] =>
  signatures.map((signature) => (signature.id === id ? { ...signature, requester } : { ...signature, requester: requester ? false : signature.requester }));
