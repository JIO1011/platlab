// Prototipo R-01D: solo interfaz
import { describe, expect, it } from 'vitest';
import { quantityOfWeight, receiptWeight, tareFromFull, weightOfQuantity } from './weight';

describe('control por peso', () => {
  it('calcula la tara de un frasco lleno: masa directa o volumen por densidad', () => {
    expect(tareFromFull('640', '500', 'g', null)).toBe('140.0');
    expect(tareFromFull('1140', '1', 'kg', null)).toBe('140.0');
    expect(tareFromFull('534.5', '500', 'mL', '0.789')).toBe('140.0');
    expect(tareFromFull('1500', '1', 'L', '1.19')).toBe('310.0');
    expect(tareFromFull('640', '500', 'mL', null)).toBeNull();
  });

  it('pasa de cantidad a peso y de peso a cantidad', () => {
    expect(weightOfQuantity('45.69', 'mL', '1.19')).toBe('54.371100000');
    expect(quantityOfWeight('51.9', 'mL', '1.19')).toBe('43.61');
    expect(quantityOfWeight('1500', 'kg', null)).toBe('1.50');
    expect(quantityOfWeight('1190', 'L', '1.19')).toBe('1.00');
  });
});

describe('receiptWeight', () => {
  const base = { unit: 'mL', quantity: '500', full: '', density: '', knownDensity: null };

  it('no pide nada mientras el peso lleno está vacío', () => {
    expect(receiptWeight(base)).toEqual({ tare: null, error: null, needsDensity: true });
  });

  it('pide la densidad de un volumen y calcula la tara con ella', () => {
    expect(receiptWeight({ ...base, full: '640' }).error).toMatch(/densidad/);
    expect(receiptWeight({ ...base, full: '534.5', density: '0.789' }).tare).toBe('140.0');
  });

  it('avisa cuando el peso lleno no supera el contenido', () => {
    expect(receiptWeight({ ...base, full: '300', density: '0.789' }).error).toMatch(/debe superar/);
  });

  it('en masa no necesita densidad', () => {
    expect(receiptWeight({ unit: 'g', quantity: '500', full: '640', density: '', knownDensity: null })).toEqual({
      tare: '140.0',
      error: null,
      needsDensity: false,
    });
  });
});
