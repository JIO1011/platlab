import { FORM_ESSENTIAL_KEYS, REQUEST_MAX_DATES, type FormLayout } from '@platlab/contracts';
import type { z } from 'zod';
import { fieldErrors } from '../../app/commands';
import { presentedFields, type DraftLine, type RequestDraft } from './request-draft';

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
