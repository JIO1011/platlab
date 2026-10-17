import { describe, expect, it } from 'vitest';
import { assetMeta, assetsText, placeInArea, placeLines, stateParts } from './asset-text';

describe('assetMeta', () => {
  it('une marca, modelo y serie, y omite lo que falta', () => {
    expect(assetMeta({ brand: 'Olympus', model: 'CX23', serialNumber: 'A-1' })).toBe('Olympus · CX23 · Serie A-1');
    expect(assetMeta({ brand: null, model: 'CX23', serialNumber: null })).toBe('CX23');
    expect(assetMeta({ brand: null, model: null, serialNumber: null })).toBe('');
  });
});

describe('placeLines', () => {
  it('separa la sala de los niveles siguientes', () => {
    expect(placeLines({ name: 'Estante 2', path: ['Sala 1', 'Armario A', 'Estante 2'] })).toEqual({
      room: 'Sala 1',
      rest: 'Armario A · Estante 2',
      full: 'Sala 1 › Armario A › Estante 2',
    });
  });

  it('con un solo nivel, o sin camino, no hay segunda línea', () => {
    expect(placeLines({ name: 'Sala 1', path: ['Sala 1'] }).rest).toBe('');
    expect(placeLines({ name: 'Sala 1', path: [] })).toEqual({ room: 'Sala 1', rest: '', full: 'Sala 1' });
  });
});

describe('placeInArea', () => {
  it('da los niveles que siguen al área, y nada si el equipo está en el área misma', () => {
    expect(placeInArea({ path: ['Edificio B', 'Sala 1', 'Armario A', 'Estante 2'] }, 'Sala 1')).toBe('Armario A · Estante 2');
    expect(placeInArea({ path: ['Sala 1'] }, 'Sala 1')).toBe('');
    expect(placeInArea({ path: ['Otra'] }, 'Sala 1')).toBe('');
  });
});

describe('assetsText', () => {
  it('concuerda en singular y marca que hay más páginas', () => {
    expect(assetsText(1, false)).toBe('1 equipo');
    expect(assetsText(12, false)).toBe('12 equipos');
    expect(assetsText(50, true)).toBe('50+ equipos');
  });
});

describe('stateParts', () => {
  it('escribe cada estado con su cifra y omite los que están en cero', () => {
    expect(stateParts({ operational: 47, restricted: 2, faulted: 1 }).map((part) => part.text)).toEqual([
      '47 operativos',
      '2 uso limitado',
      '1 fuera de servicio',
    ]);
    expect(stateParts({ operational: 1, restricted: 0, faulted: 0 })).toEqual([{ tone: 'success', text: '1 operativo' }]);
  });
});
