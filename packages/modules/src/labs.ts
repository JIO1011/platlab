import { defineModule } from './define-module.js';

/**
 * Manifiesto de Laboratorios (ADR 0023). Espacios agrega aforo, horario semanal y cierres a las áreas del
 * Núcleo, que se crean en «Áreas» (ADR 0024); los Formatos son las solicitudes del espacio de trabajo, cada
 * uno con revisiones inmutables. El Administrador los configura; el Operador y el Docente consultan. Etapa
 * `development` hasta su G0.
 */
export const labsModule = defineModule({
  code: 'labs',
  name: 'Laboratorios',
  requires: ['core'],
  integrates: [],
  permissions: ['labs.space.read', 'labs.space.manage', 'labs.form.manage'],
  roleGrants: {
    admin: ['labs.space.read', 'labs.space.manage', 'labs.form.manage'],
    operator: ['labs.space.read'],
    teacher: ['labs.space.read'],
  },
  nav: [
    {
      path: 'laboratorios',
      label: 'Laboratorios',
      // Hasta el Cronograma (L-01c), solo quien configura tiene secciones: el Operador y el Docente no
      // ven un módulo vacío. Su lectura ya sirve a la API (el Docente llena los formatos activos en L-01b).
      permission: 'labs.space.manage',
      sections: [
        { path: 'espacios', label: 'Espacios', permission: 'labs.space.manage' },
        { path: 'formatos', label: 'Formatos', permission: 'labs.form.manage' },
      ],
    },
  ],
  homeCard: { permission: 'labs.space.manage' },
  stage: 'development',
});
