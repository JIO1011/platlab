import type { z } from 'zod';
import type { AssetCondition, AssetConservation, usefulLifeState, warrantyState } from './catalog.js';

/**
 * Cómo se llama cada estado del equipo (ADR 0019; en el código, condición), igual en pantalla y en el
 * Excel del Informe: siempre con texto, nunca solo con color.
 */
export const conditionLabel: Record<AssetCondition, string> = {
  operational: 'Operativo',
  restricted: 'Uso limitado',
  faulted: 'Fuera de servicio',
  retired: 'Dado de baja',
};

/** El estado físico del equipo (en el código, conservación); `null` es «sin dato». */
export const conservationLabel: Record<AssetConservation, string> = {
  good: 'Bueno',
  fair: 'Regular',
  poor: 'Malo',
};

/** La garantía en los filtros e indicadores del Informe (E-01c). */
export const warrantyStateLabel: Record<z.infer<typeof warrantyState>, string> = {
  active: 'Vigente',
  expiring: 'Por vencer (90 días)',
  expired: 'Vencida',
  none: 'Sin dato',
};

/** La vida útil en los filtros e indicadores del Informe (E-01c). */
export const usefulLifeStateLabel: Record<z.infer<typeof usefulLifeState>, string> = {
  reached: 'Cumplida',
  current: 'Vigente',
  none: 'Sin dato',
};
