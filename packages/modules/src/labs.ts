import { defineModule } from './define-module.js';

/**
 * Manifiesto de Laboratorios (ADR 0023). Aforo, horario semanal y cierres de las áreas del Núcleo se
 * editan en «Áreas» (ADR 0024) por un punto de extensión, sin sección propia. El Administrador configura
 * los Formatos; el Docente y el tesista los llenan como Solicitudes; el Operador consulta las recibidas y el
 * Administrador las resuelve. Etapa `development` hasta su G0.
 */
export const labsModule = defineModule({
  code: 'labs',
  name: 'Laboratorios',
  requires: ['core'],
  integrates: [],
  permissions: ['labs.read', 'labs.space.manage', 'labs.form.manage', 'labs.request.create', 'labs.request.view', 'labs.request.review', 'labs.schedule.manage', 'labs.schedule.lead'],
  roleGrants: {
    admin: ['labs.read', 'labs.space.manage', 'labs.form.manage', 'labs.request.view', 'labs.request.review', 'labs.schedule.manage', 'labs.schedule.lead'],
    operator: ['labs.read', 'labs.request.view', 'labs.schedule.lead'],
    teacher: ['labs.read', 'labs.request.create'],
    // El tesista pide con su propio formato (ADR 0023, «Reglas de L-01b»).
    student: ['labs.read', 'labs.request.create'],
  },
  nav: [
    {
      path: 'laboratorios',
      label: 'Laboratorios',
      permission: 'labs.read',
      // Quien pide sigue las suyas; el Operador y el Administrador consultan las recibidas (L-01b).
      sections: [
        { path: 'cronograma', label: 'Cronograma', permission: 'labs.read' },
        { path: 'solicitudes', label: 'Mis solicitudes', permission: 'labs.request.create' },
        { path: 'recibidas', label: 'Recibidas', permission: 'labs.request.view' },
        { path: 'formatos', label: 'Formatos', permission: 'labs.form.manage' },
      ],
    },
  ],
  homeCard: { permission: 'labs.space.manage' },
  stage: 'development',
});
