import type { Position } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { formatGrams, gramsPerUnit, grossFor, hasTare, scaleBalance, tareOf, weightFigures } from './weight';

const bottle = (unit: string, balance: string, tare: string | null, density: string | null): Position => ({
  id: '00000000-0000-4000-8000-000000000001',
  product: { id: '00000000-0000-4000-8000-000000000002', code: 'HCL-37', name: 'Ácido clorhídrico 37 %', controlled: true },
  lot: { id: '00000000-0000-4000-8000-000000000003', code: 'L-001', expiresOn: null, brand: null, area: null },
  container: {
    id: '00000000-0000-4000-8000-000000000004',
    code: 'HCL-001',
    initialQuantity: '2500',
    receivedAt: '2026-10-01T10:00:00Z',
    tare,
    density,
  },
  disposition: 'usable',
  location: { id: '00000000-0000-4000-8000-000000000005', code: 'ALM', name: 'Almacén' },
  balance,
  reserved: '0',
  unit,
});

describe('gramos por unidad', () => {
  it('es el mismo factor del servidor: g ×1, kg ×1000, mL ×densidad y L ×1000×densidad', () => {
    expect(gramsPerUnit('g', null)).toBe('1');
    expect(gramsPerUnit('kg', '1.19')).toBe('1000');
    expect(gramsPerUnit('mL', '1.19')).toBe('1.19');
    expect(gramsPerUnit('L', '1.19')).toBe('1190.000000000');
  });

  it('sin densidad un volumen no se pesa, y otras unidades nunca', () => {
    expect(gramsPerUnit('mL', null)).toBeNull();
    expect(gramsPerUnit('u', '1')).toBeNull();
  });
});

describe('tara', () => {
  it('es el peso bruto menos el contenido pasado a gramos', () => {
    expect(tareOf('640', '500', 'g', null)).toBe('140');
    expect(tareOf('1140', '1', 'kg', null)).toBe('140');
    expect(tareOf('534.5', '500', 'mL', '0.789')).toBe('140');
    expect(tareOf('1500', '1', 'L', '1.19')).toBe('310');
    expect(tareOf('640', '500', 'mL', null)).toBeNull();
  });

  it('con un peso menor que el contenido queda negativa (el servidor la rechaza)', () => {
    expect(tareOf('300', '500', 'g', null)).toBe('-200');
  });
});

describe('frasco con tara', () => {
  const hcl = bottle('mL', '45.69', '420', '1.19');

  it('muestra tara, peso neto y bruto esperado', () => {
    expect(weightFigures(hcl)).toEqual({ tare: '420', net: '54.371100000', expectedGross: '474.3711' });
    expect(formatGrams('474.3711')).toBe('474,4 g');
  });

  it('anticipa lo que marcará la balanza tras una salida', () => {
    expect(grossFor(hcl, '40.69')).toBe('468.4211');
  });

  it('pasa del peso en balanza al saldo, a centésimas, y a su diferencia', () => {
    expect(scaleBalance(hcl, '471.9')).toEqual({ balance: '43.61', difference: '-2.08' });
    expect(scaleBalance(hcl, '400')).toEqual({ belowTare: '420' });
    expect(scaleBalance(hcl, 'x')).toBeNull();
  });

  it('sin tara no hay control por peso', () => {
    const plain = bottle('g', '500', null, null);
    expect(hasTare(plain)).toBe(false);
    expect(weightFigures(plain)).toBeNull();
    expect(scaleBalance(plain, '640')).toBeNull();
    expect(grossFor(plain, '100')).toBeNull();
  });
});
