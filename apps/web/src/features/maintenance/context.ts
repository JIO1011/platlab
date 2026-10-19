import type { WorkspaceMeResponse } from '@platlab/contracts';
import { useOutletContext } from 'react-router';

/** Lo que las secciones de la app de Mantenimiento comparten: el espacio, la persona, la ruta base y lo que el rol puede hacer. */
export interface MaintenanceContext {
  workspaceId: string;
  me: WorkspaceMeResponse;
  /** `/e/:espacio/mantenimiento`, sin barra final. */
  base: string;
  /** Puede registrar cambios; sin esto, Mantenimiento está en modo consulta. */
  canOperate: boolean;
  /** «Registrar mantenimiento» (`maintenance.work.record`). */
  canRecord: boolean;
  /** Crea y edita planes y proveedores (`maintenance.plan.manage`, Administrador). */
  canManagePlans: boolean;
  /** Descarta «Evaluar reemplazo» (`maintenance.replacement.review`, Administrador, M-01c). */
  canReviewReplacement: boolean;
  /** Descarga el Excel del Historial (`maintenance.report.export`, Administrador, M-01d). */
  canExport: boolean;
  freshness: { refreshing: boolean; refresh: () => void };
}

export const useMaintenance = () => useOutletContext<MaintenanceContext>();
