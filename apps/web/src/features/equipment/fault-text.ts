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

/** Cómo se llama cada estado: siempre con texto, nunca solo con color (ADR 0010). */
export const faultStatusLabel: Record<FaultStatus, string> = {
  open: 'Abierta',
  in_progress: 'En atención',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

/** El tono de cada estado: abierta ámbar, en atención acento, resuelta verde y cerrada neutra. */
export const faultStatusTone: Record<FaultStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
};

/** Las vistas de la lista, en la URL como `?estado=`; «Abiertas» es la de por omisión y no se escribe. */
export type FaultView = 'abiertas' | 'resueltas' | 'cerradas';

export const faultViews: ReadonlyArray<{ value: FaultView; label: string; statuses: FaultStatus[] }> = [
  { value: 'abiertas', label: 'Abiertas', statuses: ['open', 'in_progress'] },
  { value: 'resueltas', label: 'Resueltas', statuses: ['resolved'] },
  { value: 'cerradas', label: 'Cerradas', statuses: ['closed'] },
];

/** La vista que nombra la URL; cualquier otro valor es «Abiertas». */
export function faultViewFrom(value: string | null): FaultView {
  return faultViews.find((view) => view.value === value)?.value ?? 'abiertas';
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
  key: 'reported' | 'attended' | 'resolved' | 'closed';
  label: 'Reportada' | 'Atendida' | 'Resuelta' | 'Cerrada';
  /** Quién lo hizo; `null` si ya no es miembro. */
  by: string | null;
  at: string;
  /** Lo que se escribió en el paso: el resultado de «Resuelta». */
  note: string | null;
}

/** La línea de tiempo de la falla: solo los pasos que ya ocurrieron, del primero al último. */
export function faultSteps(fault: Fault): FaultStep[] {
  const steps: FaultStep[] = [{ key: 'reported', label: 'Reportada', by: fault.reportedBy?.name ?? null, at: fault.reportedAt, note: null }];
  if (fault.attendedAt) {
    steps.push({ key: 'attended', label: 'Atendida', by: fault.attendedBy?.name ?? null, at: fault.attendedAt, note: null });
  }
  if (fault.resolvedAt) {
    steps.push({ key: 'resolved', label: 'Resuelta', by: fault.resolvedBy?.name ?? null, at: fault.resolvedAt, note: fault.resolution });
  }
  if (fault.closedAt) {
    steps.push({ key: 'closed', label: 'Cerrada', by: fault.closedBy?.name ?? null, at: fault.closedAt, note: null });
  }
  return steps;
}

/** Lo pendiente de Equipos con las mismas palabras en Inicio y en el Resumen: a quien atiende, las fallas por atender; a quien reporta, las suyas abiertas. */
export function pendingFaultsText(n: number, handles: boolean): string {
  if (handles) return n === 1 ? '1 falla espera atención' : `${n} fallas esperan atención`;
  return n === 1 ? 'Tienes 1 reporte abierto' : `Tienes ${n} reportes abiertos`;
}
