import { describe, expect, it } from 'vitest';
import { careerTones, neutralTone, tones } from './schedule-career-color';

const careers = ['Odontología', 'Biotecnología', 'Ingeniería Química', 'Medicina', 'Enfermería', 'Bioquímica', 'Fisioterapia', 'Nutrición'];

describe('careerTones', () => {
  it('da el fondo neutro a un bloque sin carrera', () => {
    const toneOf = careerTones(careers);
    expect(toneOf(null)).toBe(neutralTone);
    expect(toneOf('')).toBe(neutralTone);
    expect(toneOf('   ')).toBe(neutralTone);
  });

  it('da el mismo tono a la misma carrera sin importar el orden en que llegan', () => {
    expect(careerTones(careers)('Odontología')).toBe(careerTones([...careers].reverse())('Odontología'));
  });

  it('ignora mayúsculas, tildes y espacios de más', () => {
    const toneOf = careerTones(['Ingeniería Química']);
    expect(toneOf('  INGENIERÍA   Química ')).toBe(toneOf('ingenieria quimica'));
  });

  it('elige siempre un tono de la paleta', () => {
    const toneOf = careerTones(careers);
    for (const career of careers) expect(tones).toContain(toneOf(career));
  });

  it('no repite tono entre las carreras visibles hasta agotar la paleta', () => {
    for (let count = 1; count <= tones.length; count += 1) {
      const visible = careers.slice(0, count);
      const toneOf = careerTones(visible);
      expect(new Set(visible.map(toneOf)).size).toBe(count);
    }
  });

  it('con más carreras que tonos, las reparte por igual', () => {
    const many = [...careers, 'Derecho', 'Psicología', 'Arquitectura'];
    const toneOf = careerTones(many);
    const counts = new Map<string, number>();
    for (const career of many) counts.set(toneOf(career), (counts.get(toneOf(career)) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
  });
});
