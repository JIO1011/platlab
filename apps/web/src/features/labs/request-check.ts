import { checkRequestRequest, requestLineInput, type CheckRequest, type FormLayout, type RequestCheck, type RequestLine } from '@platlab/contracts';
import { formatDate } from '../../app/format';
import { groupsOf, lineInput, type DraftLine, type RequestDraft } from './request-draft';

/**
 * La consulta sin guardar de lo que se está llenando (ADR 0023, «Disponibilidad y recursos»): lo que decide qué hay y las
 * líneas que ya se pueden comprobar. Una línea a medias (sin cantidad o sin nombre) no se manda y pide completarse;
 * `positions` lleva, por cada línea mandada, su posición en el borrador.
 */
export interface CheckPlan {
  body: CheckRequest;
  positions: number[];
}

/** La respuesta junto con el cuerpo que la pidió: un resultado de otro pedido nunca se muestra como el actual. */
export interface CheckAnswer {
  body: CheckRequest;
  result: RequestCheck;
}

const whole = (text: string, min: number, max: number): number | null => {
  const value = Number(text);
  return text.trim() !== '' && Number.isInteger(value) && value >= min && value <= max ? value : null;
};

export function checkPlan(draft: RequestDraft, layout: FormLayout): CheckPlan | null {
  const groups = whole(String(groupsOf(draft, layout)), 1, 100) ?? 1;
  const lines = draft.lines.flatMap((line, index) => {
    const parsed = requestLineInput.safeParse(lineInput(line, groups));
    return parsed.success ? [{ input: parsed.data, index }] : [];
  });
  // Un horario a medias o al revés no cuenta: se comprueba como si no hubiera.
  const slot = draft.startsAt !== '' && draft.endsAt !== '' && draft.startsAt < draft.endsAt;
  const parsed = checkRequestRequest.safeParse({
    dates: [...new Set(draft.dates)].sort(),
    startsAt: slot ? draft.startsAt : null,
    endsAt: slot ? draft.endsAt : null,
    participants: whole(draft.participants, 1, 1000),
    groups,
    lines: lines.map((line) => line.input),
  });
  return parsed.success ? { body: parsed.data, positions: lines.map((line) => line.index) } : null;
}

const scopeKey = (body: CheckRequest) => JSON.stringify([body.dates, body.startsAt, body.endsAt]);

/** Con fechas y horario, los equipos se cuentan libres en la franja; si no, operativos. */
export const slotted = (body: CheckRequest): boolean => body.startsAt !== null && body.dates.length > 0;

/** Lo libre del catálogo, solo si se calculó para las mismas fechas y horario que hay ahora. */
export function catalogOf(plan: CheckPlan | null, answer: CheckAnswer | undefined): RequestCheck['catalog'] | null {
  return plan && answer && scopeKey(answer.body) === scopeKey(plan.body) ? answer.result.catalog : null;
}

/** Para cuándo se cuenta lo libre, dicho en una frase: las fechas pendientes y el horario. Sin fechas, nada (se cuenta hoy). */
export function scopeText(body: CheckRequest | undefined): string {
  const dates = body?.dates ?? [];
  if (dates.length === 0) return '';
  const when = dates.length === 1 ? `el ${formatDate(dates[0]!)}` : `tus ${dates.length} fechas`;
  return body?.startsAt && body.endsAt ? `Lo libre para ${when}, de ${body.startsAt} a ${body.endsAt}.` : `Lo libre para ${when}. Sin horario, los equipos se cuentan operativos.`;
}

/** Lo que se dice de una línea del pedido: nunca un resultado que no sea de lo que hay escrito ahora. */
export type Verdict =
  | { state: 'material' }
  | { state: 'incomplete' }
  | { state: 'checking' }
  | { state: 'checked'; line: RequestLine; needed: string; dates: number; slot: boolean };

export function verdictOf(line: DraftLine, index: number, plan: CheckPlan | null, answer: CheckAnswer | undefined): Verdict {
  if (line.kind === 'material') return { state: 'material' };
  const position = plan?.positions.indexOf(index) ?? -1;
  if (!plan || position === -1) return { state: 'incomplete' };
  if (!answer || JSON.stringify(answer.body) !== JSON.stringify(plan.body)) return { state: 'checking' };
  const checked = answer.result.lines[position];
  if (!checked) return { state: 'checking' };
  const needed = answer.result.review.reagents.find((reagent) => reagent.line === position)?.needed ?? String(checked.quantity);
  return { state: 'checked', line: checked, needed, dates: plan.body.dates.length, slot: slotted(plan.body) };
}
