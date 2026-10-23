import { useShell } from '../../app/app-shell';
import { ModuleOutlet, useModuleApp } from '../../app/module-app';
import type { LabsContext } from './context';
import { useLabsKey } from './queries';

/**
 * La app de Laboratorios (ADR 0023): el contenedor común de sus secciones y lo que comparten (espacio, permisos y
 * «Actualizar»). El Operador y el Docente no entran hasta que haya Cronograma: el servidor no les da sus secciones.
 */
export function LabsLayout() {
  const { workspaceId, me } = useShell();
  const app = useModuleApp(
    'labs',
    useLabsKey(workspaceId),
    'Laboratorios está en modo consulta: puedes ver los formatos, pero no registrar cambios.',
  );
  return (
    <ModuleOutlet
      context={
        {
          ...app,
          canManageSpaces: app.canOperate && me.permissions.includes('labs.space.manage'),
          canManageForm: app.canOperate && me.permissions.includes('labs.form.manage'),
        } satisfies LabsContext
      }
    />
  );
}
