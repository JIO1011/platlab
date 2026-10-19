import type { MaintenanceIndicators, ReplacementCandidate } from '@platlab/contracts';
import { formatDecimal } from '@platlab/ui';
import { monthName } from '../../app/month-name';
import { formatDate } from '../../app/format';

/** Cifras de Indicadores (ADR 0020, M-01c) dichas en palabras. */

type Compliance = MaintenanceIndicators['compliance'];
type Month = MaintenanceIndicators['months'][number];

/** «Últimos 12 meses: nov 2025 a oct 2026». */
export const periodText = ({ from, to }: MaintenanceIndicators['period']) =>
  `Últimos 12 meses: ${monthName(from.slice(0, 7), 'short-year')} a ${monthName(to.slice(0, 7), 'short-year')}`;

/** Los trabajos programados hasta hoy: hechos a tiempo, hechos tarde y atrasados. */
const scheduledCount = ({ onTime, late, pending }: Compliance) => onTime + late + pending;

/** El % a tiempo, entero y hacia abajo: 99,6 % no se dice 100 %. null si no hay nada programado. */
export function compliancePercent(compliance: Compliance): number | null {
  const total = scheduledCount(compliance);
  return total === 0 ? null : Math.floor((compliance.onTime * 100) / total);
}

/** «8 de 10 a tiempo»; sin nada programado, «Sin trabajos programados todavía». */
export function onTimeText(compliance: Compliance): string {
  const total = scheduledCount(compliance);
  return total === 0 ? 'Sin trabajos programados todavía' : `${compliance.onTime} de ${total} a tiempo`;
}

/**
 * Los trabajos programados hasta hoy cuyo plan no tiene requisito: el total menos lo que suman las filas por requisito.
 * «1 trabajo es de un plan sin requisito»; null si todos están en alguna fila.
 */
export function withoutRequirementText(total: Compliance, rows: Compliance[]): string | null {
  const n = scheduledCount(total) - rows.reduce((sum, row) => sum + scheduledCount(row), 0);
  if (n <= 0) return null;
  return n === 1 ? '1\u00A0trabajo es de un plan sin requisito' : `${n}\u00A0trabajos son de planes sin requisito`;
}

/** Por qué un equipo pide evaluar su reemplazo: una línea por condición que cumple (02 §12). */
export function replacementReasons({ usefulLifeEndedOn, repairs, faults }: Pick<ReplacementCandidate, 'usefulLifeEndedOn' | 'repairs' | 'faults'>): string[] {
  const reasons: string[] = [];
  if (usefulLifeEndedOn) reasons.push(`Cumplió su vida útil el ${formatDate(usefulLifeEndedOn)}`);
  // Los importes se muestran tal cual llegan: sin calcular porcentajes con number.
  if (repairs) reasons.push(`Reparado en 12 meses: $\u00A0${formatDecimal(repairs.cost)} de $\u00A0${formatDecimal(repairs.replacementValue)} de su valor de reposición`);
  if (faults !== null) reasons.push(`${faults} incidentes en 12 meses`);
  return reasons;
}

export interface SchedulePoint extends Month {
  /** «nov»: el nombre corto del eje. */
  short: string;
  /** «noviembre de 2026»: el de la lectura. */
  long: string;
  /** El año, bajo el primer mes del eje y bajo cada enero; `null` en los demás. */
  year: string | null;
  /** El mes actual: sus fechas aún no terminan. */
  current: boolean;
  /** Posición horizontal en %: el centro de su columna. */
  x: number;
}

/** Los meses con sus nombres y su posición en el eje. El último es el mes en curso. */
export function schedulePoints(months: Month[]): SchedulePoint[] {
  return months.map((entry, index) => ({
    ...entry,
    short: monthName(entry.month, 'short'),
    long: monthName(entry.month, 'long'),
    year: index === 0 || entry.month.endsWith('-01') ? entry.month.slice(0, 4) : null,
    current: index === months.length - 1,
    x: ((index + 0.5) / months.length) * 100,
  }));
}

/** Lo que suman los 12 meses. */
export function scheduleTotals(months: Month[]): { due: number; done: number; onTime: number } {
  return {
    due: months.reduce((sum, entry) => sum + entry.due, 0),
    done: months.reduce((sum, entry) => sum + entry.done, 0),
    onTime: months.reduce((sum, entry) => sum + entry.onTime, 0),
  };
}

/** «14 de 18 hechos · 12 a tiempo»: lo hecho de lo programado, en un mes o en el periodo. */
export const scheduleText = ({ due, done, onTime }: { due: number; done: number; onTime: number }) =>
  due === 0 ? 'Sin trabajos programados' : `${done} de ${due} hechos · ${onTime} a tiempo`;
