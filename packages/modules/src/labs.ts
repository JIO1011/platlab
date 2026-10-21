import { defineModule } from './define-module.js';

/**
 * Manifiesto de Laboratorios (ADR 0023). Aforo, horario semanal y cierres de las áreas del Núcleo se
 * editan en «Áreas» (ADR 0024) por un punto de extensión, sin sección propia; los Formatos son las
 * solicitudes del espacio de trabajo, cada uno con revisiones inmutables. El Administrador los configura; el Operador y el Docente consultan. Etapa
 * `development` hasta su G0.
 */
export const labsModule = defineModule({
  code: 'labs',
  name: 'Laboratorios',
  requires: ['core'],
  integrates: [],
  permissions: ['labs.read', 'labs.space.manage', 'labs.form.manage', 'labs.request.create', 'labs.request.view', 'labs.request.review'],
  roleGrants: {
    admin: ['labs.read', 'labs.space.manage', 'labs.form.manage', 'labs.request.create', 'labs.request.view', 'labs.request.review'],
    operator: ['labs.read', 'labs.request.view'],
    teacher: ['labs.read', 'labs.request.create'],
    // El tesista pide con su propio formato (ADR 0023, «Reglas de L-01b»).
    student: ['labs.read', 'labs.request.create'],
  },
  nav: [
    {
      path: 'laboratorios',
      label: 'Laboratorios',
      // Hasta el Cronograma (L-01c), solo quien configura tiene secciones: el Operador y el Docente no
      // ven un módulo vacío. Su lectura ya sirve a la API (el Docente llena los formatos activos en L-01b).
      permission: 'labs.space.manage',
      sections: [
        { path: 'formatos', label: 'Formatos', permission: 'labs.form.manage' },
      ],
    },
  ],
  homeCard: { permission: 'labs.space.manage' },
  stage: 'development',
});
