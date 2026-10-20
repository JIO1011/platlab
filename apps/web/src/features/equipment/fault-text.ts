import type { Fault, FaultCounts, FaultStatus, FaultType } from '@platlab/contracts';
import { countText, formatDate } from '../../app/format';

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

/**
 * Las pestañas de la lista, una por paso (ADR 0019, 17-10-2026), en la URL como `?estado=`; «Reportados» es la
 * de por omisión y no se escribe. `count` es su cifra en `GET /faults/counts`.
 */
export type FaultView = 'reportados' | 'en-reparacion' | 'solucionados';

export const faultViews: ReadonlyArray<{ value: FaultView; label: string; status: FaultStatus; count: keyof FaultCounts }> = [
  { value: 'reportados', label: 'Reportados', status: 'open', count: 'open' },
  { value: 'en-reparacion', label: 'En reparación', status: 'in_progress', count: 'inProgress' },
  { value: 'solucionados', label: 'Solucionados', status: 'resolved', count: 'resolved' },
];

/** La pestaña que nombra la URL; cualquier otro valor es «Reportados». */
export function faultViewFrom(value: string | null): FaultView {
  return faultViews.find((view) => view.value === value)?.value ?? 'reportados';
}

/** Lo que dice el equipo según se pueda seguir usando o no. */
export function usableText(usable: boolean): string {
  return usable ? 'Se puede usar' : 'No se puede usar';
}

/** Quien hizo un paso; un miembro que ya no está se dice, no se oculta. */
export function personText(person: { name: string } | null): string {
  return person?.name ?? 'Miembro anterior';
}

/** El aviso de una falla reportada con la garantía vigente (E-01e): hasta cuándo vale y a quién reclamar, si se sabe. */
export function warrantyNotice({ until, supplier }: NonNullable<Fault['warranty']>): { lead: string; claim: string } {
  return {
    lead: `Falla dentro de la garantía, vigente hasta ${formatDate(until)}.`,
    claim: supplier ? `Reclama al proveedor: ${supplier}.` : 'Reclama al proveedor.',
  };
}

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
  if (days < 30) return `hace ${countText(days, 'día', 'días')}`;
  const months = Math.round(days / 30);
  if (months < 12) return `hace ${countText(months, 'mes', 'meses')}`;
  const years = Math.round(days / 365);
  return `hace ${countText(years, 'año', 'años')}`;
}

const decimal = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 });

/**
 * Una duración en palabras: «menos de 1 min», «45 min», «5 h», «2,5 días» (con un decimal hasta 10 días) y
 * «31 días». La usan la reparación promedio, los días fuera de servicio y lo que tardó un incidente.
 */
export function durationText(seconds: number): string {
  if (seconds < 60) return 'menos de 1 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = seconds / 86_400;
  const shown = days < 10 ? Math.round(days * 10) / 10 : Math.round(days);
  return `${decimal.format(shown)} ${shown === 1 ? 'día' : 'días'}`;
}

/** Lo que tardó un incidente, de reportado a solucionado, en segundos (nunca negativo). */
export function repairSeconds(reportedAt: string, resolvedAt: string): number {
  return Math.max(0, (Date.parse(resolvedAt) - Date.parse(reportedAt)) / 1000);
}

/**
 * El paso en que está el incidente, para su fila, en dos líneas: `when` dice cuándo («Reportado hace 2 h», «En
 * reparación desde hace 1 día», «Solucionado en 3 días · hace 2 días») y `who`, quién lo hizo («Ana»).
 */
export function faultStepParts(fault: Fault, now: number): { when: string; who: string } {
  if (fault.status === 'resolved' && fault.resolvedAt) {
    return { when: `Solucionado en ${durationText(repairSeconds(fault.reportedAt, fault.resolvedAt))} · ${faultAgo(fault.resolvedAt, now)}`, who: personText(fault.resolvedBy) };
  }
  if (fault.status === 'in_progress' && fault.attendedAt) {
    return { when: `En reparación desde ${faultAgo(fault.attendedAt, now)}`, who: personText(fault.attendedBy) };
  }
  return { when: `Reportado ${faultAgo(fault.reportedAt, now)}`, who: personText(fault.reportedBy) };
}

/** Lo que sumaron los equipos fuera de servicio en el período: «31 días · en 4 equipos», «2 h · en 1 equipo» o «Ninguno». */
export function outOfServiceText({ seconds, assets }: { seconds: number; assets: number }): string {
  if (assets === 0) return 'Ninguno';
  return `${durationText(seconds)} · en ${countText(assets, 'equipo', 'equipos')}`;
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
