import type { Fault } from '@platlab/contracts';
import { PRINT_LIMIT } from '../../app/print-rows';
import { durationText, faultStatusLabel, personText, repairSeconds } from './fault-text';

/** Las listas del servidor vienen del más reciente al más antiguo; la hoja de vida las cuenta de la más antigua a la más reciente. */
export function oldestFirst<T>(newestFirst: readonly T[]): T[] {
  return [...newestFirst].reverse();
}

/** Lo que la hoja dice de un incidente que la lista no: cómo se resolvió, quién y cuánto tardó. */
export interface FaultOutcome {
  /** Qué se hizo; si no está solucionado, el paso en que va. */
  done: string;
  solvedBy: string;
  took: string;
}

const NONE = '—';

/** Qué se hizo, quién solucionó y cuánto tardó; sin solucionar, «Sin atender» o «En reparación» y rayas. */
export function faultOutcome(fault: Fault): FaultOutcome {
  if (fault.status === 'resolved' && fault.resolvedAt) {
    return {
      done: fault.resolution ?? NONE,
      solvedBy: personText(fault.resolvedBy),
      took: durationText(repairSeconds(fault.reportedAt, fault.resolvedAt)),
    };
  }
  return { done: fault.status === 'in_progress' ? faultStatusLabel.in_progress : 'Sin atender', solvedBy: NONE, took: NONE };
}

/** La respuesta a «¿Se podía usar?» cuando se reportó el incidente. */
export const usableThenText = (usable: boolean) => (usable ? 'Sí' : 'No');

/** El aviso de una tabla que llegó al límite de la impresión (los más recientes); sin límite alcanzado, nada. */
export function limitNote(count: number, hasMore: boolean): string | null {
  return hasMore || count >= PRINT_LIMIT ? 'Se imprimen los 1.000 más recientes.' : null;
}
