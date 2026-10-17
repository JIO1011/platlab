import type { AssetDocumentKind } from '@platlab/contracts';

/** Los tipos de documento en el orden en que se ofrecen al agregar (ADR 0019, E-01e). */
export const documentKinds: AssetDocumentKind[] = ['manual', 'invoice', 'warranty', 'service_report', 'delivery_record'];

/** Cómo se llama cada tipo de documento en pantalla. */
export const documentKindLabel: Record<AssetDocumentKind, string> = {
  manual: 'Manual',
  invoice: 'Factura',
  warranty: 'Garantía',
  service_report: 'Informe técnico',
  delivery_record: 'Acta de entrega',
};

/** Las píldoras de «Tipo» de la hoja «Agregar documento». */
export const documentKindOptions = documentKinds.map((value) => ({ value, label: documentKindLabel[value] }));
