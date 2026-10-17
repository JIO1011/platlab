import { describe, expect, it } from 'vitest';
import { niceScale, stepIndex } from './chart-scale';

describe('niceScale', () => {
  it('sin datos deja una escala de 0 a 1', () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
  });

  it('hasta 5 usa el pico mismo, con la mitad solo si es entera', () => {
    expect(niceScale(3)).toEqual({ max: 3, ticks: [0, 3] });
    expect(niceScale(4)).toEqual({ max: 4, ticks: [0, 2, 4] });
    expect(niceScale(5)).toEqual({ max: 5, ticks: [0, 5] });
  });

  it('desde 6 sube al múltiplo de 5', () => {
    expect(niceScale(7)).toEqual({ max: 10, ticks: [0, 5, 10] });
    expect(niceScale(11)).toEqual({ max: 15, ticks: [0, 15] });
  });
});

describe('stepIndex', () => {
  it('las flechas se detienen en los extremos', () => {
    expect(stepIndex('ArrowRight', 11, 12)).toBe(11);
    expect(stepIndex('ArrowLeft', 0, 12)).toBe(0);
    expect(stepIndex('ArrowRight', 3, 12)).toBe(4);
  });

  it('sin posición, la flecha derecha va al primero y la izquierda al último', () => {
    expect(stepIndex('ArrowRight', null, 12)).toBe(0);
    expect(stepIndex('ArrowLeft', null, 12)).toBe(11);
  });

  it('Inicio y Fin saltan a los extremos, y otra tecla no mueve nada', () => {
    expect(stepIndex('Home', 5, 12)).toBe(0);
    expect(stepIndex('End', 5, 12)).toBe(11);
    expect(stepIndex('Tab', 5, 12)).toBeNull();
  });
});
