import type { WorkspaceMeResponse } from '@platlab/contracts';
import { useOutletContext } from 'react-router';

/** Lo que las secciones de la app de Equipos comparten: el espacio, la persona, la ruta base y lo que el rol puede hacer. */
export interface EquipmentContext {
  workspaceId: string;
  me: WorkspaceMeResponse;
  /** `/e/:espacio/equipos`, sin barra final. */
  base: string;
  /** Administra el catálogo (`equipment.catalog.manage`): registrar y editar equipos. */
  canManage: boolean;
  /** Imprime y exporta el Informe (`equipment.report.read`), aun en modo consulta. */
  canExport: boolean;
  /** Puede registrar cambios; sin esto, Equipos está en modo consulta. */
  canOperate: boolean;
  freshness: { refreshing: boolean; refresh: () => void };
}

export const useEquipment = () => useOutletContext<EquipmentContext>();
