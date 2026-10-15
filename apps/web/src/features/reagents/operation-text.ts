import type { Operation } from '@platlab/contracts';

/** Responsable de un movimiento; en una salida aprobada, también quien la pidió (ADR 0012). */
export function responsibleOf(operation: Operation): string {
  const actor = operation.actor.displayName ?? 'Miembro anterior';
  return operation.requestedBy ? `${actor} · pidió ${operation.requestedBy.displayName ?? 'un miembro anterior'}` : actor;
}

/** Ubicación como su ruta («Laboratorio 1 › Armario A»), como en la tarjeta del frasco; sin ruta, su nombre (ADR 0016). */
export function placeOf(operation: Pick<Operation, 'location'>): string {
  return operation.location.path.length > 0 ? operation.location.path.join(' › ') : operation.location.name;
}

/** Motivo y destino como una sola frase («Práctica → Laboratorio 1»); null si no hay ninguno. */
export function purposeOf(operation: Pick<Operation, 'reason' | 'destination'>): string | null {
  return [operation.reason, operation.destination ? `→ ${operation.destination}` : null].filter(Boolean).join(' ') || null;
}
