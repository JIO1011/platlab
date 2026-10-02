import { defineModule } from './define-module.js';

/**
 * Manifiesto de Reactivos. Los permisos siguen la matriz de 01 §5: el Operador registra ingresos
 * y salidas; el catálogo y los ajustes son del Administrador. Etapa `pilot` desde V-00, tras su G0
 * (04 §2); pasará a `general` con su G2.
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
  // Las demás secciones (Informes, Fiscalizados, Documentos, Configuración) llegan con su entrega.
  nav: [
    {
      path: 'reactivos',
      label: 'Reactivos',
      permission: 'reagents.catalog.read',
      sections: [
        { path: '', label: 'Resumen', permission: 'reagents.catalog.read' },
        { path: 'inventario', label: 'Inventario', permission: 'reagents.catalog.read' },
        { path: 'movimientos', label: 'Movimientos', permission: 'reagents.catalog.read' },
      ],
    },
  ],
  homeCard: { permission: 'reagents.catalog.read' },
  stage: 'pilot',
});
