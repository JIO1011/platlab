import { useShell } from '../../app/app-shell';
import { ModuleOutlet, useModuleApp } from '../../app/module-app';
import type { MaintenanceContext } from './context';
import { useMaintenanceKey } from './queries';
import { maintenancePath } from './work-text';

/**
 * La app de Mantenimiento (ADR 0020): el contenedor común de sus secciones y lo que comparten (espacio,
 * permisos y «Actualizar»). Docente y Estudiante no entran: el servidor no les da sus secciones.
 */
export function MaintenanceLayout() {
  const { workspaceId, me } = useShell();
  const app = useModuleApp(
    'maintenance',
    useMaintenanceKey(workspaceId),
    'Mantenimiento está en modo consulta: puedes ver lo que hay por hacer, el historial y los planes, pero no registrar cambios.',
  );
  const { canOperate } = app;
  return (
    <ModuleOutlet
      context={
        {
          ...app,
          base: maintenancePath(me.modules, workspaceId),
          canRecord: canOperate && me.permissions.includes('maintenance.work.record'),
          canManagePlans: canOperate && me.permissions.includes('maintenance.plan.manage'),
          canReviewReplacement: canOperate && me.permissions.includes('maintenance.replacement.review'),
          // Exportar es una consulta: sigue disponible en modo consulta (ADR 0009).
          canExport: me.permissions.includes('maintenance.report.export'),
        } satisfies MaintenanceContext
      }
    />
  );
}
