import type { FaultStats } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import {
  faultCountsText,
  faultPlot,
  faultSummaryText,
  faultTotals,
  hasFaultActivity,
  monthReading,
} from './fault-series';

type Months = FaultStats['months'];

/** Doce meses de 2025-11 a 2026-10; `values` pisa los que se indican (por posición). */
const year = (values: Record<number, [number, number]> = {}): Months =>
  Array.from({ length: 12 }, (_, index) => {
    const calendar = 10 + index; // 0 = noviembre de 2025
    const month = `${2025 + Math.floor(calendar / 12)}-${String((calendar % 12) + 1).padStart(2, '0')}`;
    const [reported, resolved] = values[index] ?? [0, 0];
    return { month, reported, resolved };
  });

describe('faultPlot', () => {
  it('con todo en cero deja la escala mínima y las dos barras en cero', () => {
    const { max, ticks, points } = faultPlot(year());
    expect(max).toBe(1);
    expect(ticks).toEqual([0, 1]);
    expect(points.every((point) => point.reportedY === 0 && point.resolvedY === 0)).toBe(true);
  });

  it('hasta 5 el eje marca cada entero; desde 6 pasa a la escala de 5 en 5', () => {
    expect(faultPlot(year({ 3: [3, 1] })).ticks).toEqual([0, 1, 2, 3]);
    expect(faultPlot(year({ 3: [5, 1] })).ticks).toEqual([0, 1, 2, 3, 4, 5]);
    expect(faultPlot(year({ 3: [6, 1] })).ticks).toEqual([0, 5, 10]);
  });

  it('un pico de 7 sube el eje a 10 y coloca cada punto en proporción', () => {
    const { max, ticks, points } = faultPlot(year({ 3: [7, 2], 4: [5, 7] }));
    expect(max).toBe(10);
    expect(ticks).toEqual([0, 5, 10]);
    expect(points[3]).toMatchObject({ reportedY: 70, resolvedY: 20 });
    expect(points[4]).toMatchObject({ reportedY: 50, resolvedY: 70 });
  });

  it('el pico puede ser de Solucionados: la escala mira las dos series', () => {
    expect(faultPlot(year({ 11: [1, 4] })).max).toBe(4);
  });

  it('centra cada mes en su columna, del primero al actual', () => {
    const { points } = faultPlot(year());
    expect(points).toHaveLength(12);
    expect(points[0]?.x).toBeCloseTo(100 / 24);
    expect(points[11]?.x).toBeCloseTo(100 - 100 / 24);
  });

  it('nombra los meses vacíos igual que los demás, en español y sin punto', () => {
    const { points } = faultPlot(year());
    expect(points[0]).toMatchObject({ month: '2025-11', short: 'nov', long: 'noviembre de 2025' });
    expect(points[2]).toMatchObject({ month: '2026-01', short: 'ene', long: 'enero de 2026' });
    expect(points[2]?.short).not.toContain('.');
  });
});

describe('año del eje', () => {
  it('va bajo el primer mes y bajo cada enero, y en ningún otro', () => {
    const { points } = faultPlot(year());
    expect(points.map((point) => point.year)).toEqual(['2025', null, '2026', null, null, null, null, null, null, null, null, null]);
  });
});

describe('mes en curso', () => {
  it('es solo el último', () => {
    const { points } = faultPlot(year());
    expect(points.map((point) => point.current)).toEqual([...Array(11).fill(false), true]);
  });
});

describe('hasFaultActivity', () => {
  it('es falso solo si todos los meses están en cero', () => {
    expect(hasFaultActivity(year())).toBe(false);
    expect(hasFaultActivity(year({ 6: [0, 1] }))).toBe(true);
    expect(hasFaultActivity(year({ 0: [2, 0] }))).toBe(true);
  });
});

describe('textos', () => {
  it('concuerda en singular y plural', () => {
    expect(faultCountsText(4, 3)).toBe('4 reportados · 3 solucionados');
    expect(faultCountsText(1, 0)).toBe('1 reportado · 0 solucionados');
    expect(faultCountsText(0, 1)).toBe('0 reportados · 1 solucionado');
  });

  it('la lectura de un mes lleva el mes completo', () => {
    const point = faultPlot(year({ 3: [4, 3] })).points[3];
    expect(point && monthReading(point)).toBe('febrero de 2026: 4 reportados, 3 solucionados');
  });

  it('la lectura del mes actual dice que está en curso', () => {
    const point = faultPlot(year({ 11: [3, 1] })).points[11];
    expect(point && monthReading(point)).toBe('octubre de 2026 (en curso): 3 reportados, 1 solucionado');
  });

  it('la frase del gráfico suma el período y dice cuántos siguen abiertos', () => {
    expect(faultSummaryText({ reported: 14, resolved: 11 }, 2)).toBe('14 reportados · 11 solucionados en 12 meses · 2 abiertos hoy');
    expect(faultSummaryText({ reported: 1, resolved: 1 }, 1)).toBe('1 reportado · 1 solucionado en 12 meses · 1 abierto hoy');
    expect(faultSummaryText({ reported: 3, resolved: 3 }, 0)).toBe('3 reportados · 3 solucionados en 12 meses · ninguno abierto hoy');
  });

  it('suma los doce meses', () => {
    expect(faultTotals(year({ 0: [2, 1], 5: [3, 3], 11: [1, 0] }))).toEqual({ reported: 6, resolved: 4 });
    expect(faultTotals(year())).toEqual({ reported: 0, resolved: 0 });
  });
});
