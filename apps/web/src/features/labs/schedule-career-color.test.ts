import { describe, expect, it } from 'vitest';
import { careerTone, careerTones, neutralTone } from './schedule-career-color';

describe('careerTone', () => {
  it('da el fondo neutro a un bloque sin carrera', () => {
    expect(careerTone(null)).toBe(neutralTone);
    expect(careerTone('')).toBe(neutralTone);
    expect(careerTone('   ')).toBe(neutralTone);
  });

  it('da siempre el mismo tono a la misma carrera', () => {
    expect(careerTone('Odontología')).toBe(careerTone('Odontología'));
  });

  it('ignora mayúsculas, tildes y espacios de más', () => {
    expect(careerTone('  INGENIERÍA   Química ')).toBe(careerTone('ingenieria quimica'));
  });

  it('elige siempre un tono de la paleta', () => {
    for (const career of ['Odontología', 'Biotecnología', 'Ingeniería Química', 'Medicina', 'Enfermería']) {
      expect(careerTones).toContain(careerTone(career));
    }
  });

  it('distingue carreras: varias no caen en un solo tono', () => {
    const tones = new Set(['Odontología', 'Biotecnología', 'Ingeniería Química', 'Medicina', 'Enfermería', 'Bioquímica'].map(careerTone));
    expect(tones.size).toBeGreaterThan(2);
  });
});
