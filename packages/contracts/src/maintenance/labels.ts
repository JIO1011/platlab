import type { WorkKind } from './plans.js';
import type { WorkResult } from './work.js';

/** Cómo se llama cada tipo de trabajo (ADR 0020), igual en pantalla y en el Excel del Historial (M-01d). */
export const workKindLabel: Record<WorkKind, string> = {
  preventive: 'Preventivo',
  calibration: 'Calibración',
  verification: 'Verificación',
  cleaning: 'Limpieza',
  corrective: 'Correctivo',
};

/** Cómo se llama cada resultado: siempre con texto, nunca solo con color. */
export const workResultLabel: Record<WorkResult, string> = {
  pass: 'Conforme',
  pass_with_observations: 'Con observaciones',
  fail: 'No conforme',
};
