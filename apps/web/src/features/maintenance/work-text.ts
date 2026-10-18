import type { WorkKind, WorkResult } from '@platlab/contracts';
import { fold } from '../../app/fold';

/** Textos de Mantenimiento (ADR 0020). */
export const kindLabels: Record<WorkKind, string> = {
  preventive: 'Preventivo',
  calibration: 'Calibración',
  verification: 'Verificación',
  cleaning: 'Limpieza',
  corrective: 'Correctivo',
};

/** El título del plan con su tipo detrás, salvo que el título ya lo diga: «Calibración anual de balanzas», no «… · Calibración». */
export function titleWithKind(title: string, kind: WorkKind): string {
  return fold(title).includes(fold(kindLabels[kind])) ? title : `${title} · ${kindLabels[kind]}`;
}

/** Un registro sin plan: un correctivo se dice «Correctivo» (nunca tiene plan); otro, con su tipo y «sin plan». */
export function noPlanText(kind: WorkKind): string {
  return kind === 'corrective' ? kindLabels.corrective : `${kindLabels[kind]} sin plan`;
}

export const resultLabels: Record<WorkResult, string> = {
  pass: 'Conforme',
  pass_with_observations: 'Con observaciones',
  fail: 'No conforme',
};

/** La ruta de la app de Mantenimiento en el espacio, la del manifiesto. */
export function maintenancePath(modules: Array<{ code: string; nav: Array<{ path: string }> }>, workspaceId: string): string {
  return `/e/${workspaceId}/${modules.find((entry) => entry.code === 'maintenance')?.nav[0]?.path ?? 'mantenimiento'}`;
}
