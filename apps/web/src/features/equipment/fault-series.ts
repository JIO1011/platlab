import type { FaultStats } from '@platlab/contracts';
import { niceScale } from '../../app/chart-scale';
import { monthName } from '../../app/month-name';

type Month = FaultStats['months'][number];

export interface FaultPlotPoint {
  month: string;
  /** «nov»: el nombre corto del eje. */
  short: string;
  /** «noviembre de 2026»: el de la lectura. */
  long: string;
  /** El año, bajo el primer mes del eje y bajo cada enero; `null` en los demás. */
  year: string | null;
  /** El mes actual: el último; sus incidentes aún pueden crecer. */
  current: boolean;
  reported: number;
  resolved: number;
  /** Posición horizontal en %: el centro de su columna. */
  x: number;
  /** Alturas en % del eje, desde abajo. */
  reportedY: number;
  resolvedY: number;
}

/**
 * La escala entera del eje y la altura de las dos barras de cada mes. Con todo en cero, ambas quedan sobre la base.
 * Hasta 5, el eje marca cada entero: con tan pocos incidentes, la lectura exacta importa más que un eje despejado.
 */
export function faultPlot(months: Month[]): { max: number; ticks: number[]; points: FaultPlotPoint[] } {
  const scale = niceScale(Math.max(...months.map((entry) => Math.max(entry.reported, entry.resolved))));
  const { max } = scale;
  const ticks = max <= 5 ? Array.from({ length: max + 1 }, (_, tick) => tick) : scale.ticks;
  const points = months.map((entry, index) => ({
    month: entry.month,
    short: monthName(entry.month, 'short'),
    long: monthName(entry.month, 'long'),
    year: index === 0 || entry.month.endsWith('-01') ? entry.month.slice(0, 4) : null,
    current: index === months.length - 1,
    reported: entry.reported,
    resolved: entry.resolved,
    x: ((index + 0.5) / months.length) * 100,
    reportedY: (entry.reported * 100) / max,
    resolvedY: (entry.resolved * 100) / max,
  }));
  return { max, ticks, points };
}

/** Sin un solo incidente reportado ni solucionado en el período, no hay barra que dibujar. */
export const hasFaultActivity = (months: Month[]) => months.some((entry) => entry.reported > 0 || entry.resolved > 0);

const reportedText = (n: number) => `${n} ${n === 1 ? 'reportado' : 'reportados'}`;
const resolvedText = (n: number) => `${n} ${n === 1 ? 'solucionado' : 'solucionados'}`;

/** «4 reportados · 3 solucionados»: la lectura de un mes y la suma del período. */
export const faultCountsText = (reported: number, resolved: number) => `${reportedText(reported)} · ${resolvedText(resolved)}`;

/** «febrero de 2026: 4 reportados, 3 solucionados»; el mes actual lo dice: «octubre de 2026 (en curso): …». */
export const monthReading = (point: FaultPlotPoint) =>
  `${point.long}${point.current ? ' (en curso)' : ''}: ${reportedText(point.reported)}, ${resolvedText(point.resolved)}`;

/** Lo que suman los 12 meses. */
export function faultTotals(months: Month[]): { reported: number; resolved: number } {
  return {
    reported: months.reduce((sum, entry) => sum + entry.reported, 0),
    resolved: months.reduce((sum, entry) => sum + entry.resolved, 0),
  };
}

const openText = (n: number) => (n === 0 ? 'ninguno abierto hoy' : `${n} ${n === 1 ? 'abierto' : 'abiertos'} hoy`);

/** «14 reportados · 11 solucionados en 12 meses · 2 abiertos hoy»: la frase que encabeza el gráfico. */
export const faultSummaryText = (totals: { reported: number; resolved: number }, open: number) =>
  `${faultCountsText(totals.reported, totals.resolved)} en 12 meses · ${openText(open)}`;
