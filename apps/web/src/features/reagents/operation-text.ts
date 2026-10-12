import type { Operation } from '@platlab/contracts';

/** Responsable de un movimiento; en una salida aprobada, también quien la pidió (ADR 0012). */
export function responsibleOf(operation: Operation): string {
  const actor = operation.actor.displayName ?? 'Miembro anterior';
  return operation.requestedBy ? `${actor} · pidió ${operation.requestedBy.displayName ?? 'un miembro anterior'}` : actor;
}

/** Motivo y destino como una sola frase («Práctica → Laboratorio 1»); null si no hay ninguno. */
export function purposeOf(operation: Pick<Operation, 'reason' | 'destination'>): string | null {
  return [operation.reason, operation.destination ? `→ ${operation.destination}` : null].filter(Boolean).join(' ') || null;
}
