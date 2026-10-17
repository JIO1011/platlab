import type { FaultStats } from '@platlab/contracts';
import { niceScale } from '../../app/chart-scale';

type Month = FaultStats['months'][number];

export interface FaultPlotPoint {
  month: string;
  /** «nov»: el nombre corto del eje. */
  short: string;
  /** «noviembre de 2026»: el de la lectura. */
  long: string;
  /** El año, bajo el primer mes del eje y bajo cada enero; `null` en los demás. */
  year: string | null;
  reported: number;
  resolved: number;
  /** Posición horizontal en %: el centro de su columna. */
  x: number;
  /** Alturas en % del eje, desde abajo. */
  reportedY: number;
  resolvedY: number;
}

/** «2026-11» → «nov» o «noviembre de 2026». Los meses son del calendario del espacio: sin hora ni zona que convertir. */
function monthName(month: string, style: 'short' | 'long'): string {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: 'UTC',
    month: style,
    ...(style === 'long' ? { year: 'numeric' } : {}),
  }).format(new Date(Date.UTC(year ?? 1970, (number ?? 1) - 1, 1)));
}

/**
 * La escala entera del eje y la posición de cada mes en las dos líneas. Con todo en cero, ambas quedan sobre la base.
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
    reported: entry.reported,
    resolved: entry.resolved,
    x: ((index + 0.5) / months.length) * 100,
    reportedY: (entry.reported * 100) / max,
    resolvedY: (entry.resolved * 100) / max,
  }));
  return { max, ticks, points };
}

/** Sin un solo incidente reportado ni solucionado en el período, no hay línea que dibujar. */
export const hasFaultActivity = (months: Month[]) => months.some((entry) => entry.reported > 0 || entry.resolved > 0);

const reportedText = (n: number) => `${n} ${n === 1 ? 'reportado' : 'reportados'}`;
const resolvedText = (n: number) => `${n} ${n === 1 ? 'solucionado' : 'solucionados'}`;

/** «4 reportados · 3 solucionados»: la lectura de un mes y la suma del período. */
export const faultCountsText = (reported: number, resolved: number) => `${reportedText(reported)} · ${resolvedText(resolved)}`;

/** «febrero de 2026: 4 reportados · 3 solucionados». */
export const monthReading = (point: FaultPlotPoint) => `${point.long}: ${faultCountsText(point.reported, point.resolved)}`;

/** Lo que suman los 12 meses. */
export function faultTotals(months: Month[]): { reported: number; resolved: number } {
  return {
    reported: months.reduce((sum, entry) => sum + entry.reported, 0),
    resolved: months.reduce((sum, entry) => sum + entry.resolved, 0),
  };
}

/**
 * De qué lado de su punto va el nombre de cada línea al final: la más alta, arriba, y la otra, abajo; con el
 * mismo valor, Reportados arriba. Así los dos nombres no se pisan aunque las líneas terminen juntas.
 */
export function endLabelSides(point: Pick<FaultPlotPoint, 'reported' | 'resolved'>): { reported: 'above' | 'below'; resolved: 'above' | 'below' } {
  return point.resolved > point.reported ? { reported: 'below', resolved: 'above' } : { reported: 'above', resolved: 'below' };
}
