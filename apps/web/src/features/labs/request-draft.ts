import {
  FORM_ESSENTIAL_KEYS,
  REQUEST_MAX_DATES,
  formLayout,
  type ActivityType,
  type FormField,
  type FormFreeField,
  type FormLayout,
  type LabsRequest,
  type RequestLine,
  type RequestLineInput,
  type SaveRequest,
} from '@platlab/contracts';
import { multiplyDecimal, normalizeDecimalInput, toDecimalInput } from '@platlab/ui';
import type { z } from 'zod';
import { fieldErrors } from '../../app/commands';
import { formatDate } from '../../app/format';
import { draftFrom as sheetDraft, type Draft, type DraftField } from './form-draft';

/** Cómo se llama cada tipo de actividad ante la persona. */
export const activityLabels: Record<ActivityType, string> = {
  practice: 'Práctica',
  research: 'Investigación o tesis',
  service: 'Servicio',
  training: 'Capacitación',
};

/** La solicitud con la hoja de su revisión ya leída con `formLayout`. */
export type RequestView = Omit<LabsRequest, 'layout'> & { layout: FormLayout };

export const viewOf = (request: LabsRequest): RequestView => ({ ...request, layout: formLayout.parse(request.layout) });

/** La hoja de la revisión con que se llenó la solicitud (ADR 0023: se llena, se revisa y se imprime sobre ella). */
export const paperOf = (request: RequestView): Draft =>
  sheetDraft({ revision: request.formRevision, title: request.formTitle, documentCode: request.documentCode, layout: request.layout });

/** La clave de un dato de la hoja: la del sistema o la del dato libre, con que se guarda su valor. */
export const fieldKey = (field: DraftField): string => (field.kind === 'system' ? field.key : (field.key ?? field.id));

/** Los datos que la revisión presenta, en el orden de la hoja. */
const presentedFields = (layout: FormLayout): FormField[] => layout.rows.flatMap((row) => (row.kind === 'row' ? row.fields : []));

/** Si la revisión presenta ese dato del sistema. */
export const presents = (layout: FormLayout, key: string): boolean => presentedFields(layout).some((field) => field.key === key);

/** Los datos libres de la revisión. */
const freeFieldsOf = (layout: FormLayout): FormFreeField[] => presentedFields(layout).filter((field): field is FormFreeField => 'type' in field);

/** Una línea de recursos mientras se llena: las cantidades son texto, como las escribe la persona. */
export interface DraftReagent {
  id: string;
  kind: 'reagent';
  /** Del catálogo (`itemId`, en su unidad base) o no catalogado (`name` y `unit` los escribe quien pide). */
  catalog: boolean;
  itemId: string | null;
  name: string;
  quantity: string;
  unit: string;
}

export interface DraftEquipment {
  id: string;
  kind: 'equipment';
  catalog: boolean;
  assetTypeId: string | null;
  name: string;
  /** Pedido por grupo: el total es lo pedido por grupo por los grupos de la solicitud. */
  byGroup: boolean;
  perGroup: string;
  quantity: string;
}

export interface DraftMaterial {
  id: string;
  kind: 'material';
  name: string;
  byGroup: boolean;
  perGroup: string;
  quantity: string;
}

export type DraftLine = DraftReagent | DraftEquipment | DraftMaterial;

/** La columna de Recursos de la revisión → el tipo de línea que pide. */
export const LINE_KINDS = { reagents: 'reagent', equipment: 'equipment', materials: 'material' } as const;

/** Lo que se llena de la solicitud, en el estado en que lo escribe la persona. */
export interface RequestDraft {
  title: string;
  teacherName: string;
  activityType: ActivityType | null;
  subject: string;
  career: string;
  /** Fechas sueltas, AAAA-MM-DD, ordenadas y sin repetirse. */
  dates: string[];
  startsAt: string;
  endsAt: string;
  participants: string;
  groups: string;
  areaId: string | null;
  /** La respuesta de cada dato libre por su clave, como texto; una casilla es «true» o «false». */
  answers: Record<string, string>;
  notes: string;
  lines: DraftLine[];
}

const sortedUnique = (dates: readonly string[]): string[] => [...new Set(dates)].sort();

/** Agrega una fecha: ordenadas y sin repetir. */
export const withDate = (dates: readonly string[], date: string): string[] => sortedUnique([...dates, date]);

export const withoutDate = (dates: readonly string[], date: string): string[] => dates.filter((entry) => entry !== date);

export const canAddDate = (dates: readonly string[]): boolean => dates.length < REQUEST_MAX_DATES;

const essentialKeys: readonly string[] = FORM_ESSENTIAL_KEYS;

/** Si el dato esencial del sistema sigue sin llenar. */
function systemEmpty(key: string, draft: RequestDraft): boolean {
  switch (key) {
    case 'titulo':
      return draft.title.trim() === '';
    case 'docente':
      return draft.teacherName.trim() === '';
    case 'fecha':
      return draft.dates.length === 0;
    case 'horario':
      return draft.startsAt === '' || draft.endsAt === '';
    case 'participantes':
      return draft.participants.trim() === '';
    default:
      return false;
  }
}

/**
 * Las claves de los datos obligatorios que aún están vacíos: los esenciales del sistema y los libres marcados como
 * obligatorios. Solo sirve para marcarlos al intentar enviar; quien valida es el servidor.
 */
export function missingKeys(draft: RequestDraft, layout: FormLayout): Set<string> {
  const missing = new Set<string>();
  for (const field of presentedFields(layout)) {
    const empty = 'type' in field ? field.required && (draft.answers[field.key] ?? '').trim() === '' : essentialKeys.includes(field.key) && systemEmpty(field.key, draft);
    if (empty) missing.add(field.key);
  }
  return missing;
}

/** Lo que se llenó de un dato, dicho para leerlo en la hoja; vacío si no se llenó. */
export function valueText(field: DraftField, draft: RequestDraft, layout: FormLayout): string {
  if (field.kind === 'free') {
    const answer = draft.answers[fieldKey(field)] ?? '';
    if (field.type === 'boolean') return answer === '' ? '' : answer === 'true' ? 'Sí' : 'No';
    return field.type === 'date' && answer !== '' ? formatDate(answer) : answer.trim();
  }
  switch (field.key) {
    case 'titulo':
      return draft.title.trim();
    case 'docente':
      return draft.teacherName.trim();
    case 'tipo':
      return draft.activityType ? activityLabels[draft.activityType] : '';
    case 'asignatura':
      return draft.subject.trim();
    case 'carrera':
      return draft.career.trim();
    case 'fecha':
      return draft.dates.map(formatDate).join(', ');
    case 'horario':
      return [draft.startsAt, draft.endsAt].filter((time) => time !== '').join(' – ');
    case 'participantes':
      return draft.participants;
    case 'grupos':
      return String(groupsOf(draft, layout));
  }
}

const textOf = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

function draftLine(line: RequestLine): DraftLine {
  const id = crypto.randomUUID();
  if (line.kind === 'reagent') {
    return { id, kind: 'reagent', catalog: line.itemId !== null, itemId: line.itemId, name: line.name, quantity: toDecimalInput(line.quantity), unit: line.unit };
  }
  if (line.kind === 'equipment') {
    return {
      id,
      kind: 'equipment',
      catalog: line.assetTypeId !== null,
      assetTypeId: line.assetTypeId,
      name: line.name,
      byGroup: line.perGroup !== null,
      perGroup: textOf(line.perGroup),
      quantity: String(line.quantity),
    };
  }
  return { id, kind: 'material', name: line.name, byGroup: line.perGroup !== null, perGroup: toDecimalInput(line.perGroup ?? ''), quantity: toDecimalInput(line.quantity) };
}

/** El borrador de lo que el servidor guardó. */
export function draftFrom(request: RequestView): RequestDraft {
  return {
    title: request.title ?? '',
    teacherName: request.teacherName ?? '',
    activityType: request.activityType,
    subject: request.subject ?? '',
    career: request.career ?? '',
    dates: sortedUnique(request.dates),
    startsAt: request.startsAt ?? '',
    endsAt: request.endsAt ?? '',
    participants: textOf(request.participants),
    groups: String(request.groups),
    areaId: request.areaId,
    answers: Object.fromEntries(freeFieldsOf(request.layout).map((field) => [field.key, textOf(request.answers[field.key])])),
    notes: request.notes ?? '',
    lines: request.lines.map(draftLine),
  };
}

/** Una línea nueva y vacía; los reactivos y los equipos parten del catálogo si el espacio lo admite. */
export function newLine(kind: DraftLine['kind'], catalog: boolean): DraftLine {
  const id = crypto.randomUUID();
  if (kind === 'reagent') return { id, kind, catalog, itemId: null, name: '', quantity: '', unit: '' };
  if (kind === 'equipment') return { id, kind, catalog, assetTypeId: null, name: '', byGroup: false, perGroup: '', quantity: '1' };
  return { id, kind, name: '', byGroup: false, perGroup: '', quantity: '' };
}

/** Los grupos de la solicitud; si la revisión no presenta «grupos», es uno. */
export const groupsOf = (draft: RequestDraft, layout: FormLayout): number => (presents(layout, 'grupos') ? Number(draft.groups) : 1);

/** Lo pedido por grupo por los grupos de la solicitud, exacto y sin ceros de más; vacío si lo escrito no es una cantidad. */
export function totalOf(perGroup: string, groups: number): string {
  const total = multiplyDecimal(normalizeDecimalInput(perGroup), String(groups), 9);
  return total === null ? '' : total.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

const textOrNull = (text: string): string | null => (text.trim() === '' ? null : text.trim());

function answerValue(field: FormFreeField, text: string): string | number | boolean | null {
  if (text.trim() === '') return null;
  if (field.type === 'number') return Number(text);
  if (field.type === 'boolean') return text === 'true';
  return text.trim();
}

function lineInput(line: DraftLine, groups: number): RequestLineInput {
  if (line.kind === 'reagent') {
    return {
      kind: 'reagent',
      itemId: line.catalog ? line.itemId : null,
      description: line.catalog ? null : line.name.trim(),
      quantity: normalizeDecimalInput(line.quantity),
      unit: line.unit.trim(),
    };
  }
  const perGroup = line.byGroup ? normalizeDecimalInput(line.perGroup) : null;
  const quantity = line.byGroup ? totalOf(line.perGroup, groups) : normalizeDecimalInput(line.quantity);
  if (line.kind === 'equipment') {
    return {
      kind: 'equipment',
      assetTypeId: line.catalog ? line.assetTypeId : null,
      description: line.catalog ? null : line.name.trim(),
      perGroup: perGroup === null ? null : Number(perGroup),
      quantity: Number(quantity),
    };
  }
  return { kind: 'material', description: line.name.trim(), perGroup, quantity };
}

/**
 * El cuerpo de «Guardar borrador» que `saveRequestRequest` valida. Lo que la revisión no presenta (asignatura,
 * carrera, tipo, grupos y Observaciones, que se pueden quitar de la hoja) queda fuera; sin grupos, es uno.
 */
export function saveBody(draft: RequestDraft, layout: FormLayout, expectedVersion: number): SaveRequest {
  const groups = groupsOf(draft, layout);
  return {
    expectedVersion,
    title: textOrNull(draft.title),
    teacherName: textOrNull(draft.teacherName),
    activityType: presents(layout, 'tipo') ? draft.activityType : null,
    subject: presents(layout, 'asignatura') ? textOrNull(draft.subject) : null,
    career: presents(layout, 'carrera') ? textOrNull(draft.career) : null,
    dates: sortedUnique(draft.dates),
    startsAt: textOrNull(draft.startsAt),
    endsAt: textOrNull(draft.endsAt),
    participants: textOrNull(draft.participants) === null ? null : Number(draft.participants),
    groups,
    areaId: draft.areaId,
    answers: Object.fromEntries(freeFieldsOf(layout).map((field) => [field.key, answerValue(field, draft.answers[field.key] ?? '')])),
    notes: layout.notes ? textOrNull(draft.notes) : null,
    lines: draft.lines.map((line) => lineInput(line, groups)),
  };
}

/** Si dos borradores guardarían lo mismo: lo que distingue «con cambios» de «guardado». */
export const sameDraft = (a: RequestDraft, b: RequestDraft, layout: FormLayout): boolean =>
  JSON.stringify(saveBody(a, layout, 1)) === JSON.stringify(saveBody(b, layout, 1));

/** Lo que el contrato rechazó de la solicitud, dicho donde la persona lo corrige. */
export interface RequestIssues {
  /** Por clave de `SaveRequest`: `title`, `dates`, `participants`… */
  fields: Record<string, string>;
  /** Por posición de la línea en el borrador. */
  lines: Record<number, string>;
}

export const noIssues: RequestIssues = { fields: {}, lines: {} };

const rangeMessages: Record<string, string> = {
  participants: 'Escribe cuántas personas participan (de 1 a 1.000).',
  groups: 'Escribe cuántos grupos son (de 1 a 100).',
  dates: `Hasta ${REQUEST_MAX_DATES} fechas.`,
};

function lineMessage(line: DraftLine, field: PropertyKey | undefined): string {
  if (field === 'quantity' || field === 'perGroup') return 'Escribe una cantidad mayor que cero.';
  if (field === 'unit') return 'Escribe la unidad con letras, por ejemplo mL.';
  return 'catalog' in line && line.catalog ? 'Elige uno del catálogo.' : 'Escribe qué necesitas.';
}

/** Los errores de `saveRequestRequest` en palabras de la pantalla. */
export function requestIssues(error: z.ZodError, draft: RequestDraft): RequestIssues {
  const fields = fieldErrors(error);
  delete fields['lines'];
  for (const [key, message] of Object.entries(rangeMessages)) if (fields[key]) fields[key] = message;
  const lines: Record<number, string> = {};
  for (const issue of error.issues) {
    const [head, index, field] = issue.path;
    if (head !== 'lines' || typeof index !== 'number') continue;
    const line = draft.lines[index];
    if (line) lines[index] ??= lineMessage(line, field);
  }
  return { fields, lines };
}
