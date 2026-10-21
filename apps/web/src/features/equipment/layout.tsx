import { Navigate, useLocation } from 'react-router';
import { moduleApps, useShell } from '../../app/app-shell';
import { ModuleOutlet, useModuleApp } from '../../app/module-app';
import type { EquipmentContext } from './context';
import { useEquipmentKey } from './queries';

/**
 * La app de Equipos (ADR 0011, 0019): el contenedor común de sus secciones y lo que comparten (espacio,
 * permisos y «Actualizar»). Cada sección dibuja su cabecera con su título y su «Actualizado hace…».
 */
export function EquipmentLayout() {
  const { workspaceId, me } = useShell();
  const app = useModuleApp(
    'equipment',
    useEquipmentKey(workspaceId),
    'Equipos está en modo consulta: puedes ver el inventario, pero no registrar cambios.',
  );
  const nav = moduleApps(me).find((entry) => entry.code === 'equipment');
  const { pathname } = useLocation();

  // Quien no tiene el Resumen (el Docente solo reporta) entra por «Incidentes».
  const base = `/e/${workspaceId}/${nav?.path ?? 'equipos'}`;
  if (nav && !nav.sections.some((entry) => entry.path === '') && pathname.replace(/\/+$/, '') === base) {
    return <Navigate to={`${base}/incidentes`} replace />;
  }

  return (
    <ModuleOutlet
      context={
        {
          ...app,
          base,
          canManage: app.canOperate && me.permissions.includes('equipment.catalog.manage'),
          // Exportar es consulta: vale también en modo consulta.
          canExport: me.permissions.includes('equipment.report.read'),
        } satisfies EquipmentContext
      }
    />
  );
}
