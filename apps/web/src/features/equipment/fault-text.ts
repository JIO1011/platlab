import type { Fault, FaultStatus, FaultType } from '@platlab/contracts';

/** Cómo se llama cada tipo de falla en pantalla (ADR 0019). */
export const faultTypeLabel: Record<FaultType, string> = {
  electrical: 'Eléctrica',
  mechanical: 'Mecánica',
  spare_part: 'Requiere repuesto',
  other: 'Otra',
};

/** Los tipos en el orden en que se ofrecen al reportar. */
export const faultTypes: FaultType[] = ['electrical', 'mechanical', 'spare_part', 'other'];

/** Los tres pasos de un incidente, en orden: reportado, en reparación y solucionado (definitivo). */
export const faultStatusOrder: FaultStatus[] = ['open', 'in_progress', 'resolved'];

/** Cómo se llama cada estado: siempre con texto, nunca solo con color (ADR 0010). */
export const faultStatusLabel: Record<FaultStatus, string> = {
  open: 'Reportado',
  in_progress: 'En reparación',
  resolved: 'Solucionado',
};

/** El tono de cada estado: reportado rojo, en reparación ámbar y solucionado verde. */
export const faultStatusTone: Record<FaultStatus, 'danger' | 'warning' | 'success'> = {
  open: 'danger',
  in_progress: 'warning',
  resolved: 'success',
};

/** Las vistas de la lista, en la URL como `?estado=`; «En curso» es la de por omisión y no se escribe. */
export type FaultView = 'en-curso' | 'solucionados';

export const faultViews: ReadonlyArray<{ value: FaultView; label: string; statuses: FaultStatus[] }> = [
  { value: 'en-curso', label: 'En curso', statuses: ['open', 'in_progress'] },
  { value: 'solucionados', label: 'Solucionados', statuses: ['resolved'] },
];

/** La vista que nombra la URL; cualquier otro valor es «En curso». */
export function faultViewFrom(value: string | null): FaultView {
  return faultViews.find((view) => view.value === value)?.value ?? 'en-curso';
}

/** Lo que dice el equipo según se pueda seguir usando o no. */
export function usableText(usable: boolean): string {
  return usable ? 'Se puede usar' : 'No se puede usar';
}

/** Quien hizo un paso; un miembro que ya no está se dice, no se oculta. */
export function personText(person: { name: string } | null): string {
  return person?.name ?? 'Miembro anterior';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * «hace un momento», «hace 5 min», «hace 3 h», «hace 2 días», «hace 1 mes», «hace 2 años»: cuánto pasó
 * desde un instante. Cada unidad toma el relevo cuando la anterior se redondearía a la siguiente.
 */
export function faultAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'hace un momento';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${plural(days, 'día', 'días')}`;
  const months = Math.round(days / 30);
  if (months < 12) return `hace ${plural(months, 'mes', 'meses')}`;
  const years = Math.round(days / 365);
  return `hace ${plural(years, 'año', 'años')}`;
}

export interface FaultStep {
  key: 'reported' | 'repairing' | 'resolved';
  label: string;
  /** Quién lo hizo; `null` si ya no es miembro. */
  by: string | null;
  at: string;
  /** Lo que se escribió en el paso: qué se hizo al solucionarlo. */
  note: string | null;
}

/** La línea de tiempo del incidente: solo los pasos que ya ocurrieron, del primero al último, con el nombre de su estado. */
export function faultSteps(fault: Fault): FaultStep[] {
  const steps: FaultStep[] = [{ key: 'reported', label: faultStatusLabel.open, by: fault.reportedBy?.name ?? null, at: fault.reportedAt, note: null }];
  if (fault.attendedAt) {
    steps.push({ key: 'repairing', label: faultStatusLabel.in_progress, by: fault.attendedBy?.name ?? null, at: fault.attendedAt, note: null });
  }
  if (fault.resolvedAt) {
    steps.push({ key: 'resolved', label: faultStatusLabel.resolved, by: fault.resolvedBy?.name ?? null, at: fault.resolvedAt, note: fault.resolution });
  }
  return steps;
}

/** Lo pendiente de Equipos con las mismas palabras en Inicio y en el Resumen: a quien atiende, los incidentes por atender; a quien reporta, los suyos abiertos. */
export function pendingFaultsText(n: number, handles: boolean): string {
  if (handles) return n === 1 ? '1 incidente espera atención' : `${n} incidentes esperan atención`;
  return n === 1 ? 'Tienes 1 incidente abierto' : `Tienes ${n} incidentes abiertos`;
}
