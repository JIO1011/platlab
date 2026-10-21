import { useOutletContext } from 'react-router';
import type { ModuleContext } from '../../app/module-app';

/** Lo que las secciones de la app de Mantenimiento comparten: el espacio, la persona, la ruta base y lo que el rol puede hacer. */
export interface MaintenanceContext extends ModuleContext {
  /** `/e/:espacio/mantenimiento`, sin barra final. */
  base: string;
  /** «Registrar mantenimiento» (`maintenance.work.record`). */
  canRecord: boolean;
  /** Crea y edita planes y proveedores (`maintenance.plan.manage`, Administrador). */
  canManagePlans: boolean;
  /** Descarta «Evaluar reemplazo» (`maintenance.replacement.review`, Administrador, M-01c). */
  canReviewReplacement: boolean;
  /** Descarga el Excel del Historial (`maintenance.report.export`, Administrador, M-01d). */
  canExport: boolean;
}

export const useMaintenance = () => useOutletContext<MaintenanceContext>();
