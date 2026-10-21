import { describe, expect, it } from 'vitest';
import { suggestAbbreviation } from './space-abbreviation';

describe('suggestAbbreviation', () => {
  it('con una palabra significativa, sus 3 primeras letras sin tilde', () => {
    expect(suggestAbbreviation('Laboratorio de Anatomía', [])).toBe('ANA');
    expect(suggestAbbreviation('Laboratorio de Física', [])).toBe('FIS');
  });

  it('con 2 o más palabras significativas, sus iniciales hasta 5', () => {
    expect(suggestAbbreviation('Biología Molecular', [])).toBe('BM');
    expect(suggestAbbreviation('Medicina Física Nuclear Avanzada Rápida Extra', [])).toBe('MFNAR');
  });

  it('sin palabra significativa, las 3 primeras letras del nombre', () => {
    expect(suggestAbbreviation('Laboratorio', [])).toBe('LAB');
    expect(suggestAbbreviation('Sala de Aula', [])).toBe('SAL');
  });

  it('si ya está tomada, agrega un número sin pasar de 5 caracteres', () => {
    expect(suggestAbbreviation('Sala de Química', ['QUI'])).toBe('QUI2');
    expect(suggestAbbreviation('Sala de Química', ['QUI', 'QUI2', 'qui3'])).toBe('QUI4');
    expect(suggestAbbreviation('Sala de Química', ['QUI', ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => `QUI${n}`)])).toBe('QUI10');
    expect(suggestAbbreviation('Medicina Física Nuclear Avanzada Rápida', ['MFNAR', 'MFNA2'])).toBe('MFNA3');
  });
});
