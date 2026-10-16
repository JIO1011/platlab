import { describe, expect, it } from 'vitest';
import { formatMoney, todayIn, usefulLifeText, warrantyText } from './asset-facts';

const today = '2026-10-15';

describe('warrantyText', () => {
  it('sin fecha, no hay garantía', () => {
    expect(warrantyText(null, today)).toBe('Sin garantía');
  });
  it('hoy es el último día de cobertura', () => {
    expect(warrantyText('2026-10-15', today)).toBe('Vence hoy');
  });
  it('ayer ya venció y dice la fecha', () => {
    expect(warrantyText('2026-10-14', today)).toMatch(/^Vencida el .*2026/);
  });
  it('cuenta meses completos y, debajo de uno, días', () => {
    expect(warrantyText('2027-06-15', today)).toBe('Vence en 8 meses');
    expect(warrantyText('2026-11-15', today)).toBe('Vence en 1 mes');
    expect(warrantyText('2026-11-14', today)).toBe('Vence en 30 días');
    expect(warrantyText('2026-10-16', today)).toBe('Vence en 1 día');
  });
});

describe('usefulLifeText', () => {
  it('sin compra o sin años, no hay dato', () => {
    expect(usefulLifeText(null, 5, today)).toBe('Sin dato');
    expect(usefulLifeText('2024-01-01', null, today)).toBe('Sin dato');
  });
  it('el día en que se cumple ya está cumplida', () => {
    expect(usefulLifeText('2021-10-15', 5, today)).toBe('Cumplida');
    expect(usefulLifeText('2021-03-15', 5, today)).toBe('Cumplida');
  });
  it('dice los años y, si sobran, los meses', () => {
    expect(usefulLifeText('2024-10-15', 5, today)).toBe('Quedan 3 años');
    expect(usefulLifeText('2024-06-10', 5, today)).toBe('Quedan 2 años y 7 meses');
    expect(usefulLifeText('2025-02-20', 2, today)).toBe('Quedan 4 meses');
    expect(usefulLifeText('2025-10-30', 1, today)).toBe('Quedan 15 días');
  });
});

describe('formatMoney', () => {
  it('agrupa miles con punto y fija dos decimales', () => {
    expect(formatMoney('9800')).toBe('USD 9.800,00');
    expect(formatMoney('9800.5')).toBe('USD 9.800,50');
    expect(formatMoney('1234567.89')).toBe('USD 1.234.567,89');
    expect(formatMoney('0.5')).toBe('USD 0,50');
    expect(formatMoney('950')).toBe('USD 950,00');
  });
});

describe('todayIn', () => {
  it('es una fecha civil AAAA-MM-DD', () => {
    expect(todayIn('America/Guayaquil')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
