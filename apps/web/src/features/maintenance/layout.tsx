import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Outlet } from 'react-router';
import { useShell } from '../../app/app-shell';
import type { MaintenanceContext } from './context';
import { useMaintenanceKey } from './queries';
import { maintenancePath } from './work-text';

/**
 * La app de Mantenimiento (ADR 0020): el contenedor común de sus secciones y lo que comparten (espacio,
 * permisos y «Actualizar»). Docente y Estudiante no entran: el servidor no les da sus secciones.
 */
export function MaintenanceLayout() {
  const { workspaceId, me } = useShell();
  const queryClient = useQueryClient();
  const maintenanceKey = useMaintenanceKey(workspaceId);
  const module = me.modules.find((entry) => entry.code === 'maintenance');
  const canOperate = module?.access.includes('new_operation') ?? false;
  const refreshing = useIsFetching({ queryKey: maintenanceKey }) > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <Outlet
        context={
          {
            workspaceId,
            me,
            base: maintenancePath(me.modules, workspaceId),
            canOperate,
            canRecord: canOperate && me.permissions.includes('maintenance.work.record'),
            canManagePlans: canOperate && me.permissions.includes('maintenance.plan.manage'),
            canReviewReplacement: canOperate && me.permissions.includes('maintenance.replacement.review'),
            // Exportar es una consulta: sigue disponible en modo consulta (ADR 0009).
            canExport: me.permissions.includes('maintenance.report.export'),
            // Todo lo de Mantenimiento: las consultas activas se vuelven a pedir y las demás quedan viejas.
            freshness: { refreshing, refresh: () => void queryClient.invalidateQueries({ queryKey: maintenanceKey }) },
          } satisfies MaintenanceContext
        }
      />
    </div>
  );
}
