import type { RecordCreated } from '@platlab/contracts';
import { formatDate } from '../../app/format';

/**
 * Guardado de «Registrar mantenimiento» en dos pasos (ADR 0020): el registro y, si hay PDF, su certificado.
 * Si el certificado falla, el registro ya existe: solo se reintenta el adjunto.
 */
export type SaveState =
  | { step: 'idle' }
  | { step: 'saving' }
  | { step: 'attaching'; record: RecordCreated }
  | { step: 'done'; record: RecordCreated }
  | { step: 'attachFailed'; record: RecordCreated; error: unknown };

export type SaveEvent =
  | { type: 'submit' }
  | { type: 'recorded'; record: RecordCreated; withCertificate: boolean }
  | { type: 'recordFailed' }
  | { type: 'attached' }
  | { type: 'attachFailed'; error: unknown }
  | { type: 'retryAttach' };

/** Una transición que no corresponde al paso actual no cambia nada (un doble clic, una respuesta tardía). */
export function saveStep(state: SaveState, event: SaveEvent): SaveState {
  switch (event.type) {
    case 'submit':
      return state.step === 'idle' ? { step: 'saving' } : state;
    case 'recorded':
      if (state.step !== 'saving') return state;
      return event.withCertificate ? { step: 'attaching', record: event.record } : { step: 'done', record: event.record };
    case 'recordFailed':
      return state.step === 'saving' ? { step: 'idle' } : state;
    case 'attached':
      return state.step === 'attaching' ? { step: 'done', record: state.record } : state;
    case 'attachFailed':
      return state.step === 'attaching' ? { step: 'attachFailed', record: state.record, error: event.error } : state;
    case 'retryAttach':
      return state.step === 'attachFailed' ? { step: 'attaching', record: state.record } : state;
  }
}

/** Lo que el registro aplicó en Equipos con un correctivo: el incidente solucionado y, si se pidió, el equipo operativo. */
export interface RepairDone {
  resolved: boolean;
  returned: boolean;
}

/**
 * El mensaje final: la nueva fecha del plan; o, si un registro histórico no la movió, que quedó en el
 * historial; o, sin plan, que se registró sin plan. Un correctivo dice si solucionó el incidente, y una
 * corrección lo dice en vez de «registrado». `dueBefore` es la fecha del plan antes de guardar.
 */
export function recordOutcome(
  record: Pick<RecordCreated, 'plan' | 'nextDueOn' | 'kind'>,
  dueBefore: string | null,
  { repair, corrected = false }: { repair?: RepairDone; corrected?: boolean } = {},
): { kind: 'next' | 'history' | 'noPlan'; text: string } {
  const lead = corrected ? 'Registro corregido' : record.kind === 'corrective' ? 'Reparación registrada' : 'Mantenimiento registrado';
  if (!record.plan || !record.nextDueOn) {
    const incident = repair?.resolved
      ? repair.returned
        ? ' El incidente quedó solucionado y el equipo volvió a Operativo.'
        : ' El incidente quedó solucionado.'
      : '';
    return { kind: 'noPlan', text: `${lead}${record.kind === 'corrective' ? '.' : ' sin plan.'}${incident}` };
  }
  if (record.nextDueOn === dueBefore) {
    return { kind: 'history', text: `${corrected ? 'Registro corregido' : 'Registrado en el historial'}. La próxima fecha no cambia.` };
  }
  return { kind: 'next', text: `${lead}. Próximo: ${formatDate(record.nextDueOn)}.` };
}
