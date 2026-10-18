import type { WorkKind, WorkResult } from '@platlab/contracts';

/** Textos de Mantenimiento (ADR 0020). */
export const kindLabels: Record<WorkKind, string> = {
  preventive: 'Preventivo',
  calibration: 'Calibración',
  verification: 'Verificación',
  cleaning: 'Limpieza',
};

export const resultLabels: Record<WorkResult, string> = {
  pass: 'Conforme',
  pass_with_observations: 'Con observaciones',
  fail: 'No conforme',
};

/** La ruta de la app de Mantenimiento en el espacio, la del manifiesto. */
export function maintenancePath(modules: Array<{ code: string; nav: Array<{ path: string }> }>, workspaceId: string): string {
  return `/e/${workspaceId}/${modules.find((entry) => entry.code === 'maintenance')?.nav[0]?.path ?? 'mantenimiento'}`;
}
