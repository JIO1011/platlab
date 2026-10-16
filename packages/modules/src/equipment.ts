import { defineModule } from './define-module.js';

/**
 * Manifiesto de Equipos (ADR 0019). Los permisos siguen la matriz de 01 §5: el catálogo, la ficha y
 * las bajas son del Administrador; la condición, los traslados y atender fallas, también del
 * Operador; todos reportan fallas. Etapa `development` hasta su G0.
 */
export const equipmentModule = defineModule({
  code: 'equipment',
  name: 'Equipos',
  requires: ['core'],
  integrates: ['practices'],
  permissions: [
    'equipment.catalog.read',
    'equipment.catalog.manage',
    'equipment.condition.change',
    'equipment.transfer.create',
    'equipment.fault.report',
    'equipment.fault.manage',
  ],
  roleGrants: {
    admin: [
      'equipment.catalog.read',
      'equipment.catalog.manage',
      'equipment.condition.change',
      'equipment.transfer.create',
      'equipment.fault.report',
      'equipment.fault.manage',
    ],
    operator: [
      'equipment.catalog.read',
      'equipment.condition.change',
      'equipment.transfer.create',
      'equipment.fault.report',
      'equipment.fault.manage',
    ],
    // Docente y Estudiante solo reportan fallas y ven las suyas (01 §5).
    teacher: ['equipment.fault.report'],
    student: ['equipment.fault.report'],
  },
  // La app la abre todo el que reporta; Resumen e Inventario, quien consulta el catálogo.
  nav: [
    {
      path: 'equipos',
      label: 'Equipos',
      permission: 'equipment.fault.report',
      sections: [
        { path: '', label: 'Resumen', permission: 'equipment.catalog.read' },
        { path: 'inventario', label: 'Inventario', permission: 'equipment.catalog.read' },
        { path: 'reportes', label: 'Reportes', permission: 'equipment.fault.report' },
      ],
    },
  ],
  homeCard: { permission: 'equipment.fault.report' },
  stage: 'development',
});
