import { defineModule } from './define-module.js';

/**
 * Manifiesto de Materiales (ADR 0025). Los permisos siguen la matriz de 01 §5: el Operador registra
 * ingresos y salidas; el catálogo y los ajustes son del Administrador. Los de préstamo (ADR 0025) son de los dos.
 * Etapa `development` hasta su G0.
 */
export const materialsModule = defineModule({
  code: 'materials',
  name: 'Materiales',
  requires: ['core'],
  integrates: ['labs', 'equipment'],
  permissions: [
    'materials.catalog.read',
    'materials.catalog.manage',
    'materials.receipt.create',
    'materials.issue.create',
    'materials.adjustment.create',
    'materials.loan.create',
    'materials.loan.return',
  ],
  roleGrants: {
    admin: [
      'materials.catalog.read',
      'materials.catalog.manage',
      'materials.receipt.create',
      'materials.issue.create',
      'materials.adjustment.create',
      'materials.loan.create',
      'materials.loan.return',
    ],
    operator: [
      'materials.catalog.read',
      'materials.receipt.create',
      'materials.issue.create',
      'materials.loan.create',
      'materials.loan.return',
    ],
  },
  // Las secciones (Resumen, Inventario, Préstamos e Informe) llegan con las pantallas (MA-01c y MA-01d).
  nav: [
    {
      path: 'materiales',
      label: 'Materiales',
      permission: 'materials.catalog.read',
      sections: [{ path: '', label: 'Inventario', permission: 'materials.catalog.read' }],
    },
  ],
  homeCard: { permission: 'materials.catalog.read' },
  stage: 'development',
});
