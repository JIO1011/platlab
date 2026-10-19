import { defineModule } from './define-module.js';

/**
 * Manifiesto de Mantenimiento (ADR 0020). Sin inventario propio: trabaja sobre los equipos de Equipos,
 * del que depende. El Administrador crea planes y proveedores, anula o corrige registros y descarta «Evaluar
 * reemplazo»; el Operador consulta y registra. Docente y Estudiante no entran: reportan en Equipos. Etapa
 * `development` hasta su G0.
 */
export const maintenanceModule = defineModule({
  code: 'maintenance',
  name: 'Mantenimiento',
  requires: ['core', 'equipment'],
  integrates: [],
  permissions: [
    'maintenance.work.read',
    'maintenance.work.record',
    'maintenance.plan.manage',
    'maintenance.record.void',
    'maintenance.replacement.review',
    'maintenance.report.export',
  ],
  roleGrants: {
    admin: [
      'maintenance.work.read',
      'maintenance.work.record',
      'maintenance.plan.manage',
      'maintenance.record.void',
      'maintenance.replacement.review',
      'maintenance.report.export',
    ],
    operator: ['maintenance.work.read', 'maintenance.work.record'],
  },
  nav: [
    {
      path: 'mantenimiento',
      label: 'Mantenimiento',
      permission: 'maintenance.work.read',
      sections: [
        // El Resumen es la portada y reúne los indicadores, como en Equipos y Reactivos (ADR 0021).
        { path: '', label: 'Resumen', permission: 'maintenance.work.read' },
        { path: 'por-hacer', label: 'Por hacer', permission: 'maintenance.work.read' },
        { path: 'historial', label: 'Historial', permission: 'maintenance.work.read' },
        { path: 'planes', label: 'Planes', permission: 'maintenance.work.read' },
      ],
    },
  ],
  homeCard: { permission: 'maintenance.work.read' },
  stage: 'development',
});
