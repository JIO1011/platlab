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
  ],
  roleGrants: {
    admin: [
      'maintenance.work.read',
      'maintenance.work.record',
      'maintenance.plan.manage',
      'maintenance.record.void',
      'maintenance.replacement.review',
    ],
    operator: ['maintenance.work.read', 'maintenance.work.record'],
  },
  nav: [
    {
      path: 'mantenimiento',
      label: 'Mantenimiento',
      permission: 'maintenance.work.read',
      sections: [
        // Por hacer es la portada (simplificación del 17-10-2026, ADR 0020).
        { path: '', label: 'Por hacer', permission: 'maintenance.work.read' },
        { path: 'historial', label: 'Historial', permission: 'maintenance.work.read' },
        // Para quien mide, sin mezclarlo con Por hacer (M-01c).
        { path: 'indicadores', label: 'Indicadores', permission: 'maintenance.work.read' },
        { path: 'planes', label: 'Planes', permission: 'maintenance.work.read' },
      ],
    },
  ],
  homeCard: { permission: 'maintenance.work.read' },
  stage: 'development',
});
