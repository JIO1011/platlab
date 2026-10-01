import { defineModule } from './define-module.js';

/**
 * Manifiesto de Reactivos. Los permisos siguen la matriz de 01 §5: el Operador registra ingresos
 * y salidas; el catálogo y los ajustes son del Administrador. El módulo permanece en `development`
 * hasta superar su G0 (04 §2).
 */
export const reagentsModule = defineModule({
  code: 'reagents',
  name: 'Reactivos',
  requires: ['core'],
  integrates: ['practices'],
  permissions: [
    'reagents.catalog.read',
    'reagents.catalog.manage',
    'reagents.receipt.create',
    'reagents.issue.create',
    'reagents.adjustment.create',
  ],
  roleGrants: {
    admin: [
      'reagents.catalog.read',
      'reagents.catalog.manage',
      'reagents.receipt.create',
      'reagents.issue.create',
      'reagents.adjustment.create',
    ],
    operator: ['reagents.catalog.read', 'reagents.receipt.create', 'reagents.issue.create'],
  },
  nav: [{ path: 'reactivos', label: 'Reactivos', permission: 'reagents.catalog.read' }],
  homeCard: { permission: 'reagents.catalog.read' },
  stage: 'development',
});
