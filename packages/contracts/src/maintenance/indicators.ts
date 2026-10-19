import { z } from 'zod';
import { money, text } from '../common.js';
import { maintenanceAssetRef } from './plans.js';

/**
 * Indicadores de Mantenimiento (ADR 0020, M-01c): los 12 meses de calendario hasta el actual, en la zona
 * del espacio, calculados al consultar. Los registros anulados no cuentan.
 */

const tally = z.number().int().nonnegative();
const date = z.iso.date();

/**
 * Cada fecha que tocaba hasta hoy es un trabajo programado: hecho en esa fecha o antes, hecho después, o
 * pendiente con la fecha ya pasada. El «No conforme» cuenta como hecho.
 */
const compliance = z.object({ onTime: tally, late: tally, pending: tally });

/** Un equipo para «Evaluar reemplazo»: solo las condiciones que cumple dejan de ser null (02 §12). */
const replacementCandidate = z.object({
  asset: maintenanceAssetRef.extend({ area: z.string().nullable() }),
  /** El día en que cumplió su vida útil. */
  usefulLifeEndedOn: date.nullable(),
  /** Lo reparado (correctivos) en el periodo, si llega a la mitad de su valor de reposición. */
  repairs: z.object({ cost: money, replacementValue: money }).nullable(),
  /** Los incidentes reportados en el periodo, si son 3 o más; Equipos los cuenta para quien los atiende. */
  faults: tally.nullable(),
});

/** GET /indicators */
export const maintenanceIndicators = z.object({
  /** Del primer día del mes de hace 11 meses a hoy. */
  period: z.object({ from: date, to: date }),
  /** Cumplimiento del plan. */
  compliance,
  /** Vencidos o no conformes hoy: la cifra de Por hacer. */
  overdue: tally,
  /** Trabajos de los planes de calibración y cuántos están vigentes: último registro no «No conforme» y fecha sin vencer. */
  calibrations: z.object({ current: tally, total: tally }),
  /** Registrado en el periodo: preventivo (con calibración, verificación y limpieza) frente a correctivo. */
  costs: z.object({ preventive: money, corrective: money, withoutCost: tally }),
  /** Programado frente a realizado, por el mes de la fecha que tocaba, del más antiguo al actual. */
  months: z
    .array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), due: tally, done: tally, onTime: tally }))
    .length(12),
  /** El cumplimiento por el requisito actual de los planes, de la A a la Z; sin los planes sin requisito. */
  requirements: z.array(compliance.extend({ requirement: z.string() })),
  /** Los equipos para «Evaluar reemplazo», por código; sin los descartados vigentes. */
  replacement: z.array(replacementCandidate),
});

/** POST /assets/:assetId/replacement-review: el Administrador descarta el aviso por 6 meses, con motivo. */
export const dismissReplacementRequest = z.object({ reason: text(500) }).strict();
export const replacementDismissed = z.object({ assetId: z.uuid(), dismissedUntil: date });

export type MaintenanceIndicators = z.infer<typeof maintenanceIndicators>;
export type ReplacementCandidate = z.infer<typeof replacementCandidate>;
export type ReplacementDismissed = z.infer<typeof replacementDismissed>;
