import { defineModule } from './define-module.js';

/**
 * Manifiesto de Equipos (ADR 0019). Los permisos siguen la matriz de 01 §5: el catálogo, la ficha, las
 * bajas y exportar el Informe son del Administrador; la condición, los traslados y atender incidentes,
 * también del Operador; todos reportan incidentes. Etapa `development` hasta su G0.
 */
export const equipmentModule = defineModule({
  code: 'equipment',
  name: 'Equipos',
  requires: ['core'],
  integrates: ['practices', 'maintenance'],
  permissions: [
    'equipment.catalog.read',
    'equipment.catalog.manage',
    'equipment.condition.change',
    'equipment.transfer.create',
    'equipment.fault.report',
    'equipment.fault.manage',
    'equipment.report.read',
  ],
  roleGrants: {
    admin: [
      'equipment.catalog.read',
      'equipment.catalog.manage',
      'equipment.condition.change',
      'equipment.transfer.create',
      'equipment.fault.report',
      'equipment.fault.manage',
      'equipment.report.read',
    ],
    operator: [
      'equipment.catalog.read',
      'equipment.condition.change',
      'equipment.transfer.create',
      'equipment.fault.report',
      'equipment.fault.manage',
    ],
    // Docente y Estudiante solo reportan incidentes y ven los suyos (01 §5).
    teacher: ['equipment.fault.report'],
    student: ['equipment.fault.report'],
  },
  // La app la abre todo el que reporta; Resumen, Inventario (por áreas) e Informe, quien consulta el catálogo.
  nav: [
    {
      path: 'equipos',
      label: 'Equipos',
      permission: 'equipment.fault.report',
      sections: [
        { path: '', label: 'Resumen', permission: 'equipment.catalog.read' },
        { path: 'inventario', label: 'Inventario', permission: 'equipment.catalog.read' },
        { path: 'informe', label: 'Informe', permission: 'equipment.catalog.read' },
        { path: 'incidentes', label: 'Incidentes', permission: 'equipment.fault.report' },
      ],
    },
  ],
  homeCard: { permission: 'equipment.fault.report' },
  stage: 'development',
});
