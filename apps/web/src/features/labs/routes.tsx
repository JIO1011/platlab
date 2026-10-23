import type { ModuleRoutes } from '../../app/web-module';

/** Un solo fragmento diferido para todo el módulo (02 §8): se descarga al abrir su primera ruta. */
const pages = () => import('./pages');

/**
 * Rutas de la app de Laboratorios (ADR 0023). Sus secciones coinciden con las del manifiesto, que el servidor filtra
 * por permiso en /me. Hasta el Cronograma (L-01c) no hay Resumen: la raíz lleva a la primera sección del miembro.
 */
export const labsRoutes: ModuleRoutes = {
  top: [],
  workspace: [
    {
      path: 'laboratorios',
      lazy: async () => ({ Component: (await pages()).LabsLayout }),
      children: [
        { index: true, lazy: async () => ({ Component: (await pages()).LabsHome }) },
        { path: 'solicitudes', lazy: async () => ({ Component: (await pages()).LabsRequestsPage }) },
        { path: 'solicitudes/:requestId', lazy: async () => ({ Component: (await pages()).LabsRequestPage }) },
        { path: 'recibidas', lazy: async () => ({ Component: (await pages()).LabsInboxPage }) },
        { path: 'recibidas/:requestId', lazy: async () => ({ Component: (await pages()).LabsInboxRequestPage }) },
        { path: 'formatos', lazy: async () => ({ Component: (await pages()).LabsFormsPage }) },
        { path: 'formatos/:formId', lazy: async () => ({ Component: (await pages()).LabsFormPage }) },
      ],
    },
  ],
};
