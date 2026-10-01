import { defineModule } from './define-module.js';

/**
 * Manifiesto inicial de Reactivos. Los permisos definitivos se completan en R-00;
 * el módulo permanece en `development` hasta superar su G0 (04 §2).
 */
export const reagentsModule = defineModule({
  code: 'reagents',
  name: 'Reactivos',
  requires: ['core'],
  integrates: ['practices'],
  permissions: ['reagents.catalog.read'],
  roleGrants: {
    admin: ['reagents.catalog.read'],
    operator: ['reagents.catalog.read'],
  },
  nav: [{ path: 'reactivos', label: 'Reactivos', permission: 'reagents.catalog.read' }],
  homeCard: { permission: 'reagents.catalog.read' },
  stage: 'development',
});
