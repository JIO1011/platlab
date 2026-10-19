import { describe, expect, it } from 'vitest';
import { formatDate } from '../../app/format';
import {
  compliancePercent,
  onTimeText,
  periodText,
  replacementReasons,
  schedulePoints,
  scheduleText,
  scheduleTotals,
  withoutRequirementText,
} from './indicator-text';

const month = (value: string, due = 0, done = 0, onTime = 0) => ({ month: value, due, done, onTime });

describe('periodText', () => {
  it('nombra el primer y el último mes del periodo', () => {
    expect(periodText({ from: '2025-11-01', to: '2026-10-19' })).toBe('Últimos 12 meses: nov 2025 a oct 2026');
  });
});

describe('compliancePercent', () => {
  it('redondea hacia abajo: casi todo a tiempo no se dice 100 %', () => {
    expect(compliancePercent({ onTime: 249, late: 1, pending: 0 })).toBe(99);
    expect(compliancePercent({ onTime: 2, late: 1, pending: 1 })).toBe(50);
    expect(compliancePercent({ onTime: 3, late: 0, pending: 0 })).toBe(100);
  });

  it('sin nada programado no hay porcentaje', () => {
    expect(compliancePercent({ onTime: 0, late: 0, pending: 0 })).toBeNull();
  });
});

describe('onTimeText', () => {
  it('dice lo hecho a tiempo de lo programado', () => {
    expect(onTimeText({ onTime: 8, late: 1, pending: 1 })).toBe('8 de 10 a tiempo');
    expect(onTimeText({ onTime: 0, late: 0, pending: 2 })).toBe('0 de 2 a tiempo');
  });

  it('sin nada programado lo dicen en palabras', () => {
    const none = { onTime: 0, late: 0, pending: 0 };
    expect(onTimeText(none)).toBe('Sin trabajos programados todavía');
  });
});

describe('withoutRequirementText', () => {
  const total = { onTime: 8, late: 1, pending: 1 };
  const row = { onTime: 6, late: 1, pending: 1 };

  it('si todos los trabajos están en alguna fila, no dice nada', () => {
    expect(withoutRequirementText(total, [row, { onTime: 2, late: 0, pending: 0 }])).toBeNull();
  });

  it('dice cuántos trabajos son de planes sin requisito', () => {
    expect(withoutRequirementText(total, [{ onTime: 6, late: 1, pending: 1 }, { onTime: 1, late: 0, pending: 0 }])).toBe('1\u00A0trabajo es de un plan sin requisito');
    expect(withoutRequirementText(total, [row])).toBe('2\u00A0trabajos son de planes sin requisito');
  });
});

describe('replacementReasons', () => {
  it('una línea por cada condición que cumple, con los importes tal cual llegan', () => {
    expect(replacementReasons({ usefulLifeEndedOn: '2025-03-01', repairs: { cost: '1250.5', replacementValue: '2000' }, faults: 3 })).toEqual([
      `Cumplió su vida útil el ${formatDate('2025-03-01')}`,
      'Reparado en 12 meses: $\u00A01.250,5 de $\u00A02.000 de su valor de reposición',
      '3 incidentes en 12 meses',
    ]);
  });

  it('solo las condiciones que cumple', () => {
    expect(replacementReasons({ usefulLifeEndedOn: null, repairs: null, faults: 4 })).toEqual(['4 incidentes en 12 meses']);
    expect(replacementReasons({ usefulLifeEndedOn: null, repairs: null, faults: null })).toEqual([]);
  });
});

describe('schedulePoints', () => {
  const points = schedulePoints([month('2025-11'), month('2025-12'), month('2026-01'), month('2026-02')]);

  it('pone el año bajo el primer mes y bajo cada enero', () => {
    expect(points.map((point) => point.year)).toEqual(['2025', null, '2026', null]);
  });

  it('el último es el mes en curso', () => {
    expect(points.map((point) => point.current)).toEqual([false, false, false, true]);
  });

  it('centra cada mes en su columna', () => {
    expect(points.map((point) => point.x)).toEqual([12.5, 37.5, 62.5, 87.5]);
  });

  it('da el nombre corto del eje y el largo de la lectura', () => {
    expect(points[0]?.short).toBe('nov');
    expect(points[0]?.long).toBe('noviembre de 2025');
  });
});

describe('scheduleTotals y scheduleText', () => {
  it('suman los meses y lo dicen en palabras', () => {
    const totals = scheduleTotals([month('2026-09', 10, 8, 7), month('2026-10', 8, 6, 5)]);
    expect(totals).toEqual({ due: 18, done: 14, onTime: 12 });
    expect(scheduleText(totals)).toBe('14 de 18 hechos · 12 a tiempo');
  });

  it('sin trabajos programados lo dicen en palabras', () => {
    expect(scheduleText({ due: 0, done: 0, onTime: 0 })).toBe('Sin trabajos programados');
  });
});
