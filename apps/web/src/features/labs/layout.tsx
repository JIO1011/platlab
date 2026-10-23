import { Navigate } from 'react-router';
import { moduleApps, useShell } from '../../app/app-shell';
import { ModuleOutlet, useModuleApp } from '../../app/module-app';
import type { LabsContext } from './context';
import { useLabsKey } from './queries';

/**
 * La app de Laboratorios (ADR 0023): el contenedor común de sus secciones y lo que comparten (espacio, permisos y
 * «Actualizar»). Cada rol ve las secciones que el servidor le da en /me.
 */
export function LabsLayout() {
  const { workspaceId, me } = useShell();
  const app = useModuleApp(
    'labs',
    useLabsKey(workspaceId),
    'Laboratorios está en modo consulta: puedes consultar, pero no registrar cambios.',
  );
  return (
    <ModuleOutlet
      context={
        {
          ...app,
          canManageSpaces: app.canOperate && me.permissions.includes('labs.space.manage'),
          canManageForm: app.canOperate && me.permissions.includes('labs.form.manage'),
          canRequest: app.canOperate && me.permissions.includes('labs.request.create'),
          canReview: app.canOperate && me.permissions.includes('labs.request.review'),
          canSchedule: app.canOperate && me.permissions.includes('labs.schedule.manage'),
        } satisfies LabsContext
      }
    />
  );
}

/** La raíz de Laboratorios, que no tiene Resumen: lleva a la primera sección que el miembro tiene, el Cronograma. */
export function LabsHome() {
  const { workspaceId, me } = useShell();
  const app = moduleApps(me).find((entry) => entry.code === 'labs');
  const first = app?.sections[0];
  if (!app || !first) return null;
  return <Navigate to={`/e/${workspaceId}/${app.path}/${first.path}`} replace />;
}
