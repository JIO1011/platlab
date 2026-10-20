import type { AssetMaintenance } from '@platlab/contracts';
import { daysBetween, formatDate } from '../../app/format';
import type { DueTone } from './due';

/**
 * Estado de calibración de un equipo (M-01d, ISO/IEC 17025 6.4.8), con la regla de «Calibraciones vigentes» de
 * Indicadores: vigente si el último registro de cada plan de calibración no es «No conforme» y su fecha no venció.
 * Con varios planes manda el peor; si todos están vigentes, la fecha más cercana. Sin plan de calibración, null.
 */
export type CalibrationStatus =
  | { state: 'never' }
  | { state: 'failed' }
  | { state: 'expired'; since: string }
  | { state: 'current'; until: string };

type PlanState = Pick<AssetMaintenance['plans'][number], 'dueOn' | 'lastPerformedOn' | 'lastResult'> & { plan: { kind: string } };

const earliest = (dates: string[]) => dates.reduce((first, date) => (date < first ? date : first));

export function calibrationStatus(plans: readonly PlanState[], today: string): CalibrationStatus | null {
  const calibrations = plans.filter((entry) => entry.plan.kind === 'calibration');
  if (calibrations.length === 0) return null;
  if (calibrations.some((entry) => entry.lastPerformedOn === null)) return { state: 'never' };
  if (calibrations.some((entry) => entry.lastResult === 'fail')) return { state: 'failed' };
  const dues = calibrations.map((entry) => entry.dueOn);
  const expired = dues.filter((due) => due < today);
  if (expired.length > 0) return { state: 'expired', since: earliest(expired) };
  return { state: 'current', until: earliest(dues) };
}

/** El estado en palabras, con el color del semáforo: lo que no está vigente dice «no usar». */
export function calibrationText(status: CalibrationStatus, today: string): { text: string; tone: DueTone } {
  switch (status.state) {
    case 'never':
      return { text: 'Sin calibración registrada: no usar', tone: 'danger' };
    case 'failed':
      return { text: 'Calibración no conforme: no usar', tone: 'danger' };
    case 'expired':
      return { text: 'Calibración vencida: no usar', tone: 'danger' };
    case 'current':
      return { text: `Calibrada hasta el ${formatDate(status.until)}`, tone: daysBetween(today, status.until) <= 30 ? 'warning' : 'success' };
  }
}
