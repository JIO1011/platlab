import { useOutletContext } from 'react-router';
import type { ModuleContext } from '../../app/module-app';

/** Lo que las secciones de la app de Equipos comparten: el espacio, la persona, la ruta base y lo que el rol puede hacer. */
export interface EquipmentContext extends ModuleContext {
  /** `/e/:espacio/equipos`, sin barra final. */
  base: string;
  /** Administra el catálogo (`equipment.catalog.manage`): registrar y editar equipos. */
  canManage: boolean;
  /** Imprime y exporta el Informe (`equipment.report.read`), aun en modo consulta. */
  canExport: boolean;
}

export const useEquipment = () => useOutletContext<EquipmentContext>();
