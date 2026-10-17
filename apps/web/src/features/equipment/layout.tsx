import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router';
import { moduleApps, useShell } from '../../app/app-shell';
import type { EquipmentContext } from './context';
import { useEquipmentKey } from './queries';

/**
 * La app de Equipos (ADR 0011, 0019): el contenedor común de sus secciones y lo que comparten (espacio,
 * permisos y «Actualizar»). Cada sección dibuja su cabecera con su título y su «Actualizado hace…».
 */
export function EquipmentLayout() {
  const { workspaceId, me } = useShell();
  const queryClient = useQueryClient();
  const equipmentKey = useEquipmentKey(workspaceId);
  const module = me.modules.find((entry) => entry.code === 'equipment');
  const canOperate = module?.access.includes('new_operation') ?? false;
  const app = moduleApps(me).find((entry) => entry.code === 'equipment');
  const refreshing = useIsFetching({ queryKey: equipmentKey }) > 0;
  const { pathname } = useLocation();

  // Quien no tiene el Resumen (el Docente solo reporta) entra por «Incidentes».
  const base = `/e/${workspaceId}/${app?.path ?? 'equipos'}`;
  if (app && !app.sections.some((section) => section.path === '') && pathname.replace(/\/+$/, '') === base) {
    return <Navigate to={`${base}/incidentes`} replace />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Outlet
        context={
          {
            workspaceId,
            me,
            base,
            canManage: canOperate && me.permissions.includes('equipment.catalog.manage'),
            // Exportar es consulta: vale también en modo consulta.
            canExport: me.permissions.includes('equipment.report.read'),
            canOperate,
            // Todo lo de Equipos: las consultas activas se vuelven a pedir y las demás quedan viejas.
            freshness: { refreshing, refresh: () => void queryClient.invalidateQueries({ queryKey: equipmentKey }) },
          } satisfies EquipmentContext
        }
      />
    </div>
  );
}
