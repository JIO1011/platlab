import { describe, expect, it } from 'vitest';
import { newProduct, receiptRequest, updateProductRequest } from './reagents.js';

const base = { name: 'Acetona', physicalState: 'liquid', baseUnit: 'mL' };

describe('ficha del reactivo (ADR 0015)', () => {
  it('valida el dígito de control del CAS', () => {
    expect(newProduct.safeParse({ ...base, casNumber: '67-64-1' }).success).toBe(true);
    expect(newProduct.safeParse({ ...base, casNumber: '67-64-2' }).success).toBe(false);
    expect(newProduct.safeParse({ ...base, casNumber: '7647-01-0' }).success).toBe(true);
  });

  it('el CAS es obligatorio salvo en mezclas; el enlace solo con ficha digital', () => {
    expect(newProduct.safeParse(base).success).toBe(false);
    expect(newProduct.safeParse({ ...base, physicalState: 'mixture' }).success).toBe(true);
    expect(newProduct.safeParse({ ...base, casNumber: '67-64-1', sdsKind: 'physical', sdsUrl: 'https://x.org/a.pdf' }).success).toBe(false);
    expect(newProduct.safeParse({ ...base, casNumber: '67-64-1', sdsKind: 'digital', sdsUrl: 'https://x.org/a.pdf' }).success).toBe(true);
  });

  it('pictogramas oficiales y sin repetir; unidad g, kg, mL o L', () => {
    expect(newProduct.safeParse({ ...base, casNumber: '67-64-1', hazards: ['GHS02', 'GHS02'] }).success).toBe(false);
    expect(newProduct.safeParse({ ...base, casNumber: '67-64-1', hazards: ['GHS10'] }).success).toBe(false);
    expect(newProduct.safeParse({ ...base, casNumber: '67-64-1', baseUnit: 'u' }).success).toBe(false);
  });

  it('la edición es parcial y estricta, con al menos un campo', () => {
    expect(updateProductRequest.safeParse({}).success).toBe(false);
    expect(updateProductRequest.safeParse({ controlled: true }).success).toBe(true);
    expect(updateProductRequest.safeParse({ code: 'X' }).success).toBe(false);
  });
});

describe('ingreso en un paso (ADR 0015)', () => {
  const receipt = {
    productId: 'da600000-0000-4000-8000-000000000001',
    quantity: '1000',
    unit: 'g',
    codes: ['NAC-001'],
    locationId: 'da300000-0000-4000-8000-000000000002',
  };

  it('exige exactamente un reactivo: del catálogo o nuevo', () => {
    expect(receiptRequest.safeParse(receipt).success).toBe(true);
    expect(receiptRequest.safeParse({ ...receipt, productId: undefined }).success).toBe(false);
    expect(receiptRequest.safeParse({ ...receipt, newProduct: { ...base, casNumber: '67-64-1' } }).success).toBe(false);
  });

  it('los códigos no se repiten, sin distinguir mayúsculas', () => {
    expect(receiptRequest.safeParse({ ...receipt, codes: ['A-1', 'a-1'] }).success).toBe(false);
    expect(receiptRequest.safeParse({ ...receipt, codes: [] }).success).toBe(false);
  });
});
