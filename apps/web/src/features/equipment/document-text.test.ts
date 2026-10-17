import { assetDocumentKind } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { documentKindLabel, documentKindOptions, documentKinds } from './document-text';

describe('tipos de documento', () => {
  it('se ofrecen en orden: Manual, Factura, Garantía, Informe técnico y Acta de entrega', () => {
    expect(documentKindOptions.map((option) => option.label)).toEqual(['Manual', 'Factura', 'Garantía', 'Informe técnico', 'Acta de entrega']);
  });

  it('cubren todos los tipos del contrato, cada uno una vez', () => {
    expect([...documentKinds].sort()).toEqual([...assetDocumentKind.options].sort());
    expect(Object.keys(documentKindLabel).sort()).toEqual([...assetDocumentKind.options].sort());
  });
});
