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
    'materials.report.export',
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
      'materials.report.export',
    ],
    operator: [
      'materials.catalog.read',
      'materials.receipt.create',
      'materials.issue.create',
      'materials.loan.create',
      'materials.loan.return',
    ],
  },
  // El Resumen es la portada, Préstamos lo ven quienes prestan y Movimientos, quienes consultan. Los Excel del libro y de
  // las existencias son del Administrador (01 §5). El QR llega con MA-01e.
  nav: [
    {
      path: 'materiales',
      label: 'Materiales',
      permission: 'materials.catalog.read',
      sections: [
        { path: '', label: 'Resumen', permission: 'materials.catalog.read' },
        { path: 'inventario', label: 'Inventario', permission: 'materials.catalog.read' },
        { path: 'prestamos', label: 'Préstamos', permission: 'materials.loan.create' },
        { path: 'movimientos', label: 'Movimientos', permission: 'materials.catalog.read' },
      ],
    },
  ],
  homeCard: { permission: 'materials.catalog.read' },
  homeAgenda: { permission: 'materials.loan.return' },
  homeTasks: { permission: 'materials.catalog.read' },
  stage: 'development',
});
