import { describe, expect, it } from 'vitest';
import { bottleCodes, codeFromName, firstFreeCode, freeSeries, nextCode, seriesFromName } from './codes.js';

describe('codeFromName (ADR 0015)', () => {
  it('quita tildes, pasa a mayúsculas y une las palabras con guiones, hasta 20 caracteres', () => {
    expect(codeFromName('Acetona', 'R')).toBe('ACETONA');
    expect(codeFromName('Ácido clorhídrico 37 %', 'R')).toBe('ACIDO-CLORHIDRICO-37');
    expect(codeFromName('  Hidróxido   de sodio ', 'R')).toBe('HIDROXIDO-SODIO');
    expect(codeFromName('Ácido etilendiaminotetraacético', 'R')).toBe('ACIDO');
    expect(codeFromName('Dicromatodepotasioextralargo', 'R')).toBe('DICROMATODEPOTASIOEX');
  });

  it('omite las palabras vacías; si todas lo son, las conserva (ADR 0016)', () => {
    expect(codeFromName('Hidróxido de sodio', 'R')).toBe('HIDROXIDO-SODIO');
    expect(codeFromName('Cloruro de sodio', 'R')).toBe('CLORURO-SODIO');
    expect(codeFromName('Sulfato de cobre (II) pentahidratado', 'R')).toBe('SULFATO-COBRE-II');
    expect(codeFromName('Ácido clorhídrico en agua', 'R')).toBe('ACIDO-CLORHIDRICO');
    expect(codeFromName('Vitamina E', 'R')).toBe('VITAMINA-E');
    expect(codeFromName('De', 'R')).toBe('DE');
    expect(codeFromName('de la', 'R')).toBe('DE-LA');
  });

  it('sin letras ni números latinos usa el respaldo', () => {
    expect(codeFromName('%% β', 'REACTIVO')).toBe('REACTIVO');
  });
});

describe('firstFreeCode', () => {
  it('añade -2, -3… si el código está ocupado, sin distinguir mayúsculas', () => {
    expect(firstFreeCode('ACETONA', [])).toBe('ACETONA');
    expect(firstFreeCode('ACETONA', ['acetona'])).toBe('ACETONA-2');
    expect(firstFreeCode('ACETONA', ['ACETONA', 'Acetona-2'])).toBe('ACETONA-3');
  });
});

describe('series de frascos', () => {
  it('numera desde el primero conservando los ceros; sin número final, desde 1', () => {
    expect(bottleCodes('LAB-7', 2)).toEqual(['LAB-7', 'LAB-8']);
    expect(bottleCodes('AC-BIO-009', 3)).toEqual(['AC-BIO-009', 'AC-BIO-010', 'AC-BIO-011']);
    expect(bottleCodes('LAB', 2)).toEqual(['LAB-1', 'LAB-2']);
    expect(bottleCodes('LAB', 1)).toEqual(['LAB']);
    expect(nextCode('AC-BIO-001')).toBe('AC-BIO-002');
    expect(nextCode('X-999')).toBe('X-1000');
  });

  it('la serie libre salta los números ocupados', () => {
    expect(freeSeries('ACE-001', 2, [])).toEqual(['ACE-001', 'ACE-002']);
    expect(freeSeries('ACE-001', 2, ['ace-002'])).toEqual(['ACE-003', 'ACE-004']);
    expect(seriesFromName('Acetona')).toBe('ACE-001');
    expect(seriesFromName('Ácido clorhídrico')).toBe('ACI-001');
  });
});
