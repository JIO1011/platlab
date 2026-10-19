import { describe, expect, it } from 'vitest';
import { emptyHistoryFilters, INTERNAL, type HistoryFilters } from './history-filters';
import { activeHistoryFilters, historyFilterLines, periodText, printedWork, recordsText, type HistoryNames } from './history-text';

const AREA = 'da000000-0000-4000-8000-00000000000a';
const PROVIDER = 'db000000-0000-4000-8000-00000000000b';
const names: HistoryNames = {
  asset: 'BAL-01 Balanza analítica',
  areas: new Map([[AREA, 'Química']]),
  providers: new Map([[PROVIDER, 'Metrología Andina']]),
};

describe('textos del Historial (M-01d)', () => {
  it('cuenta los registros, con «+» si hay más páginas', () => {
    expect(recordsText(1, false)).toBe('1 registro');
    expect(recordsText(0, false)).toBe('0 registros');
    expect(recordsText(50, true)).toBe('50+ registros');
  });

  it('dice el periodo con sus extremos incluidos, y nada sin ellos', () => {
    expect(periodText('2026-10-01', '2026-10-31')).toBe('Del 01/10/2026 al 31/10/2026');
    expect(periodText('2026-10-01', null)).toBe('Desde el 01/10/2026');
    expect(periodText(null, '2026-10-31')).toBe('Hasta el 31/10/2026');
    expect(periodText(null, null)).toBeNull();
  });

  it('sin filtros no hay fichas ni líneas', () => {
    expect(activeHistoryFilters(emptyHistoryFilters, names)).toEqual([]);
    expect(historyFilterLines(emptyHistoryFilters, names)).toEqual([]);
  });

  it('una ficha por valor, y cada una dice cómo quitarse', () => {
    const filters: HistoryFilters = {
      ...emptyHistoryFilters,
      from: '2026-10-01',
      to: '2026-10-31',
      kinds: ['calibration', 'cleaning'],
      results: ['fail'],
      areas: [AREA],
      providers: [INTERNAL, PROVIDER],
    };
    const active = activeHistoryFilters(filters, names);
    expect(active.map((entry) => `${entry.group}: ${entry.label}`)).toEqual([
      'Periodo: Del 01/10/2026 al 31/10/2026',
      'Tipo de trabajo: Calibración',
      'Tipo de trabajo: Limpieza',
      'Resultado: No conforme',
      'Área: Química',
      'Quién lo hizo: Interno',
      'Quién lo hizo: Metrología Andina',
    ]);
    expect(active[0]?.remove).toEqual({ from: null, to: null });
    expect(active[1]?.remove).toEqual({ kinds: ['cleaning'] });
    expect(active[6]?.remove).toEqual({ providers: [INTERNAL] });
  });

  it('en la hoja impresa agrupa por filtro y nombra el equipo', () => {
    const lines = historyFilterLines(
      { ...emptyHistoryFilters, assetId: 'da000000-0000-4000-8000-0000000000ff', kinds: ['calibration', 'cleaning'], providers: [INTERNAL] },
      names,
    );
    expect(lines).toEqual(['Equipo: BAL-01 Balanza analítica', 'Tipo de trabajo: Calibración, Limpieza', 'Quién lo hizo: Interno']);
  });

  it('un área o proveedor que ya no está se dice sin inventar un nombre', () => {
    const lines = historyFilterLines({ ...emptyHistoryFilters, areas: [PROVIDER], providers: [AREA] }, names);
    expect(lines).toEqual(['Área: Área no disponible', 'Quién lo hizo: Proveedor no disponible']);
  });

  it('el trabajo impreso: plan con su tipo, «sin plan», y «(anulado)»', () => {
    const voided = { at: '2026-10-02T10:00:00Z', by: null, reason: 'Error', correctedBy: null };
    expect(printedWork({ plan: { title: 'Balanzas' }, kind: 'calibration', voided: null })).toBe('Balanzas · Calibración');
    expect(printedWork({ plan: null, kind: 'corrective', voided: null })).toBe('Correctivo');
    expect(printedWork({ plan: null, kind: 'cleaning', voided })).toBe('Limpieza sin plan (anulado)');
  });
});
